import React, { useState, useEffect, useRef } from "react";
import StartScreen from "./components/StartScreen/StartScreen";
import MainMenu from "./components/MainMenu/MainMenu";
import OptionsMenu from "./components/OptionsMenu/OptionsMenu";

import menuThemeAudio from "./assets/audio/music/menu-theme.mp3";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("start");

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

  // Adicione junto com os outros estados Globais:
  const [keybinds, setKeybinds] = useState(() => {
    return localStorage.getItem("rhythm_keybinds") || "SETAS";
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

  // Web Audio API Ref Global para a Música do Menu
  const audioCtxRef = useRef(null);
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Instancia a Web Audio API Global (Executado 1 vez)
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

    if (currentScreen === "menu" || currentScreen === "options") {
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
        if (currentScreen !== "menu" && currentScreen !== "options") {
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

      {currentScreen === "options" && (
        <OptionsMenu
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
        <div className="placeholder-screen">
          <h1>MODO HISTÓRIA</h1>
          <button onClick={() => setCurrentScreen("menu")}>
            VOLTAR AO MENU
          </button>
        </div>
      )}

      {currentScreen === "freeplay" && (
        <div className="placeholder-screen">
          <h1>FREEPLAY</h1>
          <button onClick={() => setCurrentScreen("menu")}>
            VOLTAR AO MENU
          </button>
        </div>
      )}
    </div>
  );
}
