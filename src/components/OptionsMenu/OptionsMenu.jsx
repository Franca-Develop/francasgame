import React, { useState, useEffect, useCallback, useRef } from 'react';
import './OptionsMenu.css';

import scrollSfxAudio from '../../assets/audio/sfx/scroll-sfx.mp3';
import confirmSfxAudio from '../../assets/audio/sfx/select-sfx.mp3';
import cancelSfxAudio from '../../assets/audio/sfx/cancel-sfx.mp3';

const KEYBIND_PRESETS = ['ARROWS', 'WASD', 'DFJK'];

export default function OptionsMenu({
  bgmVolume,
  setBgmVolume,
  sfxVolume,
  setSfxVolume,
  audioOffset,
  setAudioOffset,
  keybinds,
  setKeybinds,
  onBack
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastInputRef = useRef('keyboard');
  const selectedRef = useRef(null);

  const OPTIONS = [
    { id: 'bgm', label: 'MUSIC' },
    { id: 'sfx', label: 'SFX' },
    { id: 'offset', label: 'AUDIO OFFSET' },
    { id: 'controls', label: 'CONTROLS' },
    { id: 'back', label: 'BACK' }
  ];

  useEffect(() => {
    const handleMouseMove = () => {
      lastInputRef.current = 'mouse';
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const playSfx = useCallback((audioPath, volumeMult = 1) => {
    const sfx = new Audio(audioPath);
    sfx.volume = Math.min(1, Math.max(0, sfxVolume * volumeMult));
    sfx.currentTime = 0.03;
    sfx.play().catch(() => {});
  }, [sfxVolume]);

  const changeValue = useCallback((direction) => {
    const option = OPTIONS[selectedIndex].id;
    playSfx(scrollSfxAudio);

    if (option === 'bgm') {
      setBgmVolume((prev) => Math.min(1, Math.max(0, parseFloat((prev + direction * 0.1).toFixed(1)))));
    } else if (option === 'sfx') {
      setSfxVolume((prev) => Math.min(1, Math.max(0, parseFloat((prev + direction * 0.1).toFixed(1)))));
    } else if (option === 'offset') {
      setAudioOffset((prev) => Math.min(500, Math.max(-500, prev + direction * 5)));
    } else if (option === 'controls') {
      setKeybinds((prev) => {
        const currentIndex = KEYBIND_PRESETS.indexOf(prev);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (safeIndex + direction + KEYBIND_PRESETS.length) % KEYBIND_PRESETS.length;
        return KEYBIND_PRESETS[nextIndex];
      });
    }
  }, [selectedIndex, OPTIONS, setBgmVolume, setSfxVolume, setAudioOffset, setKeybinds, playSfx]);

  const handleNext = useCallback(() => {
    lastInputRef.current = 'keyboard';
    playSfx(scrollSfxAudio);
    setSelectedIndex((prev) => (prev + 1) % OPTIONS.length);
  }, [playSfx, OPTIONS.length]);

  const handlePrev = useCallback(() => {
    lastInputRef.current = 'keyboard';
    playSfx(scrollSfxAudio);
    setSelectedIndex((prev) => (prev - 1 + OPTIONS.length) % OPTIONS.length);
  }, [playSfx, OPTIONS.length]);

  const handleConfirm = useCallback(() => {
    const currentId = OPTIONS[selectedIndex].id;
    if (currentId === 'back') {
      playSfx(cancelSfxAudio);
      onBack();
    } else {
      playSfx(confirmSfxAudio);
      changeValue(1);
    }
  }, [selectedIndex, OPTIONS, onBack, changeValue, playSfx]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
          handleNext();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          handlePrev();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeValue(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeValue(1);
          break;
        case 'Enter':
        case ' ':
          handleConfirm();
          break;
        case 'Escape':
        case 'Backspace':
          playSfx(cancelSfxAudio);
          onBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, changeValue, handleConfirm, onBack, playSfx]);

  const handleHover = (index) => {
    if (lastInputRef.current === 'mouse' && selectedIndex !== index) {
      playSfx(scrollSfxAudio);
      setSelectedIndex(index);
    }
  };

  const renderValueControl = (id) => {
    if (id === 'bgm') {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <div className="bar-container">
            <div className="bar-fill" style={{ width: `${bgmVolume * 100}%` }} />
          </div>
          <span>{Math.round(bgmVolume * 100)}%</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === 'sfx') {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <div className="bar-container">
            <div className="bar-fill sfx-fill" style={{ width: `${sfxVolume * 100}%` }} />
          </div>
          <span>{Math.round(sfxVolume * 100)}%</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === 'offset') {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <span className="offset-value">{audioOffset > 0 ? `+${audioOffset}` : audioOffset} ms</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === 'controls') {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <span className="preset-value">{keybinds}</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="options-container">
      <h1 className="options-title">OPTIONS</h1>

      <div className="options-left-list">
        {OPTIONS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.id}
              className={`option-row ${isSelected ? 'selected' : ''}`}
              onMouseEnter={() => handleHover(index)}
              onMouseMove={() => handleHover(index)}
              onClick={() => {
                lastInputRef.current = 'mouse';
                setSelectedIndex(index);
                if (item.id === 'back') handleConfirm();
              }}
            >
              <div className="option-label">
                {isSelected && <span className="arrow">▶ </span>}
                {item.label}
              </div>
              {renderValueControl(item.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}