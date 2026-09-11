import React, { useState, useEffect, useCallback, useRef } from 'react';
import './FreeplayMenu.css';

// Importa o gerenciador global de SFX via Web Audio API
import { playSfx } from '../../utils/sfxManager';

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

export default function FreeplayMenu({ 
  sfxVolume = 1, 
  isSecretUnlocked = false, 
  onSelectSong, 
  onBack 
}) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [diffIndex, setDiffIndex] = useState(1);
  const selectedItemRef = useRef(null);

  const lastInputRef = useRef('keyboard');
  const mousePosRef = useRef({ x: 0, y: 0 });

  const visibleSongs = SONG_LIST.filter(
    (song) => !song.isSecret || isSecretUnlocked
  );

  useEffect(() => {
    if (selectedIndex >= visibleSongs.length) {
      setSelectedIndex(-1);
    }
  }, [visibleSongs.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex !== -1 && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const changeSong = useCallback((direction) => {
    lastInputRef.current = 'keyboard';
    playSfx('scroll', sfxVolume);
    setSelectedIndex((prev) => {
      if (prev === -1) {
        return direction > 0 ? 0 : visibleSongs.length - 1;
      }
      return (prev + direction + visibleSongs.length) % visibleSongs.length;
    });
  }, [sfxVolume, visibleSongs.length]);

  const changeDifficulty = useCallback((direction) => {
    lastInputRef.current = 'keyboard';
    playSfx('scroll', sfxVolume);
    setDiffIndex((prev) => (prev + direction + DIFFICULTIES.length) % DIFFICULTIES.length);
  }, [sfxVolume]);

  const handleConfirm = useCallback((songToPlay) => {
    const selectedSong = songToPlay || (selectedIndex !== -1 ? visibleSongs[selectedIndex] : null);

    if (!selectedSong) return;

    playSfx('select', sfxVolume);
    if (onSelectSong) {
      onSelectSong({
        song: selectedSong,
        difficulty: DIFFICULTIES[diffIndex]
      });
    }
  }, [selectedIndex, visibleSongs, diffIndex, sfxVolume, onSelectSong]);

  // Só troca para o modo 'mouse' se o ponteiro REALMENTE mudar de coordenadas X/Y
  const handleMouseMoveItem = (e, index) => {
    const hasMoved = e.clientX !== mousePosRef.current.x || e.clientY !== mousePosRef.current.y;

    if (hasMoved) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      lastInputRef.current = 'mouse';

      if (selectedIndex !== index) {
        playSfx('scroll', sfxVolume);
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
          playSfx('cancel', sfxVolume);
          if (onBack) onBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeSong, changeDifficulty, handleConfirm, onBack, sfxVolume]);

  return (
    <div className="freeplay-container">
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

      <div className="freeplay-song-list">
        {visibleSongs.map((song, index) => {
          const isSelected = index === selectedIndex;

          return (
            <div
              key={song.id}
              ref={isSelected ? selectedItemRef : null}
              className={`freeplay-song-card ${isSelected ? 'selected' : ''}`}
              onMouseMove={(e) => handleMouseMoveItem(e, index)}
              onClick={() => {
                lastInputRef.current = 'mouse';
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