import React, { useState, useEffect, useCallback, useRef } from "react";
import "./FreeplayMenu.css";

import { playSfx } from "../../utils/useAudio";
import { getHighScore } from "../../utils/highScoreUtils";
import { ALL_FREEPLAY_SONGS } from "../../data/songsData";

const DIFFICULTIES = ["EASY", "NORMAL", "HARD"];

export default function FreeplayMenu({
  sfxVolume = 1,
  isSecretUnlocked = false,
  onToggleSecret,
  onStartSong,
  onBack,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [diffIndex, setDiffIndex] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const selectedItemRef = useRef(null);

  const lastInputRef = useRef("keyboard");
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Filtra músicas secretas usando ALL_FREEPLAY_SONGS do songsData.js
  const visibleSongs = ALL_FREEPLAY_SONGS.filter(
    (song) => !song.isSecret || isSecretUnlocked,
  );

  const currentSong = visibleSongs[selectedIndex];
  const currentDifficulty = DIFFICULTIES[diffIndex];

  useEffect(() => {
    if (selectedIndex >= visibleSongs.length) {
      setSelectedIndex(0);
    }
  }, [visibleSongs.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex !== -1 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Carrega o High Score gravado no localStorage
  useEffect(() => {
    if (currentSong?.id) {
      const score = getHighScore(currentSong.id, currentDifficulty);
      setHighScore(score || 0);
    } else {
      setHighScore(0);
    }
  }, [selectedIndex, diffIndex, visibleSongs, currentSong, currentDifficulty]);

  const changeSong = useCallback(
    (direction) => {
      lastInputRef.current = "keyboard";
      playSfx("scroll", sfxVolume);
      setSelectedIndex((prev) => {
        if (prev === -1) {
          return direction > 0 ? 0 : visibleSongs.length - 1;
        }
        return (prev + direction + visibleSongs.length) % visibleSongs.length;
      });
    },
    [sfxVolume, visibleSongs.length],
  );

  const changeDifficulty = useCallback(
    (direction) => {
      lastInputRef.current = "keyboard";
      playSfx("scroll", sfxVolume);
      setDiffIndex(
        (prev) =>
          (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length,
      );
    },
    [sfxVolume],
  );

  const handleConfirm = useCallback(
    (songToPlay) => {
      const selectedSong =
        songToPlay ||
        (selectedIndex !== -1 ? visibleSongs[selectedIndex] : null);

      if (!selectedSong) return;

      playSfx("select", sfxVolume, 1.1);
      if (onStartSong) {
        onStartSong({
          ...selectedSong,
          difficulty: DIFFICULTIES[diffIndex],
        });
      }
    },
    [selectedIndex, visibleSongs, diffIndex, sfxVolume, onStartSong],
  );

  const handleMouseMoveItem = (e, index) => {
    const hasMoved =
      e.clientX !== mousePosRef.current.x ||
      e.clientY !== mousePosRef.current.y;

    if (hasMoved) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      lastInputRef.current = "mouse";

      if (selectedIndex !== index) {
        playSfx("scroll", sfxVolume);
        setSelectedIndex(index);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowDown":
        case "s":
        case "S":
          changeSong(1);
          break;
        case "ArrowUp":
        case "w":
        case "W":
          changeSong(-1);
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
        case "7":
          playSfx("select", sfxVolume);
          if (onToggleSecret) onToggleSecret();
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
  }, [
    changeSong,
    changeDifficulty,
    handleConfirm,
    onBack,
    onToggleSecret,
    sfxVolume,
  ]);

  return (
    <div className="freeplay-container">
      <div className="freeplay-score-box">
        <div className="score-label">HIGH SCORE</div>
        <div className="score-value">{highScore}</div>
        <div className="diff-selector">
          <button type="button" onClick={() => changeDifficulty(-1)}>
            ◀
          </button>
          <span className={`diff-text diff-${diffIndex}`}>
            {DIFFICULTIES[diffIndex]}
          </span>
          <button type="button" onClick={() => changeDifficulty(1)}>
            ▶
          </button>
        </div>
      </div>

      <div className="freeplay-song-list">
        {visibleSongs.map((song, index) => {
          const isSelected = index === selectedIndex;
          const displayTitle =
            song.title || song.id.replace(/-/g, " ").toUpperCase();

          return (
            <div
              key={song.id}
              ref={isSelected ? selectedItemRef : null}
              className={`freeplay-song-card ${isSelected ? "selected" : ""}`}
              onMouseMove={(e) => handleMouseMoveItem(e, index)}
              onClick={() => {
                lastInputRef.current = "mouse";
                setSelectedIndex(index);
                handleConfirm(song);
              }}
            >
              <span className="song-title">{displayTitle}</span>

              {song.icon && (
                <div className="icon-wrapper">
                  <img
                    src={song.icon}
                    alt={displayTitle}
                    className="song-icon"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="freeplay-footer">
        <span>
          [W/S] Escolher Música &nbsp;|&nbsp; [A/D] Dificuldade &nbsp;|&nbsp;
          [ENTER] Jogar &nbsp;|&nbsp; [ESC] Voltar
        </span>
      </footer>
    </div>
  );
}
