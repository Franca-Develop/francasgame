import React, { useState, useEffect, useRef } from "react";
import StartScreen from "./components/StartScreen/StartScreen";
import MainMenu from "./components/MainMenu/MainMenu";
import StoryModeMenu from "./components/StoryModeMenu/StoryModeMenu";
import FreeplayMenu from "./components/FreeplayMenu/FreeplayMenu";
import SettingsMenu from "./components/SettingsMenu/SettingsMenu";
import GameCanvas from "./components/GameCanvas/GameCanvas";

// Importa o chart de testes genérico
import testChart from "./assets/charts/test-song.json";

// Músicas e SFX
import menuThemeAudio from "./assets/audio/musics/menu-theme.mp3";
import scrollSfxAudio from "./assets/audio/sfx/scroll-sfx.mp3";
import selectSfxAudio from "./assets/audio/sfx/select-sfx.mp3";
import cancelSfxAudio from "./assets/audio/sfx/cancel-sfx.mp3";
import yeahSfxAudio from "./assets/audio/sfx/yeah-sfx.mp3";

// Utilitário Web Audio API para carregar SFX na RAM com latência zero
import { loadSfx } from "./utils/useAudio";

export default function App() {
  const [selectedSongData, setSelectedSongData] = useState(null);

  // Dados padrão para a fase de testes
  const TEST_SONG_DATA = {
    id: "test-song",
    title: "Test Track",
    bpm: 120,
    scrollSpeed: 1.5,
    audioUrl: menuThemeAudio,
    chartData: testChart,
  };

  // Função genérica para iniciar o jogo a partir de qualquer menu
  const handleStartGameplay = (song) => {
    if (!song) {
      setSelectedSongData(TEST_SONG_DATA);
      setCurrentScreen("gameplay");
      return;
    }

    const fullSongData = {
      ...song,
      title: song.name,
      audioUrl: `/src/assets/audio/musics/${song.id}.mp3`,
      chartData: testChart,
    };

    setSelectedSongData(fullSongData);
    setCurrentScreen("gameplay");
  };

  const [currentScreen, setCurrentScreen] = useState("start");
  const [isHardWeekCompleted, setIsHardWeekCompleted] = useState(false);

  // Estados Globais de Áudio e Configurações
  const [bgmVolume, setBgmVolume] = useState(() => {
    const saved = localStorage.getItem("rhythm_bgm_vol");
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem("rhythm_sfx_vol");
    return saved !== null ? parseFloat(saved) : 0.7;
  });

  const [audioOffset, setAudioOffset] = useState(() => {
    const saved = localStorage.getItem("rhythm_audio_offset");
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [keybinds, setKeybinds] = useState(() => {
    return localStorage.getItem("rhythm_keybinds") || "ARROWS";
  });

  const [isDownscroll, setIsDownscroll] = useState(() => {
    const saved = localStorage.getItem("isDownscroll");
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Salva alterações no localStorage
  useEffect(() => {
    localStorage.setItem("rhythm_bgm_vol", bgmVolume.toString());
  }, [bgmVolume]);

  useEffect(() => {
    localStorage.setItem("rhythm_sfx_vol", sfxVolume.toString());
  }, [sfxVolume]);

  useEffect(() => {
    localStorage.setItem("rhythm_audio_offset", audioOffset.toString());
  }, [audioOffset]);

  useEffect(() => {
    localStorage.setItem("rhythm_keybinds", keybinds);
  }, [keybinds]);

  useEffect(() => {
    localStorage.setItem("isDownscroll", JSON.stringify(isDownscroll));
  }, [isDownscroll]);

  // Pré-carrega os SFX na RAM
  useEffect(() => {
    loadSfx("scroll", scrollSfxAudio);
    loadSfx("select", selectSfxAudio);
    loadSfx("cancel", cancelSfxAudio);
    loadSfx("yeah", yeahSfxAudio);
  }, []);

  // Web Audio API Ref Global para a Música do Menu
  const audioCtxRef = useRef(null);
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const audio = new Audio(menuThemeAudio);
    audio.loop = true;
    audioRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNodeRef.current = gainNode;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);

    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Controle do BGM por Tela
  useEffect(() => {
    if (!audioCtxRef.current || !gainNodeRef.current || !audioRef.current)
      return;

    const ctx = audioCtxRef.current;
    const gainNode = gainNodeRef.current;
    const audio = audioRef.current;
    const targetVol = bgmVolume * 0.25;

    if (currentScreen === "menu" || currentScreen === "settings") {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (audio.paused) {
        audio.play().catch(() => {});
      }

      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      const desiredVol =
        currentScreen === "menu" ? targetVol : targetVol * 0.35;
      gainNode.gain.linearRampToValueAtTime(
        Math.max(0.0001, desiredVol),
        ctx.currentTime + 0.4,
      );
    } else {
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      const timeoutId = setTimeout(() => {
        if (currentScreen !== "menu" && currentScreen !== "settings") {
          audio.pause();
        }
      }, 400);

      return () => clearTimeout(timeoutId);
    }
  }, [currentScreen, bgmVolume]);

  return (
    <div className="app-container">
      {currentScreen === "start" && (
        <StartScreen onStart={() => setCurrentScreen("menu")} />
      )}

      {currentScreen === "menu" && (
        <MainMenu
          sfxVolume={sfxVolume}
          onSelectMode={(mode) => setCurrentScreen(mode)}
          onBack={() => setCurrentScreen("start")}
        />
      )}

      {currentScreen === "settings" && (
        <SettingsMenu
          bgmVolume={bgmVolume}
          setBgmVolume={setBgmVolume}
          sfxVolume={sfxVolume}
          setSfxVolume={setSfxVolume}
          audioOffset={audioOffset}
          setAudioOffset={setAudioOffset}
          keybinds={keybinds}
          setKeybinds={setKeybinds}
          isDownscroll={isDownscroll}
          setIsDownscroll={setIsDownscroll}
          onBack={() => setCurrentScreen("menu")}
        />
      )}

      {currentScreen === "story" && (
        <StoryModeMenu
          sfxVolume={sfxVolume}
          onSelectWeek={(weekData) => handleStartGameplay(weekData)}
          onBack={() => setCurrentScreen("menu")}
        />
      )}

      {currentScreen === "freeplay" && (
        <FreeplayMenu
          sfxVolume={sfxVolume}
          isSecretUnlocked={isHardWeekCompleted}
          onToggleSecret={() => setIsHardWeekCompleted((prev) => !prev)}
          onStartSong={(song) => handleStartGameplay(song)}
          onBack={() => setCurrentScreen("menu")}
        />
      )}

      {currentScreen === "gameplay" && (
        <GameCanvas
          songData={selectedSongData || TEST_SONG_DATA}
          isDownscroll={isDownscroll}
          sfxVolume={sfxVolume}
          bgmVolume={bgmVolume}
          keybinds={keybinds}
          audioOffset={audioOffset}
          onExit={() => setCurrentScreen("menu")}
        />
      )}
    </div>
  );
}
