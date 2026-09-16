import React, { useEffect, useRef, useState, useMemo } from "react";
import { playSfx, stopAllSfx } from "../../utils/useAudio";
import "./GameCanvas.css";

const DIFFICULTY_CONFIG = {
  EASY: {
    speedMultiplier: 0.8,
    judgments: [
      {
        name: "SICK",
        window: 50,
        score: 350,
        weight: 1.0,
        color: "#00FFFF",
        healthDelta: 4,
      },
      {
        name: "GOOD",
        window: 100,
        score: 200,
        weight: 0.75,
        color: "#4CAF50",
        healthDelta: 2,
      },
      {
        name: "BAD",
        window: 150,
        score: 100,
        weight: 0.5,
        color: "#FF9800",
        healthDelta: 0.5,
      },
      {
        name: "SHIT",
        window: 180,
        score: 50,
        weight: 0.25,
        color: "#F44336",
        healthDelta: -4,
      },
    ],
  },
  NORMAL: {
    speedMultiplier: 1.0,
    judgments: [
      {
        name: "SICK",
        window: 45,
        score: 350,
        weight: 1.0,
        color: "#00FFFF",
        healthDelta: 4,
      },
      {
        name: "GOOD",
        window: 90,
        score: 200,
        weight: 0.75,
        color: "#4CAF50",
        healthDelta: 2,
      },
      {
        name: "BAD",
        window: 135,
        score: 100,
        weight: 0.5,
        color: "#FF9800",
        healthDelta: 0.5,
      },
      {
        name: "SHIT",
        window: 160,
        score: 50,
        weight: 0.25,
        color: "#F44336",
        healthDelta: -4,
      },
    ],
  },
  HARD: {
    speedMultiplier: 1.25,
    judgments: [
      {
        name: "SICK",
        window: 35,
        score: 350,
        weight: 1.0,
        color: "#00FFFF",
        healthDelta: 4,
      },
      {
        name: "GOOD",
        window: 75,
        score: 200,
        weight: 0.75,
        color: "#4CAF50",
        healthDelta: 2,
      },
      {
        name: "BAD",
        window: 110,
        score: 100,
        weight: 0.5,
        color: "#FF9800",
        healthDelta: 0.5,
      },
      {
        name: "SHIT",
        window: 130,
        score: 50,
        weight: 0.25,
        color: "#F44336",
        healthDelta: -4,
      },
    ],
  },
};

const NOTE_SIZE = 75;
const TARGET_Y_UPSCROLL = 100;
const TARGET_Y_DOWNSCROLL = 560;

const OPPONENT_LANE_X = [60, 145, 230, 315];
const PLAYER_LANE_X = [890, 975, 1060, 1145];
const LANE_COLORS = ["#C24B99", "#00FFFF", "#12FA05", "#F9393F"];
const LANE_ANGLES = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];

const drawArrow = (ctx, x, y, size, lane, color, isPressed = false) => {
  const half = size / 2;
  const quarter = size / 4;

  ctx.save();
  ctx.translate(x + half, y + half);
  ctx.rotate(LANE_ANGLES[lane]);

  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(half, 0);
  ctx.lineTo(quarter, 0);
  ctx.lineTo(quarter, half);
  ctx.lineTo(-quarter, half);
  ctx.lineTo(-quarter, 0);
  ctx.lineTo(-half, 0);
  ctx.closePath();

  if (isPressed) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.fillStyle = "rgba(20, 20, 30, 0.6)";
    ctx.fill();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.restore();
};

