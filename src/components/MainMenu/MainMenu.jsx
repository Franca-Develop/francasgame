import React, { useState, useEffect, useCallback, useRef } from "react";
import "./MainMenu.css";

import scrollSfxAudio from "../../assets/audio/sfx/scroll-sfx.mp3";
import confirmSfxAudio from "../../assets/audio/sfx/select-sfx.mp3";
import yeahSfxAudio from "../../assets/audio/sfx/yeah-sfx.mp3";
import cancelSfxAudio from "../../assets/audio/sfx/cancel-sfx.mp3";

const MENU_OPTIONS = [
  { id: "story", label: "STORY MODE", color: "#FF0055" },
  { id: "freeplay", label: "FREEPLAY", color: "#FFDE00" },
  { id: "options", label: "SETTINGS", color: "#00E5FF" },
];

export default function MainMenu({ sfxVolume = 0.7, onSelectMode, onBack }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const lastInputRef = useRef("keyboard");
  const audioCtxRef = useRef(null);
  const scrollBufferRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = () => {
      lastInputRef.current = "mouse";
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Decodifica o som de scroll na memória RAM
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    fetch(scrollSfxAudio)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((decodedBuffer) => {
        scrollBufferRef.current = decodedBuffer;
      })
      .catch(() => {});

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const playScrollSfx = useCallback(() => {
    if (!audioCtxRef.current || !scrollBufferRef.current) return;

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = scrollBufferRef.current;

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.min(1, Math.max(0, sfxVolume * 0.8));

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0, 0.05); // Pula 50ms do silêncio inicial
  }, [sfxVolume]);

  const playSfx = useCallback(
    (audioPath, volumeMult = 1) => {
      const sfx = new Audio(audioPath);
      sfx.volume = Math.min(1, Math.max(0, sfxVolume * volumeMult));
      sfx.play().catch(() => {});
    },
    [sfxVolume],
  );

  const handleNext = useCallback(() => {
    if (isConfirming) return;
    lastInputRef.current = "keyboard";
    playScrollSfx();
    setSelectedIndex((prev) => (prev + 1) % MENU_OPTIONS.length);
  }, [isConfirming, playScrollSfx]);

  const handlePrev = useCallback(() => {
    if (isConfirming) return;
    lastInputRef.current = "keyboard";
    playScrollSfx();
    setSelectedIndex(
      (prev) => (prev - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length,
    );
  }, [isConfirming, playScrollSfx]);

  const handleConfirm = useCallback(() => {
    if (isConfirming) return;
    setIsConfirming(true);

    const confirmSfx = new Audio(confirmSfxAudio);
    confirmSfx.volume = Math.min(1, sfxVolume * 0.8);
    confirmSfx.playbackRate = 1.35;
    confirmSfx.currentTime = 0.08;
    confirmSfx.play().catch(() => {});

    const yeahSfx = new Audio(yeahSfxAudio);
    yeahSfx.volume = Math.min(1, sfxVolume * 0.9);
    yeahSfx.currentTime = 0.05;
    yeahSfx.play().catch(() => {});

    const selectedOption = MENU_OPTIONS[selectedIndex].id;

    setTimeout(() => {
      onSelectMode(selectedOption);
    }, 400);
  }, [isConfirming, selectedIndex, sfxVolume, onSelectMode]);

  const handleCancel = useCallback(() => {
    if (isConfirming) return;
    playSfx(cancelSfxAudio);
    if (onBack) onBack();
  }, [isConfirming, playSfx, onBack]);

  const handleItemHover = (index) => {
    if (
      lastInputRef.current === "mouse" &&
      !isConfirming &&
      selectedIndex !== index
    ) {
      playScrollSfx();
      setSelectedIndex(index);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowDown":
        case "s":
        case "S":
          handleNext();
          break;
        case "ArrowUp":
        case "w":
        case "W":
          handlePrev();
          break;
        case "Enter":
        case " ":
          handleConfirm();
          break;
        case "Escape":
        case "Backspace":
          handleCancel();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleConfirm, handleCancel]);

  return (
    <div className="main-menu-container">
      <div className="menu-spacer" />

      <nav className="menu-options-list">
        {MENU_OPTIONS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.id}
              className={`menu-item ${isSelected ? "selected" : ""} ${
                isSelected && isConfirming ? "confirming" : ""
              }`}
              style={{ "--item-color": item.color }}
              onMouseEnter={() => handleItemHover(index)}
              onMouseMove={() => handleItemHover(index)}
              onClick={() => {
                lastInputRef.current = "mouse";
                if (selectedIndex !== index) setSelectedIndex(index);
                handleConfirm();
              }}
            >
              <span className="item-arrow-left">▶</span>
              <span className="item-text">{item.label}</span>
              <span className="item-arrow-right">◀</span>
            </button>
          );
        })}
      </nav>

      <footer className="menu-footer">
        <span>
          [W/S] ou [SETAS] Navegar &nbsp;|&nbsp; [ENTER] Selecionar
          &nbsp;|&nbsp; [ESC] Voltar
        </span>
      </footer>
    </div>
  );
}
