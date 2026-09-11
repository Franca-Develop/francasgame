import React, { useState, useEffect, useCallback } from "react";
import "./StoryModeMenu.css";

// Módulo de SFX com latência zero
import { playSfx } from "../../utils/sfxManager";

const DIFFICULTIES = ["EASY", "NORMAL", "HARD"];

// Configuração da Semana 1
const WEEK_DATA = {
  id: "week1",
  title: "WEEK 1",
  tracks: ["LET'S GO GAMBLING", "FIGHT OR FLIGHT", "CASTLE CHORUS"],
};

export default function StoryMenu({ sfxVolume = 1, onSelectWeek, onBack }) {
  const [diffIndex, setDiffIndex] = useState(1); // Normal por padrão
  const [isConfirming, setIsConfirming] = useState(false);

  const changeDifficulty = useCallback(
    (direction) => {
      if (isConfirming) return;
      playSfx("scroll", sfxVolume);
      setDiffIndex(
        (prev) => (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length
      );
    },
    [isConfirming, sfxVolume]
  );

  const handleConfirm = useCallback(() => {
    if (isConfirming) return;
    setIsConfirming(true);

    playSfx("select", sfxVolume * 0.8);
    playSfx("yeah", sfxVolume * 0.9);

    setTimeout(() => {
      if (onSelectWeek) {
        onSelectWeek({
          week: WEEK_DATA.id,
          difficulty: DIFFICULTIES[diffIndex],
          tracks: WEEK_DATA.tracks,
        });
      }
    }, 1000);
  }, [isConfirming, diffIndex, sfxVolume, onSelectWeek]);

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
      {/* Pontuação superior */}
      <header className="story-header">
        <span className="week-score">WEEK SCORE: 0</span>
      </header>

      {/* Área central com fundo vermelho (Canvas reservado para arte/personagens) */}
      <main className="story-banner-container">
        <div className="character-canvas-placeholder">
          {/* A arte / Canvas dos personagens entrará aqui futuramente */}
        </div>
      </main>

      {/* Painel inferior com Tracks, Semana e Dificuldade */}
      <footer className="story-controls-panel">
        <div className="tracks-column">
          <span className="tracks-header">TRACKS</span>
          <ul className="tracks-list">
            {WEEK_DATA.tracks.map((track, i) => (
              <li key={i}>{track}</li>
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