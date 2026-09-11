import React, { useState, useEffect, useCallback, useRef } from 'react';
import './FreeplayMenu.css';

import scrollSfxAudio from '../../assets/audio/sfx/scroll-sfx.mp3';
import confirmSfxAudio from '../../assets/audio/sfx/select-sfx.mp3';
import cancelSfxAudio from '../../assets/audio/sfx/cancel-sfx.mp3';

import kingDiceIcon from '../../assets/images/icons/king-dice-icon.png';
import v1Icon from '../../assets/images/icons/v1-icon.png';
import hornetIcon from '../../assets/images/icons/hornet-icon.png';
import secretIcon from '../../assets/images/icons/secret-icon.png';

const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'];

const SONG_LIST = [
  {
    id: 'lets-go-gambling',
    name: "LET'S GO GAMBLING",
    character: 'KING DICE',
    icon: kingDiceIcon,
    color: '#9B51E0'
  },
  {
    id: 'fight-or-flight',
    name: 'FIGHT OR FLIGHT',
    character: 'HORNET',
    icon: hornetIcon,
    color: '#FF0055'
  },
  {
    id: 'castle-chorus',
    name: 'CASTLE CHORUS',
    character: 'V1',
    icon: v1Icon,
    color: '#1140c0'
  },
  {
    id: 'last-stop',
    name: 'LAST STOP',
    character: '???',
    icon: secretIcon,
    color: '#FFDE00',
    isSecret: true
  }
];

export default function FreeplayMenu({ sfxVolume = 1, onSelectSong, onBack }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [diffIndex, setDiffIndex] = useState(1);
  const selectedItemRef = useRef(null);

  // Armazena as coordenadas (X, Y) do mouse para detectar movimento real
  const lastMousePos = useRef({ x: 0, y: 0 });

  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);

  useEffect(() => {
    const hardCompleted = localStorage.getItem('rhythm_hard_completed') === 'true';
    setIsSecretUnlocked(hardCompleted);
  }, []);

  const visibleSongs = ALL_SONGS.filter(
    (song) => !song.isSecret || isSecretUnlocked
  );

  useEffect(() => {
    if (selectedIndex >= visibleSongs.length) {
      setSelectedIndex(0);
    }
  }, [visibleSongs.length, selectedIndex]);

  // Centraliza o item selecionado na tela
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const playSfx = useCallback((audioPath) => {
    const sfx = new Audio(audioPath);
    sfx.volume = sfxVolume;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }, [sfxVolume]);

  const changeSong = useCallback((direction) => {
    playSfx(scrollSfxAudio);
    setSelectedIndex((prev) => (prev + direction + visibleSongs.length) % visibleSongs.length);
  }, [playSfx, visibleSongs.length]);

  const changeDifficulty = useCallback((direction) => {
    playSfx(scrollSfxAudio);
    setDiffIndex((prev) => (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length);
  }, [playSfx]);

  const handleConfirm = useCallback((songToPlay) => {
    const selectedSong = songToPlay || visibleSongs[selectedIndex];

    if (!selectedSong) return;

    playSfx(confirmSfxAudio);
    if (onSelectSong) {
      onSelectSong({
        song: selectedSong,
        difficulty: DIFFICULTIES[diffIndex]
      });
    }
  }, [selectedIndex, visibleSongs, diffIndex, playSfx, onSelectSong]);

  // Só altera a seleção se a mão do jogador REALMENTE mover o mouse
  const handleMouseMoveOnItem = (e, index) => {
    if (e.clientX !== lastMousePos.current.x || e.clientY !== lastMousePos.current.y) {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      if (selectedIndex !== index) {
        playSfx(scrollSfxAudio);
        setSelectedIndex(index);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
          changeSong(1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeSong(-1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDifficulty(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDifficulty(1);
          break;
        case 'Enter':
        case ' ':
          handleConfirm();
          break;
        case 'Escape':
        case 'Backspace':
          playSfx(cancelSfxAudio);
          if (onBack) onBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeSong, changeDifficulty, handleConfirm, onBack, playSfx]);

  return (
    <div className="freeplay-container">
      {/* Selector de Dificuldade */}
      <div className="freeplay-score-box">
        <div className="score-label">PONTUAÇÃO MÁXIMA</div>
        <div className="score-value">000000</div>
        <div className="diff-selector">
          <button type="button" onClick={() => changeDifficulty(-1)}>◀</button>
          <span className={`diff-text diff-${diffIndex}`}>
            {DIFFICULTIES[diffIndex]}
          </span>
          <button type="button" onClick={() => changeDifficulty(1)}>▶</button>
        </div>
      </div>

      {/* Lista de Músicas */}
      <div className="freeplay-song-list">
        {visibleSongs.map((song, index) => {
          const isSelected = index === selectedIndex;

          return (
            <div
              key={song.id}
              ref={isSelected ? selectedItemRef : null}
              className={`freeplay-song-card ${isSelected ? 'selected' : ''}`}
              onMouseMove={(e) => handleMouseMoveOnItem(e, index)}
              onClick={() => {
                setSelectedIndex(index);
                handleConfirm(song);
              }}
            >
              <span className="song-title">{song.name}</span>

              <div className="icon-wrapper">
                <img
                  src={song.icon}
                  alt={song.character}
                  className="song-icon"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <footer className="freeplay-footer">
        <span>[W/S] Escolher Música &nbsp;|&nbsp; [A/D] Dificuldade &nbsp;|&nbsp; [ENTER] Jogar &nbsp;|&nbsp; [ESC] Voltar</span>
      </footer>
    </div>
  );
}