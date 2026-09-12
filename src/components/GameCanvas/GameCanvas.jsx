import React, { useEffect, useRef, useState } from "react";
import testChart from "../../assets/charts/test-song.json";
import "./GameCanvas.css";

const LANE_COLORS = ["#C24B99", "#00FFFF", "#12FA05", "#F9393F"];

// POSIÇÕES X CENTRALIZADAS (Largura total: 300px | Centro em 640px)
const LANE_X_OFFSETS = [490, 570, 650, 730];

const NOTE_SIZE = 60;
const TARGET_Y_UPSCROLL = 100;
const TARGET_Y_DOWNSCROLL = 580;

const DIFFICULTY_CONFIG = {
  EASY: {
    speedMultiplier: 0.5,
    judgments: [
      { name: "PERFECT", window: 50, score: 350, color: "#00FFFF" },
      { name: "GREAT", window: 100, score: 200, color: "#12FA05" },
      { name: "GOOD", window: 150, score: 100, color: "#F9393F" },
    ],
  },
  NORMAL: {
    speedMultiplier: 0.7,
    judgments: [
      { name: "PERFECT", window: 35, score: 350, color: "#00FFFF" },
      { name: "GREAT", window: 75, score: 200, color: "#12FA05" },
      { name: "GOOD", window: 110, score: 100, color: "#F9393F" },
    ],
  },
  HARD: {
    speedMultiplier: 1.0,
    judgments: [
      { name: "PERFECT", window: 20, score: 350, color: "#00FFFF" },
      { name: "GREAT", window: 45, score: 200, color: "#12FA05" },
      { name: "GOOD", window: 70, score: 100, color: "#F9393F" },
    ],
  },
};