const parseNotesArray = (rawChart, targetSide = "player") => {
  if (!rawChart) return [];

  let extracted = [];
  const root = rawChart.song || rawChart.playerChart || rawChart;
  const notesData =
    root.notes || root.playerNotes || root.opponentNotes || root;

  if (!Array.isArray(notesData)) return [];

  const isFnfSectionFormat =
    notesData.length > 0 && Array.isArray(notesData[0]?.sectionNotes);

  if (isFnfSectionFormat) {
    notesData.forEach((section) => {
      const mustHit = section?.mustHitSection ?? true;
      const sectionNotes = section?.sectionNotes || [];

      sectionNotes.forEach((n) => {
        if (!Array.isArray(n) || n.length < 2) return;

        const rawTime = n[0];
        const rawLane = n[1];
        const duration = n[2] || 0;

        let isPlayerNote = rawLane >= 0 && rawLane <= 3 ? mustHit : !mustHit;

        if (
          (targetSide === "player" && isPlayerNote) ||
          (targetSide === "opponent" && !isPlayerNote)
        ) {
          extracted.push({
            time: rawTime < 100 ? rawTime * 1000 : rawTime,
            lane: rawLane % 4,
            duration: duration,
            type: duration > 0 ? "hold" : "note",
          });
        }
      });
    });
  } else {
    notesData.forEach((n) => {
      if (!n) return;

      const rawTime = n.time ?? n[0] ?? 0;
      const rawLane = n.lane ?? n[1] ?? 0;
      const duration = n.duration ?? n[2] ?? 0;
      const type = n.type || (duration > 0 ? "hold" : "note");

      extracted.push({
        time: rawTime < 100 ? rawTime * 1000 : rawTime,
        lane: rawLane % 4,
        duration: duration,
        type: type,
      });
    });
  }

  return extracted.sort((a, b) => a.time - b.time);
};

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

  const stopAllAudio = () => {
    stopAllSfx();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const callbacksRef = useRef({});
  callbacksRef.current = { onExit, onComplete, onPlayerHit, onOpponentHit };

  const optionsRef = useRef({});
  optionsRef.current = { keybinds, audioOffset, bgmVolume };

  const activeKeysRef = useRef({ 0: false, 1: false, 2: false, 3: false });
  const hitNotesRef = useRef(new Set());
  const activeHoldsRef = useRef(new Map());

  const opponentActiveKeysRef = useRef({
    0: false,
    1: false,
    2: false,
    3: false,
  });
  const opponentHitNotesRef = useRef(new Set());
  const opponentActiveHoldsRef = useRef(new Map());
  const opponentKeyTimersRef = useRef({ 0: 0, 1: 0, 2: 0, 3: 0 });

  const hitCountRef = useRef(0);

  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [accuracy, setAccuracy] = useState("0.00");
  const [lastRating, setLastRating] = useState(null);

  const [health, setHealth] = useState(50);
  const healthRef = useRef(50);
  const [isGameOver, setIsGameOver] = useState(false);
  const isGameOverRef = useRef(false);

  // CONTROLE DE PAUSA E CONTAGEM
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  const [countdownStep, setCountdownStep] = useState(null);
  const isCountingDownRef = useRef(true);
  const gameStartTimeRef = useRef(0);
  const countdownIntervalRef = useRef(null);

  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const totalHitWeightRef = useRef(0);
  const totalNotesPlayedRef = useRef(0);

  const currentTimeRef = useRef(0);
  const hasExitedRef = useRef(false);
  const bgImageRef = useRef(null);

  const diffKey = (
    difficulty ||
    songData?.difficulty ||
    "NORMAL"
  ).toUpperCase();
  const currentDiffConfig =
    DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.NORMAL;

  const playerNotes = useMemo(
    () => parseNotesArray(songData?.playerChart || songData, "player"),
    [songData],
  );
  const opponentNotes = useMemo(
    () => parseNotesArray(songData?.opponentChart || songData, "opponent"),
    [songData],
  );

  const playerNotesRef = useRef(playerNotes);
  useEffect(() => {
    playerNotesRef.current = playerNotes;
  }, [playerNotes]);

  const songRoot = songData?.song || songData?.playerChart || songData;
  const baseSpeed =
    songData?.speed ??
    songData?.playerChart?.speed ??
    songData?.song?.speed ??
    1.7;
  const bpm =
    songData?.bpm ?? songData?.playerChart?.bpm ?? songData?.song?.bpm ?? 120;

  const bpmMultiplier = bpm / 120;
  const diffMultiplier = currentDiffConfig.speedMultiplier;
  const scrollSpeed = baseSpeed * bpmMultiplier * diffMultiplier * 0.5;

  // REUTILIZAÇÃO DA CONTAGEM REGRESSIVA
  const runCountdownSequence = (onFinish) => {
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);

    const countdownSteps = [
      { text: "THREE", color: "#FF3333" },
      { text: "TWO", color: "#FF9900" },
      { text: "ONE", color: "#FFD700" },
      { text: "GO!", color: "#00FF66" },
    ];

    let currentStepIndex = 0;
    const sfxVolume = optionsRef.current.bgmVolume ?? 1;

    isCountingDownRef.current = true;
    setCountdownStep(countdownSteps[0]);
    playSfx("countdown", sfxVolume);

    countdownIntervalRef.current = setInterval(() => {
      currentStepIndex += 1;
      if (currentStepIndex < countdownSteps.length) {
        setCountdownStep(countdownSteps[currentStepIndex]);

        if (countdownSteps[currentStepIndex].text === "GO!") {
          isCountingDownRef.current = false;
          if (onFinish) onFinish();
        }
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdownStep(null);
      }
    }, 400);
  };

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
    hasExitedRef.current = false;

    scoreRef.current = 0;
    missesRef.current = 0;
    totalHitWeightRef.current = 0;
    totalNotesPlayedRef.current = 0;
    currentTimeRef.current = 0;

    healthRef.current = 50;
    isGameOverRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);

    setHealth(50);
    setIsGameOver(false);
    setScore(0);
    setMisses(0);
    setAccuracy("0.00");
    setLastRating(null);

    runCountdownSequence(() => {
      gameStartTimeRef.current = Date.now();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .catch((err) => console.error("Erro ao iniciar áudio:", err));
      }
    });

    return () => {
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      stopAllAudio();
    };
  }, [songData]);

  const updateHealth = (delta) => {
    if (isGameOverRef.current) return;

    healthRef.current = Math.max(0, Math.min(100, healthRef.current + delta));
    setHealth(healthRef.current);

    if (healthRef.current <= 0) {
      isGameOverRef.current = true;
      setIsGameOver(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const recordStats = (weight = 0, isMiss = false) => {
    if (isMiss) {
      missesRef.current += 1;
      setMisses(missesRef.current);
      updateHealth(-8);
    } else {
      totalHitWeightRef.current += weight;
    }

    totalNotesPlayedRef.current += 1;

    const acc =
      totalNotesPlayedRef.current > 0
        ? (
            (totalHitWeightRef.current / totalNotesPlayedRef.current) *
            100
          ).toFixed(2)
        : "0.00";

    setAccuracy(acc);
  };

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
    if (
      isCountingDownRef.current ||
      isGameOverRef.current ||
      isPausedRef.current
    )
      return;

    const now = currentTimeRef.current;
    const maxWindow = 180;
    const currentNotes = playerNotesRef.current;

    for (let i = 0; i < currentNotes.length; i++) {
      const note = currentNotes[i];
      if (note.lane !== lane || hitNotesRef.current.has(i)) continue;

      const timeDiff = note.time - now;
      if (timeDiff > maxWindow) break;
      if (timeDiff < -maxWindow) continue;

      const absDiff = Math.abs(timeDiff);
      const judgment = currentDiffConfig.judgments.find(
        (j) => absDiff <= j.window,
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
        setLastRating({ ...judgment, id: ++hitCountRef.current });
        updateHealth(judgment.healthDelta);
        recordStats(judgment.weight, false);
        break;
      }
    }
  };

  // GERENCIADOR DE TECLAS (ESC E ENTER)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESCAPE: PAUSAR OU SAIR
      if (e.key === "Escape") {
        if (isGameOverRef.current) {
          stopAllAudio();
          if (callbacksRef.current.onExit)
            callbacksRef.current.onExit(scoreRef.current);
          return;
        }

        if (isPausedRef.current) {
          // ESC 2: SAIR DO JOGO
          stopAllAudio();
          if (callbacksRef.current.onExit)
            callbacksRef.current.onExit(scoreRef.current);
        } else {
          // ESC 1: PARAR TOTALMENTE O JOGO E LIMPAR INTERVALOS
          if (countdownIntervalRef.current)
            clearInterval(countdownIntervalRef.current);
          setCountdownStep(null);

          isPausedRef.current = true;
          setIsPaused(true);
          activeKeysRef.current = { 0: false, 1: false, 2: false, 3: false };

          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
        return;
      }

      // ENTER: REPAUSAR E RODAR A CONTAGEM
      if (e.key === "Enter" && isPausedRef.current) {
        isPausedRef.current = false;
        setIsPaused(false);

        runCountdownSequence(() => {
          if (audioRef.current) {
            gameStartTimeRef.current =
              Date.now() - audioRef.current.currentTime * 1000;
            audioRef.current
              .play()
              .catch((err) => console.error("Erro ao retomar áudio:", err));
          }
        });
        return;
      }

      if (
        isCountingDownRef.current ||
        isGameOverRef.current ||
        isPausedRef.current
      )
        return;

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
  }, [currentDiffConfig]);

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

    const handleAudioEnd = () => {
      if (!hasExitedRef.current && !isGameOverRef.current) {
        hasExitedRef.current = true;
        if (callbacksRef.current.onComplete) {
          callbacksRef.current.onComplete(scoreRef.current);
        } else if (callbacksRef.current.onExit) {
          callbacksRef.current.onExit(scoreRef.current);
        }
      }
    };

    audio.addEventListener("ended", handleAudioEnd);

    const targetY = isDownscroll ? TARGET_Y_DOWNSCROLL : TARGET_Y_UPSCROLL;
    const maxMissWindow =
      currentDiffConfig.judgments[currentDiffConfig.judgments.length - 1]
        .window;

    const render = () => {
      if (isGameOverRef.current) return;

      let realTime = currentTimeRef.current;

      // ATUALIZA O TEMPO APENAS SE ESTIVER JOGANDO (NÃO PAUSADO E NÃO EM CONTAGEM)
      if (!isCountingDownRef.current && !isPausedRef.current) {
        const isAudioPlaying =
          audioRef.current &&
          !audioRef.current.paused &&
          audioRef.current.currentTime > 0;
        const offsetMs = optionsRef.current.audioOffset || 0;

        realTime = isAudioPlaying
          ? audioRef.current.currentTime * 1000 + offsetMs
          : Date.now() - gameStartTimeRef.current + offsetMs;

        currentTimeRef.current = realTime;
      }

      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const drawStrums = (laneOffsets, activeMap) => {
        laneOffsets.forEach((x, lane) => {
          drawArrow(
            ctx,
            x,
            targetY,
            NOTE_SIZE,
            lane,
            LANE_COLORS[lane],
            activeMap[lane],
          );
        });
      };

      drawStrums(PLAYER_LANE_X, activeKeysRef.current);
      drawStrums(OPPONENT_LANE_X, opponentActiveKeysRef.current);

      if (!isCountingDownRef.current && !isPausedRef.current) {
        opponentNotes.forEach((note, index) => {
          if (
            note.time <= realTime &&
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
            if (realTime >= hold.endTime) {
              opponentActiveHoldsRef.current.delete(lane);
              opponentActiveKeysRef.current[lane] = false;
            } else {
              opponentActiveKeysRef.current[lane] = true;
            }
          } else if (nowMs > opponentKeyTimersRef.current[lane]) {
            opponentActiveKeysRef.current[lane] = false;
          }
        });

        PLAYER_LANE_X.forEach((_, lane) => {
          const activeHold = activeHoldsRef.current.get(lane);
          if (activeHold) {
            const isKeyDown = activeKeysRef.current[lane];
            if (!isKeyDown && realTime < activeHold.endTime - 50) {
              hitNotesRef.current.add(activeHold.index);
              activeHoldsRef.current.delete(lane);
              setLastRating({
                name: "MISS",
                color: "#F9393F",
                id: ++hitCountRef.current,
              });
              recordStats(0, true);
            } else if (realTime >= activeHold.endTime) {
              hitNotesRef.current.add(activeHold.index);
              activeHoldsRef.current.delete(lane);
            }
          }
        });
      }

      const renderNotesForSide = (
        notesList,
        laneOffsets,
        hitSet,
        activeHoldsMap,
        isPlayerSide,
      ) => {
        notesList.forEach((note, index) => {
          const activeHold = activeHoldsMap.get(note.lane);
          const isBeingHeld = activeHold && activeHold.index === index;

          if (hitSet.has(index) && !isBeingHeld) return;

          const timeDiff = note.time - realTime;

          if (
            isPlayerSide &&
            !isCountingDownRef.current &&
            !isPausedRef.current &&
            timeDiff < -maxMissWindow &&
            !isBeingHeld &&
            !hitSet.has(index)
          ) {
            hitSet.add(index);
            setLastRating({
              name: "MISS",
              color: "#F9393F",
              id: ++hitCountRef.current,
            });
            recordStats(0, true);
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
                const remainingTime = Math.max(0, holdEndTime - realTime);
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
                const remainingTime = Math.max(0, holdEndTime - realTime);
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
            drawArrow(
              ctx,
              x,
              noteY,
              NOTE_SIZE,
              note.lane,
              LANE_COLORS[note.lane],
              true,
            );
          }
        });
      };

      renderNotesForSide(
        playerNotes,
        PLAYER_LANE_X,
        hitNotesRef.current,
        activeHoldsRef.current,
        true,
      );
      renderNotesForSide(
        opponentNotes,
        OPPONENT_LANE_X,
        opponentHitNotesRef.current,
        opponentActiveHoldsRef.current,
        false,
      );

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleAudioEnd);
      }
      stopAllAudio();
      audioRef.current = null;
    };
  }, [
    songData?.audioUrl,
    isDownscroll,
    scrollSpeed,
    playerNotes,
    opponentNotes,
    currentDiffConfig,
  ]);

  return (
    <div className="game-wrapper">
      <div className="game-canvas-container">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="game-canvas"
        />

        <div className="game-ui-overlay">
          {countdownStep && (
            <div
              className="fnf-countdown-overlay"
              style={{ color: countdownStep.color }}
            >
              {countdownStep.text}
            </div>
          )}

          {isPaused && (
            <div className="fnf-gameover-overlay">
              <h1 className="fnf-gameover-title" style={{ color: "#00FFFF" }}>
                PAUSADO
              </h1>
              <p className="fnf-gameover-sub">
                Pressione <strong>ENTER</strong> para Retomar
                <br />
                Pressione <strong>ESC</strong> para Sair
              </p>
            </div>
          )}

          {isGameOver && (
            <div className="fnf-gameover-overlay">
              <h1 className="fnf-gameover-title">GAME OVER</h1>
              <p className="fnf-gameover-sub">
                Pressione <strong>ESC</strong> para sair
              </p>
            </div>
          )}

          <div
            className={`fnf-hud-container ${isDownscroll ? "position-top" : "position-bottom"}`}
          >
            <div className="fnf-song-title">
              {songRoot?.title ||
                songData?.title ||
                songData?.name ||
                "Test Track"}{" "}
              - [{diffKey}]
            </div>

            <div className="fnf-health-bar-container">
              <div
                className="fnf-health-bar-fill"
                style={{
                  width: `${health}%`,
                  backgroundColor:
                    health > 50
                      ? "#00FF66"
                      : health > 20
                        ? "#FFD700"
                        : "#FF3333",
                }}
              />
            </div>

            <div className="fnf-stats-text">
              <span>Score: {score}</span>
              <span className="fnf-divider">|</span>
              <span>Misses: {misses}</span>
              <span className="fnf-divider">|</span>
              <span>Rating: {accuracy}%</span>
            </div>
          </div>

          {lastRating && !isPaused && (
            <div
              key={lastRating.id}
              className="rating-popup"
              style={{ color: lastRating.color }}
            >
              {lastRating.name}
            </div>
          )}

          <p className="exit-hint">
            Controles: <strong>{keybinds}</strong> | <strong>ESC</strong> Pausar
            / Sair
          </p>
        </div>
      </div>
    </div>
  );
}
