import React, { useState, useEffect, useCallback } from "react";
import "./StoryModeMenu.css";

import { playSfx } from "../../utils/useAudio";
import { getWeekHighScore } from "../../utils/highScoreUtils";
import { WEEKS } from "../../data/songsData";

const DIFFICULTIES = ["EASY", "NORMAL", "HARD"];

export default function StoryModeMenu({ sfxVolume = 1, onSelectWeek, onBack }) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [diffIndex, setDiffIndex] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [weekScore, setWeekScore] = useState(0);

  const currentWeek = WEEKS[weekIndex] || WEEKS[0];

  // Seletor inteligente: mantém limites fixos (não faz loop infinito)
  const changeWeek = useCallback(
    (direction) => {
      if (isConfirming) return;
      setWeekIndex((prev) => {
        const next = prev + direction;
        if (next < 0 || next >= WEEKS.length) return prev;
        playSfx("scroll", sfxVolume);
        return next;
      });
    },
    [isConfirming, sfxVolume],
  );

  const changeDifficulty = useCallback(
    (direction) => {
      if (isConfirming) return;
      playSfx("scroll", sfxVolume);
      setDiffIndex(
        (prev) =>
          (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length,
      );
    },
    [isConfirming, sfxVolume],
  );

  const handleConfirm = useCallback(() => {
    if (isConfirming) return;
    setIsConfirming(true);

    playSfx("select", sfxVolume, 1.1);
    playSfx("yeah", sfxVolume * 1.1, 1.0);

    setTimeout(() => {
      if (onSelectWeek) {
        onSelectWeek({
          ...currentWeek,
          difficulty: DIFFICULTIES[diffIndex],
        });
      }
    }, 1000);
  }, [isConfirming, currentWeek, diffIndex, sfxVolume, onSelectWeek]);

  useEffect(() => {
    if (!currentWeek) return;
    const currentDifficulty = DIFFICULTIES[diffIndex];
    const score = getWeekHighScore(currentWeek.id, currentDifficulty);
    setWeekScore(score || 0);
  }, [weekIndex, diffIndex, currentWeek]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          changeWeek(-1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          changeWeek(1);
          break;
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
  }, [changeWeek, changeDifficulty, handleConfirm, onBack, sfxVolume]);

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
            {(currentWeek.songs || currentWeek.tracks || []).map((song) => (
              <li key={song.id}>
                {song.title || song.id.replace(/-/g, " ").toUpperCase()}
              </li>
            ))}
          </ul>
        </div>

        {/* Carrossel Vertical da Semana */}
        <div className="week-title-column">
          <div className="weeks-carousel-viewport">
            <div
              className="weeks-carousel-track"
              style={{
                transform: `translateY(${-weekIndex * 70 + 35}px)`,
              }}
            >
              {WEEKS.map((week, idx) => {
                const isSelected = idx === weekIndex;
                return (
                  <div
                    key={week.id || idx}
                    className={`week-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (!isConfirming && idx !== weekIndex) {
                        playSfx("scroll", sfxVolume);
                        setWeekIndex(idx);
                      }
                    }}
                  >
                    <h1
                      className={`week-title ${
                        isSelected && isConfirming ? "confirming" : ""
                      }`}
                    >
                      {week.title}
                    </h1>
                  </div>
                );
              })}
            </div>
          </div>
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