export default function GameCanvas({
  songData,
  isDownscroll = false,
  keybinds = "ARROWS",
  bgmVolume = 1,
  audioOffset = 0,
  onExit,
}) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const activeKeysRef = useRef({ 0: false, 1: false, 2: false, 3: false });
  const [, setIsLoaded] = useState(false);

  const [score, setScore] = useState(0);
  const [lastRating, setLastRating] = useState(null);

  const currentTimeRef = useRef(0);
  const hitNotesRef = useRef(new Set());
  const currentLoopRef = useRef(0);
  const hasExitedRef = useRef(false);

  const diffKey = songData?.difficulty?.toUpperCase() || "NORMAL";
  const currentDiffConfig =
    DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.NORMAL;

  const chartData = songData?.chartData || testChart;
  const notes = chartData?.song?.notes || [];

  // Ajuste proporcional baseado no BPM (Base: 120 BPM)
  const bpm = chartData?.song?.bpm || 120;
  const bpmMultiplier = bpm / 120;

  const baseSpeed = chartData?.song?.speed || 1.5;
  const scrollSpeed =
    baseSpeed * bpmMultiplier * currentDiffConfig.speedMultiplier * 0.5;

  const maxNoteTime =
    notes.length > 0 ? Math.max(...notes.map((n) => n.time)) : 0;
  const chartLoopDuration = maxNoteTime > 0 ? maxNoteTime + 2000 : 10000;

  useEffect(() => {
    hitNotesRef.current.clear();
    currentLoopRef.current = 0;
    hasExitedRef.current = false;
    setScore(0);
  }, [songData]);

  const getKeyLane = (key) => {
    const k = key.toLowerCase();
    const mode = keybinds?.toUpperCase() || "ARROWS";

    if (mode === "WASD") {
      if (k === "a") return 0;
      if (k === "s") return 1;
      if (k === "w") return 2;
      if (k === "d") return 3;
    } else if (mode === "DFJK") {
      if (k === "d") return 0;
      if (k === "f") return 1;
      if (k === "j") return 2;
      if (k === "k") return 3;
    } else {
      if (k === "arrowleft" || k === "a") return 0;
      if (k === "arrowdown" || k === "s") return 1;
      if (k === "arrowup" || k === "w") return 2;
      if (k === "arrowright" || k === "d") return 3;
    }
    return -1;
  };

  const checkHit = (lane) => {
    const now = currentTimeRef.current;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.lane === lane && !hitNotesRef.current.has(i)) {
        const timeDiff = Math.abs(note.time - now);
        const judgment = currentDiffConfig.judgments.find(
          (j) => timeDiff <= j.window,
        );

        if (judgment) {
          hitNotesRef.current.add(i);
          setScore((prev) => prev + judgment.score);
          setLastRating(judgment);
          break;
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (audioRef.current) audioRef.current.pause();
        onExit();
        return;
      }

      const lane = getKeyLane(e.key);
      if (lane !== -1) {
        if (!e.repeat && !activeKeysRef.current[lane]) {
          checkHit(lane);
        }
        activeKeysRef.current[lane] = true;
      }
    };

    const handleKeyUp = (e) => {
      const lane = getKeyLane(e.key);
      if (lane !== -1) activeKeysRef.current[lane] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onExit, keybinds, notes, currentDiffConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const currentAudioUrl =
      songData && songData.audioUrl ? songData.audioUrl : "";
    const audio = new Audio(currentAudioUrl);

    audio.volume = Math.max(0, Math.min(1, bgmVolume));
    audio.loop = false;
    audioRef.current = audio;

    let animationFrameId;
    const startTime = Date.now();

    const handleAudioEnd = () => {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        onExit();
      }
    };

    audio.addEventListener("ended", handleAudioEnd);
    audio
      .play()
      .then(() => setIsLoaded(true))
      .catch((error) => {
        console.error("Erro ao carregar/tocar áudio:", audio.src, error);
        setIsLoaded(true);
      });

    const targetY = isDownscroll ? TARGET_Y_DOWNSCROLL : TARGET_Y_UPSCROLL;

    const render = () => {
      const isAudioPlaying =
        audioRef.current &&
        !audioRef.current.paused &&
        audioRef.current.currentTime > 0;

      const realTime = isAudioPlaying
        ? audioRef.current.currentTime * 1000 + audioOffset
        : Date.now() - startTime + audioOffset;

      const currentLoop = Math.floor(realTime / chartLoopDuration);
      const effectiveChartTime = realTime % chartLoopDuration;

      if (currentLoop !== currentLoopRef.current) {
        currentLoopRef.current = currentLoop;
        hitNotesRef.current.clear();
      }

      currentTimeRef.current = effectiveChartTime;

      // FUNDO LIMPO PRETO SÓLIDO
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Receptores (Strum Line)
      LANE_X_OFFSETS.forEach((x, lane) => {
        const isPressed = activeKeysRef.current[lane];
        ctx.save();
        ctx.strokeStyle = LANE_COLORS[lane];
        ctx.lineWidth = isPressed ? 6 : 3;
        ctx.fillStyle = isPressed ? LANE_COLORS[lane] : "rgba(0, 0, 0, 0.4)";

        ctx.beginPath();
        ctx.roundRect(x, targetY, NOTE_SIZE, NOTE_SIZE, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Renderização de Notas
      notes.forEach((note, index) => {
        if (hitNotesRef.current.has(index)) return;

        const timeDiff = note.time - effectiveChartTime;
        const noteY = isDownscroll
          ? targetY - timeDiff * scrollSpeed
          : targetY + timeDiff * scrollSpeed;

        if (noteY >= -NOTE_SIZE && noteY <= canvas.height + NOTE_SIZE) {
          const x = LANE_X_OFFSETS[note.lane];
          ctx.save();
          ctx.fillStyle = LANE_COLORS[note.lane];
          ctx.beginPath();
          ctx.roundRect(x, noteY, NOTE_SIZE, NOTE_SIZE, 6);
          ctx.fill();
          ctx.restore();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleAudioEnd);
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [
    songData,
    isDownscroll,
    bgmVolume,
    audioOffset,
    notes,
    scrollSpeed,
    keybinds,
    chartLoopDuration,
    onExit,
  ]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="game-canvas"
      />
      <div className="game-ui-overlay">
        <div className="song-info">
          <h2>{songData?.title || songData?.name || "Test Track"}</h2>
          <span className="difficulty-badge">{diffKey}</span> <br />
          <span className="score-display">SCORE: {score}</span>
        </div>

        {lastRating && (
          <div className="rating-popup" style={{ color: lastRating.color }}>
            {lastRating.name}
          </div>
        )}

        <p className="exit-hint">
          Controles: <strong>{keybinds}</strong> | <strong>ESC</strong> para
          sair
        </p>
      </div>
    </div>
  );
}
