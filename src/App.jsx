import React, { useState, useEffect, useRef } from "react";
import StartScreen from "./components/StartScreen/StartScreen";
import MainMenu from "./components/MainMenu/MainMenu";
import StoryModeMenu from "./components/StoryModeMenu/StoryModeMenu"
import FreeplayMenu from "./components/FreeplayMenu/FreeplayMenu";
import SettingsMenu from "./components/SettingsMenu/SettingsMenu";

// Músicas e SFX
import menuThemeAudio from "./assets/audio/music/menu-theme.mp3";
import scrollSfxAudio from "./assets/audio/sfx/scroll-sfx.mp3";
import selectSfxAudio from "./assets/audio/sfx/select-sfx.mp3";
import cancelSfxAudio from "./assets/audio/sfx/cancel-sfx.mp3";

// Utilitário Web Audio API para carregar SFX na RAM com latência zero
import { loadSfx } from "./utils/sfxManager";

export default function App() {
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

  // Pré-carrega os Efeitos Sonoros (SFX) na RAM ao abrir o jogo
  useEffect(() => {
    loadSfx("scroll", scrollSfxAudio);
    loadSfx("select", selectSfxAudio);
    loadSfx("cancel", cancelSfxAudio);
  }, []);

  // Web Audio API Ref Global para a Música do Menu
  const audioCtxRef = useRef(null);
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Instancia a Web Audio API Global para BGM (Executado 1 vez)
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

    // Inicializa o volume zerado
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);

    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Controle Inteligente do BGM por Tela
  useEffect(() => {
    if (!audioCtxRef.current || !gainNodeRef.current || !audioRef.current)
      return;

    const ctx = audioCtxRef.current;
    const gainNode = gainNodeRef.current;
    const audio = audioRef.current;
    const targetVol = bgmVolume * 0.25;

    if (currentScreen === "menu" || currentScreen === "settings") {
      // Destrava o contexto caso o navegador tenha suspenso o áudio
      if (ctx.state === "suspended") {
        ctx.resume();
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
      // Tela 'start', 'story' ou 'freeplay' -> silencia a música do menu
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
          onBack={() => setCurrentScreen("menu")}
        />
      )}

      {currentScreen === "story" && (
  <StoryModeMenu
    sfxVolume={sfxVolume}
    onSelectWeek={({ week, difficulty, tracks }) => {
      console.log(`Iniciando ${week} na dificuldade ${difficulty}`, tracks);
      // Quando criar a engine de jogo, troque por: setCurrentScreen("gameplay");
    }}
    onBack={() => setCurrentScreen("menu")}
  />
)}

      {currentScreen === "freeplay" && (
        <FreeplayMenu
          sfxVolume={sfxVolume}
          isSecretUnlocked={isHardWeekCompleted}
          onSelectSong={({ song, difficulty }) => {
            console.log(`Iniciando ${song.name} no modo ${difficulty}`);
            // Quando implementar o jogo, troque para: setCurrentScreen('gameplay');
          }}
          onBack={() => setCurrentScreen("menu")}
        />
      )}
    </div>
  );
}