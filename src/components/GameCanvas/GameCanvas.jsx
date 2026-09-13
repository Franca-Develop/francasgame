import React, { useEffect, useRef, useState } from "react";
import testChart from "../../assets/charts/test-song.json";
import "./GameCanvas.css";

const DIFFICULTY_CONFIG = {
  EASY: {
    speedMultiplier: 0.8,
    judgments: [
      { name: "SICK", window: 50, score: 350, color: "#00FFFF" },
      { name: "GOOD", window: 100, score: 200, color: "#4CAF50" },
      { name: "BAD", window: 150, score: 100, color: "#FF9800" },
      { name: "SHIT", window: 180, score: 50, color: "#F44336" },
    ],
  },
  NORMAL: {
    speedMultiplier: 1.0,
    judgments: [
      { name: "SICK", window: 45, score: 350, color: "#00FFFF" },
      { name: "GOOD", window: 90, score: 200, color: "#4CAF50" },
      { name: "BAD", window: 135, score: 100, color: "#FF9800" },
      { name: "SHIT", window: 160, score: 50, color: "#F44336" },
    ],
  },
  HARD: {
    speedMultiplier: 1.25,
    judgments: [
      { name: "SICK", window: 35, score: 350, color: "#00FFFF" },
      { name: "GOOD", window: 75, score: 200, color: "#4CAF50" },
      { name: "BAD", window: 110, score: 100, color: "#FF9800" },
      { name: "SHIT", window: 130, score: 50, color: "#F44336" },
    ],
  },
};

const NOTE_SIZE = 60;
const TARGET_Y_UPSCROLL = 100;
const TARGET_Y_DOWNSCROLL = 560;

// Pistas separadas (Esquerda: Opponent | Direita: Player)
const OPPONENT_LANE_X = [100, 170, 240, 310];
const PLAYER_LANE_X = [900, 970, 1040, 1110];

const LANE_COLORS = ["#C24B99", "#00FFFF", "#12FA05", "#F9393F"];

