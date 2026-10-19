import React, { useState, useEffect, useCallback } from "react";
import "./StartScreen.css";

import {
  playSfx,
  playLoopedMusic,
  fadeOutLoopedMusic,
} from "../../utils/audioEngine";

import startThemeAudio from "../../assets/audio/musics/start-theme.mp3";

const BGM_VOLUME = 0.3;
const EXIT_DELAY_MS = 2500;

export default function StartScreen({ onStart }) {
  const [isExiting, setIsExiting] = useState(false);

  // BGM do start via engine
  useEffect(() => {
    playLoopedMusic({
      id: "start",
      url: startThemeAudio,
      volume: BGM_VOLUME,
      fadeMs: 0,
    });
    return () => {
      // Garante parada ao desmontar (após onStart, ou se removido por qualquer motivo)
      fadeOutLoopedMusic("start", 0);
    };
  }, []);

  const handleStart = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    playSfx("select", 0.4);
    fadeOutLoopedMusic("start", EXIT_DELAY_MS);

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
