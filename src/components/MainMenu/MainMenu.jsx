import React, { useState, useEffect, useCallback, useRef } from "react";
import "./MainMenu.css";

// Importa o gerenciador global de SFX via Web Audio API
import { playSfx } from "../../utils/sfxManager";

const MENU_OPTIONS = [
  { id: "story", label: "STORY MODE", color: "#FF0055" },
  { id: "freeplay", label: "FREEPLAY", color: "#FFDE00" },
  { id: "settings", label: "SETTINGS", color: "#00E5FF" },
];

export default function MainMenu({ sfxVolume = 0.7, onSelectMode, onBack }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);

  const lastInputRef = useRef("keyboard");

  useEffect(() => {
    const handleMouseMove = () => {
      lastInputRef.current = "mouse";
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleNext = useCallback(() => {
    if (isConfirming) return;
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume * 0.8);
    setSelectedIndex((prev) => (prev + 1) % MENU_OPTIONS.length);
  }, [isConfirming, sfxVolume]);

  const handlePrev = useCallback(() => {
    if (isConfirming) return;
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume * 0.8);
    setSelectedIndex(
      (prev) => (prev - 1 + MENU_OPTIONS.length) % MENU_OPTIONS.length,
    );
  }, [isConfirming, sfxVolume]);

  const handleConfirm = useCallback(() => {
    if (isConfirming) return;
    setIsConfirming(true);

    // Toca os efeitos de confirmação instantaneamente
    playSfx("select", sfxVolume * 0.8);
    playSfx("yeah", sfxVolume * 0.9);

    const selectedOption = MENU_OPTIONS[selectedIndex].id;

    setTimeout(() => {
      onSelectMode(selectedOption);
    }, 400);
  }, [isConfirming, selectedIndex, sfxVolume, onSelectMode]);

  const handleCancel = useCallback(() => {
    if (isConfirming) return;
    playSfx("cancel", sfxVolume);
    if (onBack) onBack();
  }, [isConfirming, sfxVolume, onBack]);

  const handleItemHover = (index) => {
    if (
      lastInputRef.current === "mouse" &&
      !isConfirming &&
      selectedIndex !== index
    ) {
      playSfx("scroll", sfxVolume * 0.8);
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