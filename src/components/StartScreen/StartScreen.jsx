import React, { useState, useEffect, useCallback, useRef } from 'react';
import './StartScreen.css';

import startThemeAudio from '../../assets/audio/music/start-theme.mp3';
import startSfxAudio from '../../assets/audio/sfx/select-sfx.mp3';

const BGM_VOLUME = 0.3;
const EXIT_DELAY_MS = 2500;

export default function StartScreen({ onStart }) {
  const [isExiting, setIsExiting] = useState(false);
  const audioCtxRef = useRef(null);
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const audio = new Audio(startThemeAudio);
    audio.loop = true;
    audioRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNodeRef.current = gainNode;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(BGM_VOLUME, ctx.currentTime);

    const unlockAndPlay = () => {
      if (ctx.state === 'suspended') ctx.resume();
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    unlockAndPlay();
    window.addEventListener('pointerdown', unlockAndPlay);
    window.addEventListener('keydown', unlockAndPlay);

    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      if (audioRef.current) audioRef.current.pause();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleStart = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    const sfx = new Audio(startSfxAudio);
    sfx.volume = 0.4;
    sfx.play().catch(() => {});

    if (audioCtxRef.current && gainNodeRef.current) {
      const ctx = audioCtxRef.current;
      const gain = gainNodeRef.current;
      const fadeSeconds = EXIT_DELAY_MS / 1000;

      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fadeSeconds);
    }

    setTimeout(() => {
      onStart();
    }, EXIT_DELAY_MS);
  }, [isExiting, onStart]);

  useEffect(() => {
    const handleKeyDown = () => handleStart();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart]);

  return (
    <div
      className={`start-container ${isExiting ? 'is-exiting' : ''}`}
      onClick={handleStart}
    >
      <div className="title-wrapper">
        <h1 className="game-title">
          <span className="title-line-top title-red">França's</span>
          <span className="title-line-bottom">
            <span className="title-yellow">Rhythm </span>
            <span className="title-blue">Trip</span>
          </span>
        </h1>
      </div>

      <p className="start-prompt">
        Aperte qualquer tecla ou toque na tela para iniciar
      </p>

      <div className="wipe-overlay" />
    </div>
  );
}