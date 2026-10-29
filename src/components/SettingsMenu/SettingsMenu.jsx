import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SettingsMenu.css";
import { playSfx } from "../../utils/audioEngine";

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

  const holdTimerRef = useRef(null);
  const holdCountRef = useRef(0);

  // RESET removido daqui
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

  useEffect(() => {
    const selectedEl = document.querySelector(`.option-row.selected`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedIndex]);

  const changeValue = useCallback(
    (direction, multiplier = 1) => {
      const option = OPTIONS[selectedIndex].id;
      playSfx("scroll", sfxVolume / 100);

      if (option === "bgm") {
        setBgmVolume((prev) =>
          Math.min(100, Math.max(0, prev + direction * multiplier)),
        );
      } else if (option === "sfx") {
        setSfxVolume((prev) =>
          Math.min(100, Math.max(0, prev + direction * multiplier)),
        );
      } else if (option === "offset") {
        setAudioOffset((prev) =>
          Math.min(500, Math.max(-500, prev + direction * multiplier)),
        );
      } else if (option === "controls") {
        if (multiplier > 1) return;
        setKeybinds((prev) => {
          const currentIndex = KEYBIND_PRESETS.indexOf(prev);
          const safeIndex = currentIndex === -1 ? 0 : currentIndex;
          const nextIndex =
            (safeIndex + direction + KEYBIND_PRESETS.length) %
            KEYBIND_PRESETS.length;
          return KEYBIND_PRESETS[nextIndex];
        });
      } else if (option === "scroll") {
        if (multiplier > 1) return;
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

  const startAcceleration = useCallback(
    (direction) => {
      changeValue(direction, 1);
      holdCountRef.current = 1;

      const tick = () => {
        holdCountRef.current += 1;
        let multiplier = 1;
        if (holdCountRef.current > 15) multiplier = 10;
        else if (holdCountRef.current > 5) multiplier = 5;

        changeValue(direction, multiplier);
        holdTimerRef.current = setTimeout(tick, 80);
      };

      holdTimerRef.current = setTimeout(tick, 400);
    },
    [changeValue],
  );

  const stopAcceleration = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdCountRef.current = 0;
  }, []);

  useEffect(() => {
    return () => stopAcceleration();
  }, [stopAcceleration]);

  const handleBarClick = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const newValue = Math.round(percent * 100);

    if (id === "bgm") setBgmVolume(newValue);
    if (id === "sfx") setSfxVolume(newValue);
    playSfx("select", sfxVolume / 100);
  };

  const handleNext = useCallback(() => {
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume / 100);
    setSelectedIndex((prev) => (prev + 1) % OPTIONS.length);
  }, [OPTIONS.length, sfxVolume]);

  const handlePrev = useCallback(() => {
    lastInputRef.current = "keyboard";
    playSfx("scroll", sfxVolume / 100);
    setSelectedIndex((prev) => (prev - 1 + OPTIONS.length) % OPTIONS.length);
  }, [OPTIONS.length, sfxVolume]);

  const handleConfirm = useCallback(() => {
    const currentId = OPTIONS[selectedIndex].id;
    if (currentId === "back") {
      playSfx("cancel", sfxVolume / 100);
      onBack();
    } else {
      playSfx("select", sfxVolume / 100);
      changeValue(1, 1);
    }
  }, [selectedIndex, OPTIONS, onBack, changeValue, sfxVolume]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

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
          startAcceleration(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          startAcceleration(1);
          break;
        case "Enter":
        case " ":
          handleConfirm();
          break;
        case "Escape":
        case "Backspace":
          playSfx("cancel", sfxVolume / 100);
          onBack();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D"].includes(e.key)) {
        stopAcceleration();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    handleNext,
    handlePrev,
    handleConfirm,
    onBack,
    sfxVolume,
    startAcceleration,
    stopAcceleration,
  ]);

  const handleHover = (index) => {
    if (lastInputRef.current === "mouse" && selectedIndex !== index) {
      playSfx("scroll", sfxVolume / 100);
      setSelectedIndex(index);
    }
  };

  const renderValueControl = (id) => {
    if (id === "bgm") {
      return (
        <div className="option-control">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(-1, 1);
            }}
          >
            ◀
          </button>
          <div
            className="bar-container"
            onClick={(e) => handleBarClick(e, "bgm")}
            style={{ cursor: "pointer" }}
          >
            <div className="bar-fill" style={{ width: `${bgmVolume}%` }} />
          </div>
          <span className="value-text">{Math.round(bgmVolume)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(1, 1);
            }}
          >
            ▶
          </button>
        </div>
      );
    }
    if (id === "sfx") {
      return (
        <div className="option-control">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(-1, 1);
            }}
          >
            ◀
          </button>
          <div
            className="bar-container"
            onClick={(e) => handleBarClick(e, "sfx")}
            style={{ cursor: "pointer" }}
          >
            <div
              className="bar-fill sfx-fill"
              style={{ width: `${sfxVolume}%` }}
            />
          </div>
          <span className="value-text">{Math.round(sfxVolume)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(1, 1);
            }}
          >
            ▶
          </button>
        </div>
      );
    }
    if (id === "offset") {
      return (
        <div className="option-control">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(-1, 1);
            }}
          >
            ◀
          </button>
          <span className="value-text">
            {audioOffset > 0 ? `+${audioOffset}` : audioOffset} ms
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(1, 1);
            }}
          >
            ▶
          </button>
        </div>
      );
    }
    if (id === "controls") {
      return (
        <div className="option-control">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(-1, 1);
            }}
          >
            ◀
          </button>
          <span className="value-text">{keybinds}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(1, 1);
            }}
          >
            ▶
          </button>
        </div>
      );
    }
    if (id === "scroll") {
      return (
        <div className="option-control">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              changeValue(1, 1);
            }}
          >
            {isDownscroll ? "DOWN ⇄" : "UP ⇄"}
          </button>
        </div>
      );
    }
    if (id === "back") {
      return (
        <div className="option-control">
          <span className="value-text">▶</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="options-container">
      <div className="options-list-wrapper">
        {OPTIONS.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={item.id}
              className={`option-row ${isSelected ? "selected" : ""}`}
              onMouseEnter={() => handleHover(index)}
              onMouseMove={() => handleHover(index)}
              onClick={() => {
                lastInputRef.current = "mouse";
                setSelectedIndex(index);
                if (item.id === "back") handleConfirm();
              }}
            >
              <div className="option-label">{item.label}</div>
              {renderValueControl(item.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
