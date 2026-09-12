import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SettingsMenu.css";

// Importa o utilitário de SFX com latência zero
import { playSfx } from "../../utils/useAudio";

const KEYBIND_PRESETS = ["ARROWS", "WASD", "DFJK"];

export default function SettingsMenu({
  bgmVolume,
  setBgmVolume,
  sfxVolume,
  setSfxVolume,
  audioOffset,
  setAudioOffset,
  keybinds,
  setKeybinds,
  isDownscroll,
  setIsDownscroll,
  onBack,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lastInputRef = useRef("keyboard");
  const selectedItemRef = useRef(null);

  const OPTIONS = [
    { id: "bgm", label: "MUSIC" },
    { id: "sfx", label: "SFX" },
    { id: "offset", label: "AUDIO OFFSET" },
    { id: "controls", label: "CONTROLS" },
    { id: "scroll", label: "SCROLL" },
    { id: "back", label: "BACK" },
  ];

  useEffect(() => {
    const handleMouseMove = () => {
      lastInputRef.current = "mouse";
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Efeito para rolar suavemente a tela acompanhando a seleção
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const changeValue = useCallback(
    (direction) => {
      const option = OPTIONS[selectedIndex].id;
      playSfx("scroll", sfxVolume);

      if (option === "bgm") {
        setBgmVolume((prev) =>
          Math.min(
            1,
            Math.max(0, parseFloat((prev + direction * 0.1).toFixed(1))),
          ),
        );
      } else if (option === "sfx") {
        setSfxVolume((prev) =>
          Math.min(
            1,
            Math.max(0, parseFloat((prev + direction * 0.1).toFixed(1))),
          ),
        );
      } else if (option === "offset") {
        setAudioOffset((prev) =>
          Math.min(500, Math.max(-500, prev + direction * 5)),
        );
      } else if (option === "controls") {
        setKeybinds((prev) => {
          const currentIndex = KEYBIND_PRESETS.indexOf(prev);
          const safeIndex = currentIndex === -1 ? 0 : currentIndex;
          const nextIndex =
            (safeIndex + direction + KEYBIND_PRESETS.length) %
            KEYBIND_PRESETS.length;
          return KEYBIND_PRESETS[nextIndex];
        });
      } else if (option === "scroll") {
        setIsDownscroll((prev) => !prev);
      }
    },
    [
      selectedIndex,
      OPTIONS,
      sfxVolume,
      setBgmVolume,
      setSfxVolume,
      setAudioOffset,
      setKeybinds,
      setIsDownscroll,
    ],
  );

  const handleNext = useCallback(() => {
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume);
    setSelectedIndex((prev) => (prev + 1) % OPTIONS.length);
  }, [OPTIONS.length, sfxVolume]);

  const handlePrev = useCallback(() => {
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume);
    setSelectedIndex((prev) => (prev - 1 + OPTIONS.length) % OPTIONS.length);
  }, [OPTIONS.length, sfxVolume]);

  const handleConfirm = useCallback(() => {
    const currentId = OPTIONS[selectedIndex].id;
    if (currentId === "back") {
      playSfx("cancel", sfxVolume);
      onBack();
    } else {
      playSfx("select", sfxVolume);
      changeValue(1);
    }
  }, [selectedIndex, OPTIONS, onBack, changeValue, sfxVolume]);

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
        case "ArrowLeft":
        case "a":
        case "A":
          changeValue(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          changeValue(1);
          break;
        case "Enter":
        case " ":
          handleConfirm();
          break;
        case "Escape":
        case "Backspace":
          playSfx("cancel", sfxVolume);
          onBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, changeValue, handleConfirm, onBack, sfxVolume]);

  const handleHover = (index) => {
    if (lastInputRef.current === "mouse" && selectedIndex !== index) {
      playSfx("scroll", sfxVolume);
      setSelectedIndex(index);
    }
  };

  const renderValueControl = (id) => {
    if (id === "bgm") {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <div className="bar-container">
            <div
              className="bar-fill"
              style={{ width: `${bgmVolume * 100}%` }}
            />
          </div>
          <span>{Math.round(bgmVolume * 100)}%</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === "sfx") {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <div className="bar-container">
            <div
              className="bar-fill sfx-fill"
              style={{ width: `${sfxVolume * 100}%` }}
            />
          </div>
          <span>{Math.round(sfxVolume * 100)}%</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === "offset") {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <span className="offset-value">
            {audioOffset > 0 ? `+${audioOffset}` : audioOffset} ms
          </span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === "controls") {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <span className="preset-value">{keybinds}</span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    if (id === "scroll") {
      return (
        <div className="option-control">
          <button onClick={() => changeValue(-1)}>◀</button>
          <span className="preset-value">
            {isDownscroll ? "DOWNSCROLL" : "UPSCROLL"}
          </span>
          <button onClick={() => changeValue(1)}>▶</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="options-container">
      <h1 className="options-title">SETTINGS</h1>

      <div className="options-left-list">
        {OPTIONS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.id}
              ref={isSelected ? selectedItemRef : null}
              className={`option-row ${isSelected ? "selected" : ""}`}
              onMouseEnter={() => handleHover(index)}
              onMouseMove={() => handleHover(index)}
              onClick={() => {
                lastInputRef.current = "mouse";
                setSelectedIndex(index);
                if (item.id === "back") handleConfirm();
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
