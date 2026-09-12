import React, { useState, useEffect, useCallback, useRef } from "react";
import "./StartScreen.css";

// Importa o disparador de SFX instantâneo
import { playSfx } from "../../utils/useAudio";

import startThemeAudio from "../../assets/audio/musics/start-theme.mp3";

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
      // Adicionado .catch() para absorver a rejeição quando a tela fecha
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    unlockAndPlay();
    window.addEventListener("pointerdown", unlockAndPlay);
    window.addEventListener("keydown", unlockAndPlay);

    return () => {
      window.removeEventListener("pointerdown", unlockAndPlay);
      window.removeEventListener("keydown", unlockAndPlay);
      if (audioRef.current) audioRef.current.pause();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleStart = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    // Toca o som de confirmação pré-carregado no App.jsx sem latência
    playSfx("select", 0.4);

    if (audioCtxRef.current && gainNodeRef.current) {
      const ctx = audioCtxRef.current;
      const gain = gainNodeRef.current;

      // 1. Reativa o contexto se estivesse suspenso, capturando o cancelamento de forma silenciosa
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // 2. Aplica o fade-out somente se o contexto de áudio estiver ativo e não fechado
      if (ctx.state !== "closed") {
        const fadeSeconds = EXIT_DELAY_MS / 1000;

        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(
          0.0001,
          ctx.currentTime + fadeSeconds,
        );
      }
    }

    setTimeout(() => {
      onStart();
    }, EXIT_DELAY_MS);
  }, [isExiting, onStart]);

  useEffect(() => {
    const handleKeyDown = () => handleStart();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStart]);

  return (
    <div
      className={`start-container ${isExiting ? "is-exiting" : ""}`}
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

      <p className="start-prompt">Press any key or touch the screen to start</p>

      <div className="wipe-overlay" />
    </div>
  );
}