export default function GameCanvas({
  songData,
  difficulty,
  isDownscroll = false,
  keybinds = "ARROWS",
  bgmVolume = 1,
  audioOffset = 0,
  onExit,
  onComplete,
  onPlayerHit,
  onOpponentHit,
}) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  // Guarda callbacks em Refs para não reiniciar o useEffect no re-render
  const callbacksRef = useRef({});
  callbacksRef.current = { onExit, onComplete, onPlayerHit, onOpponentHit };

  const optionsRef = useRef({});
  optionsRef.current = { keybinds, audioOffset, bgmVolume };

  // Estados dos Controles (Player)
  const activeKeysRef = useRef({ 0: false, 1: false, 2: false, 3: false });
  const hitNotesRef = useRef(new Set());
  const activeHoldsRef = useRef(new Map());

  // Estados do Bot (Opponent)
  const opponentActiveKeysRef = useRef({
    0: false,
    1: false,
    2: false,
    3: false,
  });
  const opponentHitNotesRef = useRef(new Set());
  const opponentActiveHoldsRef = useRef(new Map());
  const opponentKeyTimersRef = useRef({ 0: 0, 1: 0, 2: 0, 3: 0 });

  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // Ref para garantir o valor atualizado nos callbacks
  const [lastRating, setLastRating] = useState(null);

  const currentTimeRef = useRef(0);
  const currentLoopRef = useRef(0);
  const hasExitedRef = useRef(false);
  const bgImageRef = useRef(null);

  const diffKey = (
    difficulty ||
    songData?.difficulty ||
    "NORMAL"
  ).toUpperCase();
  const currentDiffConfig =
    DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.NORMAL;

  const chartData = songData?.chartData || testChart;
  const notes = chartData?.song?.notes || [];

  const bpm = chartData?.song?.bpm || 120;
  const bpmMultiplier = bpm / 120;
  const baseSpeed = chartData?.song?.speed || 1.5;
  const scrollSpeed =
    baseSpeed * bpmMultiplier * currentDiffConfig.speedMultiplier * 0.5;

  const maxNoteTime =
    notes.length > 0
      ? Math.max(...notes.map((n) => n.time + (n.duration || 0)))
      : 0;
  const chartLoopDuration = maxNoteTime > 0 ? maxNoteTime + 2000 : 10000;

  useEffect(() => {
    if (songData?.bgUrl) {
      const img = new Image();
      img.src = songData.bgUrl;
      img.onload = () => {
        bgImageRef.current = img;
      };
      img.onerror = () => {
        bgImageRef.current = null;
      };
    } else {
      bgImageRef.current = null;
    }
  }, [songData]);

  useEffect(() => {
    hitNotesRef.current.clear();
    opponentHitNotesRef.current.clear();
    currentLoopRef.current = 0;
    hasExitedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
  }, [songData]);

  const getKeyLane = (key) => {
    const k = key.toLowerCase();
    const mode = optionsRef.current.keybinds?.toUpperCase() || "ARROWS";

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
    const maxWindow = 180;

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.lane !== lane || hitNotesRef.current.has(i)) continue;

      const timeDiff = note.time - now;
      if (timeDiff > maxWindow) break;
      if (timeDiff < -maxWindow) continue;

      const absDiff = Math.abs(timeDiff);
      const judgment = currentDiffConfig.judgments.find(
        (j) => absDiff <= j.window
      );

      if (judgment) {
        if (callbacksRef.current.onPlayerHit) {
          callbacksRef.current.onPlayerHit(lane);
        }

        if (note.type === "hold" && note.duration) {
          activeHoldsRef.current.set(lane, {
            index: i,
            endTime: note.time + note.duration,
          });
        } else {
          hitNotesRef.current.add(i);
        }
        scoreRef.current += judgment.score;
        setScore(scoreRef.current);
        setLastRating(judgment);
        break;
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (audioRef.current) audioRef.current.pause();
        if (callbacksRef.current.onExit) {
          callbacksRef.current.onExit(scoreRef.current);
        }
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
  }, [notes, currentDiffConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const currentAudioUrl = songData?.audioUrl || "";
    const audio = new Audio(currentAudioUrl);

    audio.volume = Math.max(0, Math.min(1, optionsRef.current.bgmVolume));
    audio.loop = false;
    audioRef.current = audio;

    let animationFrameId;
    const startTime = Date.now();

    const handleAudioEnd = () => {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        if (callbacksRef.current.onComplete) {
          callbacksRef.current.onComplete(scoreRef.current);
        } else if (callbacksRef.current.onExit) {
          callbacksRef.current.onExit(scoreRef.current);
        }
      }
    };

    audio.addEventListener("ended", handleAudioEnd);
    audio.play().catch((error) => {
      console.error("Erro ao tocar áudio:", error);
    });

    const targetY = isDownscroll ? TARGET_Y_DOWNSCROLL : TARGET_Y_UPSCROLL;
    const maxMissWindow =
      currentDiffConfig.judgments[currentDiffConfig.judgments.length - 1]
        .window;

    const render = () => {
      const isAudioPlaying =
        audioRef.current &&
        !audioRef.current.paused &&
        audioRef.current.currentTime > 0;

      const offsetMs = optionsRef.current.audioOffset || 0;
      const realTime = isAudioPlaying
        ? audioRef.current.currentTime * 1000 + offsetMs
        : Date.now() - startTime + offsetMs;

      const currentLoop = Math.floor(realTime / chartLoopDuration);
      const effectiveChartTime = realTime % chartLoopDuration;

      if (currentLoop !== currentLoopRef.current) {
        currentLoopRef.current = currentLoop;
        hitNotesRef.current.clear();
        opponentHitNotesRef.current.clear();
        activeHoldsRef.current.clear();
        opponentActiveHoldsRef.current.clear();
      }

      currentTimeRef.current = effectiveChartTime;

      // 1. Renderização do Fundo Global
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Desenhar Strums (Cinza com Borda Colorida)
      const drawStrums = (laneOffsets, activeMap) => {
        laneOffsets.forEach((x, lane) => {
          const isPressed = activeMap[lane];

          ctx.save();
          ctx.strokeStyle = LANE_COLORS[lane];
          ctx.lineWidth = 4;
          ctx.fillStyle = isPressed
            ? LANE_COLORS[lane]
            : "rgba(45, 45, 55, 0.75)";

          ctx.beginPath();
          ctx.roundRect(x, targetY, NOTE_SIZE, NOTE_SIZE, 8);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      };

      // 2. Renderização dos Strums
      drawStrums(PLAYER_LANE_X, activeKeysRef.current);
      drawStrums(OPPONENT_LANE_X, opponentActiveKeysRef.current);

      // 3. BOTPLAY (OPPONENT)
      notes.forEach((note, index) => {
        if (
          note.time <= effectiveChartTime &&
          !opponentHitNotesRef.current.has(index)
        ) {
          opponentHitNotesRef.current.add(index);
          opponentActiveKeysRef.current[note.lane] = true;

          if (callbacksRef.current.onOpponentHit) {
            callbacksRef.current.onOpponentHit(note.lane);
          }

          if (note.type === "hold" && note.duration) {
            opponentActiveHoldsRef.current.set(note.lane, {
              index,
              endTime: note.time + note.duration,
            });
          } else {
            opponentKeyTimersRef.current[note.lane] = Date.now() + 120;
          }
        }
      });

      const nowMs = Date.now();
      [0, 1, 2, 3].forEach((lane) => {
        const hold = opponentActiveHoldsRef.current.get(lane);
        if (hold) {
          if (effectiveChartTime >= hold.endTime) {
            opponentActiveHoldsRef.current.delete(lane);
            opponentActiveKeysRef.current[lane] = false;
          } else {
            opponentActiveKeysRef.current[lane] = true;
          }
        } else if (nowMs > opponentKeyTimersRef.current[lane]) {
          opponentActiveKeysRef.current[lane] = false;
        }
      });

      // 4. Validação de Hold Notes do Player
      PLAYER_LANE_X.forEach((_, lane) => {
        const activeHold = activeHoldsRef.current.get(lane);
        if (activeHold) {
          const isKeyDown = activeKeysRef.current[lane];
          if (!isKeyDown && effectiveChartTime < activeHold.endTime - 50) {
            hitNotesRef.current.add(activeHold.index);
            activeHoldsRef.current.delete(lane);
            setLastRating({ name: "MISS", color: "#F9393F" });
          } else if (effectiveChartTime >= activeHold.endTime) {
            hitNotesRef.current.add(activeHold.index);
            activeHoldsRef.current.delete(lane);
          }
        }
      });

      // 5. Renderização das Notas e Caudas
      const renderNotesForSide = (laneOffsets, hitSet, activeHoldsMap) => {
        notes.forEach((note, index) => {
          const activeHold = activeHoldsMap.get(note.lane);
          const isBeingHeld = activeHold && activeHold.index === index;

          if (hitSet.has(index) && !isBeingHeld) return;

          const timeDiff = note.time - effectiveChartTime;

          if (
            hitSet === hitNotesRef.current &&
            timeDiff < -maxMissWindow &&
            !isBeingHeld &&
            !hitSet.has(index)
          ) {
            hitSet.add(index);
            return;
          }

          const noteY = isDownscroll
            ? targetY - timeDiff * scrollSpeed
            : targetY + timeDiff * scrollSpeed;

          const x = laneOffsets[note.lane];

          if (note.type === "hold" && note.duration) {
            const holdEndTime = note.time + note.duration;
            let tailTop, tailHeight;

            if (!isDownscroll) {
              if (isBeingHeld) {
                const remainingTime = Math.max(
                  0,
                  holdEndTime - effectiveChartTime
                );
                tailTop = targetY + NOTE_SIZE / 2;
                tailHeight = remainingTime * scrollSpeed;
              } else {
                tailTop = noteY + NOTE_SIZE / 2;
                tailHeight = note.duration * scrollSpeed;
                if (noteY < targetY) {
                  const overflow = targetY - noteY;
                  tailTop = targetY + NOTE_SIZE / 2;
                  tailHeight = Math.max(0, tailHeight - overflow);
                }
              }
            } else {
              if (isBeingHeld) {
                const remainingTime = Math.max(
                  0,
                  holdEndTime - effectiveChartTime
                );
                tailHeight = remainingTime * scrollSpeed;
                tailTop = targetY + NOTE_SIZE / 2 - tailHeight;
              } else {
                const fullHeight = note.duration * scrollSpeed;
                tailTop = noteY + NOTE_SIZE / 2 - fullHeight;
                tailHeight = fullHeight;
                if (noteY > targetY) {
                  const overflow = noteY - targetY;
                  tailHeight = Math.max(0, fullHeight - overflow);
                  tailTop = targetY + NOTE_SIZE / 2 - tailHeight;
                }
              }
            }

            if (tailHeight > 0) {
              const tailWidth = 20;
              const tailX = x + (NOTE_SIZE - tailWidth) / 2;

              ctx.save();
              ctx.fillStyle = LANE_COLORS[note.lane];
              ctx.globalAlpha = 0.6;
              ctx.fillRect(tailX, tailTop, tailWidth, tailHeight);
              ctx.restore();
            }
          }

          if (
            !isBeingHeld &&
            noteY >= -NOTE_SIZE &&
            noteY <= canvas.height + NOTE_SIZE
          ) {
            ctx.save();
            ctx.fillStyle = LANE_COLORS[note.lane];
            ctx.beginPath();
            ctx.roundRect(x, noteY, NOTE_SIZE, NOTE_SIZE, 6);
            ctx.fill();
            ctx.restore();
          }
        });
      };

      renderNotesForSide(
        PLAYER_LANE_X,
        hitNotesRef.current,
        activeHoldsRef.current
      );
      renderNotesForSide(
        OPPONENT_LANE_X,
        opponentHitNotesRef.current,
        opponentActiveHoldsRef.current
      );

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
    songData?.audioUrl,
    isDownscroll,
    scrollSpeed,
    chartLoopDuration,
    notes,
    currentDiffConfig,
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