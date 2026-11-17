import React, { useState, useEffect, useCallback, useRef } from "react";
import "./FreeplayMenu.css";
import { playSfx } from "../../utils/audioEngine";
import { useProgress } from "../../contexts/ProgressContext";
import { ALL_FREEPLAY_SONGS } from "../../data/songsData";
import {
  calculateSFC,
  calculateRank,
  getRankColor,
  formatDuration,
} from "../../utils/scoreUtils";

const DIFFICULTIES = ["EASY", "NORMAL", "HARD"];

export default function FreeplayMenu({
  sfxVolume = 1,
  isSecretUnlocked = false,
  onToggleSecret,
  onStartSong,
  onBack,
}) {
  const { getSongHighScore } = useProgress();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [diffIndex, setDiffIndex] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const selectedItemRef = useRef(null);

  const visibleSongs = ALL_FREEPLAY_SONGS.filter(
    (song) => !song.isSecret || isSecretUnlocked,
  );

  const currentSong = visibleSongs[selectedIndex];
  const currentDifficulty = DIFFICULTIES[diffIndex];

  const currentSFC = currentSong ? calculateSFC(currentSong) : 0;
  const currentRank = calculateRank(highScore, currentSFC);
  const rankColor = getRankColor(currentRank);

  useEffect(() => {
    if (selectedIndex >= visibleSongs.length) setSelectedIndex(0);
  }, [visibleSongs.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex !== -1 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (currentSong?.id) {
      setHighScore(getSongHighScore(currentSong.id, currentDifficulty) || 0);
    } else {
      setHighScore(0);
    }
  }, [
    selectedIndex,
    diffIndex,
    visibleSongs,
    currentSong,
    currentDifficulty,
    getSongHighScore,
  ]);

  const changeSong = useCallback(
    (direction) => {
      playSfx("scroll", sfxVolume / 100);
      setSelectedIndex(
        (prev) =>
          (prev + direction + visibleSongs.length) % visibleSongs.length,
      );
    },
    [sfxVolume, visibleSongs.length],
  );

  const changeDifficulty = useCallback(
    (direction) => {
      playSfx("scroll", sfxVolume / 100);
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
      playSfx("select", (sfxVolume / 100) * 1.1);
      if (onStartSong)
        onStartSong({ ...selectedSong, difficulty: DIFFICULTIES[diffIndex] });
    },
    [selectedIndex, visibleSongs, diffIndex, sfxVolume, onStartSong],
  );

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
          playSfx("select", sfxVolume / 100);
          if (onToggleSecret) onToggleSecret();
          break;
        case "Escape":
        case "Backspace":
          playSfx("cancel", sfxVolume / 100);
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
        <div className="score-display">
          {highScore > 0 && <div className="score-value">{highScore}</div>}
          <div className="score-rank" style={{ color: rankColor }}>
            {currentRank}
          </div>
        </div>
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

      <div className="freeplay-list-wrapper">
        {visibleSongs.map((song, index) => {
          const isSelected = index === selectedIndex;
          const displayTitle =
            song.title || song.id.replace(/-/g, " ").toUpperCase();
          const cardSFC = calculateSFC(song);
          const durationStr = formatDuration(song.duration || 0);

          return (
            <div
              key={song.id}
              ref={isSelected ? selectedItemRef : null}
              className={`freeplay-song-card ${isSelected ? "selected" : ""}`}
              onClick={() => {
                // Lógica de confirmação com clique
                if (selectedIndex === index) {
                  // Se já está selecionado, clicar de novo inicia o jogo
                  handleConfirm(song);
                } else {
                  // Se não está selecionado, apenas seleciona e toca o som de scroll
                  playSfx("scroll", sfxVolume / 100);
                  setSelectedIndex(index);
                }
              }}
            >
              <div
                className="card-bg"
                style={{
                  backgroundImage: song.bg ? `url(${song.bg})` : "none",
                }}
              />
              <div className="card-overlay" />

              <div className="card-content">
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

              <div className="card-footer">
                <span>{durationStr}</span>
                <span>SFC: {cardSFC}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
