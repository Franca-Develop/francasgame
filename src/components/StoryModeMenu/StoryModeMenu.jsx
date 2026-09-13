import React, { useState, useEffect, useCallback } from "react";
import "./StoryModeMenu.css";

import { playSfx } from "../../utils/useAudio";
import { getWeekHighScore } from "../../utils/highScoreUtils"; // Importa busca da semana

const DIFFICULTIES = ["EASY", "NORMAL", "HARD"];

const WEEK_DATA = {
  id: "week1",
  title: "WEEK 1",
  tracks: [
    { id: "lets-go-gambling", title: "LET'S GO GAMBLING" },
    { id: "fight-or-flight", title: "FIGHT OR FLIGHT" },
    { id: "castle-chorus", title: "CASTLE CHORUS" },
  ],
};

export default function StoryModeMenu({ sfxVolume = 1, onSelectWeek, onBack }) {
  const [diffIndex, setDiffIndex] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [weekScore, setWeekScore] = useState(0);

  const changeDifficulty = useCallback(
    (direction) => {
      if (isConfirming) return;
      playSfx("scroll", sfxVolume);
      setDiffIndex(
        (prev) =>
          (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length
      );
    },
    [isConfirming, sfxVolume]
  );

  const handleConfirm = useCallback(() => {
    if (isConfirming) return;
    setIsConfirming(true);

    playSfx("select", sfxVolume, 1.1);
    playSfx("yeah", sfxVolume * 1.1, 1.0);

    setTimeout(() => {
      if (onSelectWeek) {
        onSelectWeek({
          ...WEEK_DATA,
          difficulty: DIFFICULTIES[diffIndex],
        });
      }
    }, 1000);
  }, [isConfirming, diffIndex, sfxVolume, onSelectWeek]);

  // Recalcula o score total somando os pontos gravados de cada música na dificuldade atual
  useEffect(() => {
    const currentDifficulty = DIFFICULTIES[diffIndex];
    const score = getWeekHighScore(WEEK_DATA.id, currentDifficulty);
    setWeekScore(score);
  }, [diffIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          changeDifficulty(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          changeDifficulty(1);
          break;
        case "Enter":
        case " ":
          handleConfirm();
          break;
        case "Escape":
        case "Backspace":
          playSfx("cancel", sfxVolume);
          if (onBack) onBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDifficulty, handleConfirm, onBack, sfxVolume]);

  return (
    <div className="story-container">
      <header className="story-header">
        <span className="week-score">WEEK SCORE: {weekScore}</span>
      </header>

      <main className="story-banner-container">
        <div className="character-canvas-placeholder" />
      </main>

      <footer className="story-controls-panel">
        <div className="tracks-column">
          <span className="tracks-header">TRACKS</span>
          <ul className="tracks-list">
            {WEEK_DATA.tracks.map((track) => (
              <li key={track.id}>{track.title}</li>
            ))}
          </ul>
        </div>

        <div className="week-title-column">
          <h1 className={`week-title ${isConfirming ? "confirming" : ""}`}>
            {WEEK_DATA.title}
          </h1>
        </div>

        <div className="difficulty-column">
          <button
            type="button"
            className="diff-arrow"
            onClick={() => changeDifficulty(-1)}
          >
            ◀
          </button>
          <span className={`diff-label diff-${diffIndex}`}>
            {DIFFICULTIES[diffIndex]}
          </span>
          <button
            type="button"
            className="diff-arrow"
            onClick={() => changeDifficulty(1)}
          >
            ▶
          </button>
        </div>
      </footer>
    </div>
  );
}