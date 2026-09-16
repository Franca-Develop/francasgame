import React, { useState, useEffect, useRef } from "react";
import StartScreen from "./components/StartScreen/StartScreen";
import MainMenu from "./components/MainMenu/MainMenu";
import StoryModeMenu from "./components/StoryModeMenu/StoryModeMenu";
import FreeplayMenu from "./components/FreeplayMenu/FreeplayMenu";
import SettingsMenu from "./components/SettingsMenu/SettingsMenu";
import GameCanvas from "./components/GameCanvas/GameCanvas";
import CharacterCanvas from "./components/CharacterCanvas/CharacterCanvas";

// Músicas e SFX padrão do Menu
import menuThemeAudio from "./assets/audio/musics/menu-theme.mp3";
import scrollSfxAudio from "./assets/audio/sfx/scroll-sfx.mp3";
import selectSfxAudio from "./assets/audio/sfx/select-sfx.mp3";
import cancelSfxAudio from "./assets/audio/sfx/cancel-sfx.mp3";
import yeahSfxAudio from "./assets/audio/sfx/yeah-sfx.mp3";
import countdownSfxAudio from "./assets/audio/sfx/countdown-sfx.mp3";

import { loadSfx } from "./utils/useAudio";
import { saveHighScore, saveWeekHighScore } from "./utils/highScoreUtils";

const bgImages = import.meta.glob(
  "./assets/images/backgrounds/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
  },
);

// Carrega todos os arquivos JSON de charts na memória (igual feito com bgImages)
const chartFiles = import.meta.glob("./assets/charts/*.json", {
  eager: true,
  import: "default",
});

const LANE_ANIMATIONS = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];

export default function App() {
  const [selectedSongData, setSelectedSongData] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("start");
  const [isHardWeekCompleted, setIsHardWeekCompleted] = useState(false);

  // Estado global da dificuldade selecionada
  const [currentDifficulty, setCurrentDifficulty] = useState("NORMAL");

  // Fila de músicas para o Story Mode (Week)
  const [weekPlaylist, setWeekPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [activeWeekId, setActiveWeekId] = useState(null);
  const [accumulatedWeekScore, setAccumulatedWeekScore] = useState(0);

  // Estados para controlar qual animação o Boyfriend e o Opponent estão fazendo
  const [playerAnim, setPlayerAnim] = useState("idle");
  const [opponentAnim, setOpponentAnim] = useState("idle");

  // Estados Globais de Configurações
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

  // Salva no localStorage
  useEffect(() => {
    localStorage.setItem("rhythm_bgm_vol", bgmVolume.toString());
    localStorage.setItem("rhythm_sfx_vol", sfxVolume.toString());
    localStorage.setItem("rhythm_audio_offset", audioOffset.toString());
    localStorage.setItem("rhythm_keybinds", keybinds);
    localStorage.setItem("isDownscroll", JSON.stringify(isDownscroll));
  }, [bgmVolume, sfxVolume, audioOffset, keybinds, isDownscroll]);

  // Carrega SFXs na RAM
  useEffect(() => {
    loadSfx("scroll", scrollSfxAudio);
    loadSfx("select", selectSfxAudio);
    loadSfx("cancel", cancelSfxAudio);
    loadSfx("yeah", yeahSfxAudio);
    loadSfx("countdown", countdownSfxAudio);
  }, []);

  // Web Audio API para o BGM do Menu
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

  // Controle de volume do BGM entre telas
  useEffect(() => {
    if (!audioCtxRef.current || !gainNodeRef.current || !audioRef.current)
      return;

    const ctx = audioCtxRef.current;
    const gainNode = gainNodeRef.current;
    const audio = audioRef.current;
    const targetVol = bgmVolume * 0.25;

    if (currentScreen === "menu" || currentScreen === "settings") {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      if (audio.paused) audio.play().catch(() => {});

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

  const formatSongId = (str) =>
    str
      .toLowerCase()
      .replace(/[']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Função de depuração temporária para diagnosticar o carregamento dos charts
  const debugChartLoader = (
    songId,
    chartFiles,
    playerKeyFound,
    opponentKeyFound,
    playerNotes,
    opponentNotes,
  ) => {
    const availableKeys = Object.keys(chartFiles);

    console.group(`🔍 [DEBUG CHART] Diagnóstico para: "${songId}"`);
    console.log("📂 Chaves detectadas pelo Vite no diretório:", availableKeys);

    if (!playerKeyFound) {
      console.error(
        `❌ [FALHA] Chart do Player NÃO encontrado para "${songId}".\n` +
          `   Procurado por arquivo terminando em: "/${songId}-player.json"`,
      );
    } else if (playerNotes.length === 0) {
      console.warn(
        `⚠️ [AVISO] Arquivo "${playerKeyFound}" foi lido, mas a lista de notas está VAZIA.`,
      );
    } else {
      console.log(
        `✅ [SUCESSO] Player Chart carregado (${playerKeyFound}) - Total de notas: ${playerNotes.length}`,
      );
    }

    if (!opponentKeyFound) {
      console.warn(
        `⚠️ [AVISO] Chart do Oponente NÃO encontrado para "${songId}".`,
      );
    } else {
      console.log(
        `✅ [SUCESSO] Opponent Chart carregado (${opponentKeyFound}) - Total de notas: ${opponentNotes.length}`,
      );
    }

    console.groupEnd();
  };

  const loadSongAssets = async (item) => {
    const rawId =
      typeof item === "string" ? item : item.id || item.title || item.name;
    const songId =
      typeof item === "object" && item.id ? item.id : formatSongId(rawId);
    const songTitle =
      typeof item === "string" ? item : item.title || item.name || songId;

    const chartKeys = Object.keys(chartFiles);

    // Busca dinamicamente a chave terminando com o nome correto para evitar divergências de caminho
    const playerKey = chartKeys.find((key) =>
      key.toLowerCase().endsWith(`/${songId}-player.json`),
    );
    const opponentKey = chartKeys.find((key) =>
      key.toLowerCase().endsWith(`/${songId}-opponent.json`),
    );

    const rawPlayer = playerKey ? chartFiles[playerKey] : [];
    const rawOpponent = opponentKey ? chartFiles[opponentKey] : [];

    // Extrai array de notas tratando múltiplos formatos de JSON
    const extractNotes = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.notes)) return raw.notes;
      if (Array.isArray(raw?.playerNotes)) return raw.playerNotes;
      if (Array.isArray(raw?.opponentNotes)) return raw.opponentNotes;
      if (Array.isArray(raw?.song?.notes)) return raw.song.notes;
      return [];
    };

    const playerNotesArray = extractNotes(rawPlayer);
    const opponentNotesArray = extractNotes(rawOpponent);

    // Executa o diagnóstico no console
    debugChartLoader(
      songId,
      chartFiles,
      playerKey,
      opponentKey,
      playerNotesArray,
      opponentNotesArray,
    );

    const playerChart = { notes: playerNotesArray };
    const opponentChart = { notes: opponentNotesArray };

    const songSpeed =
      rawPlayer?.speed ??
      rawPlayer?.song?.speed ??
      (typeof item === "object" ? item.speed : undefined) ??
      1.7;

    const songBpm =
      rawPlayer?.bpm ??
      rawPlayer?.song?.bpm ??
      (typeof item === "object" ? item.bpm : undefined) ??
      120;

    const audioUrl = new URL(
      `./assets/audio/musics/${songId}.ogg`,
      import.meta.url,
    ).href;

    const bgKey = Object.keys(bgImages).find((path) =>
      path.toLowerCase().endsWith(`/${songId}.jpg`),
    );
    const bgUrl = bgKey ? bgImages[bgKey] : null;

    return {
      id: songId,
      title: songTitle,
      speed: songSpeed,
      bpm: songBpm,
      audioUrl,
      bgUrl,
      playerChart,
      opponentChart,
    };
  };

  const handleStartFromTitle = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setCurrentScreen("menu");
  };

  const handleStartGameplay = async (song) => {
    setWeekPlaylist([]);
    setActiveWeekId(null);
    setAccumulatedWeekScore(0);

    const diff = song?.difficulty || "NORMAL";
    setCurrentDifficulty(diff);

    const songPayload = await loadSongAssets(song);
    setSelectedSongData({ ...songPayload, difficulty: diff });
    setCurrentScreen("gameplay");
  };

  const handleStartWeek = async (weekData) => {
    const songList = weekData?.tracks || weekData?.songs;
    if (!songList || songList.length === 0) return;

    const diff = weekData?.difficulty || "NORMAL";
    setCurrentDifficulty(diff);
    setActiveWeekId(weekData.id || "week1");
    setAccumulatedWeekScore(0);
    setWeekPlaylist(songList);
    setCurrentSongIndex(0);

    const songPayload = await loadSongAssets(songList[0]);
    setSelectedSongData({ ...songPayload, difficulty: diff });
    setCurrentScreen("gameplay");
  };

  const handleNextSongInWeek = async () => {
    const nextIndex = currentSongIndex + 1;

    if (nextIndex < weekPlaylist.length) {
      const nextSongItem = weekPlaylist[nextIndex];
      setCurrentSongIndex(nextIndex);

      const songPayload = await loadSongAssets(nextSongItem);
      setSelectedSongData({ ...songPayload, difficulty: currentDifficulty });
    } else {
      setIsHardWeekCompleted(true);
      setWeekPlaylist([]);
      setCurrentScreen("menu");
    }
  };

  const handleSongComplete = async (finalScore) => {
    if (selectedSongData?.id) {
      saveHighScore(selectedSongData.id, currentDifficulty, finalScore);
    }

    if (activeWeekId && weekPlaylist.length > 0) {
      const totalSoFar = accumulatedWeekScore + finalScore;
      const nextIndex = currentSongIndex + 1;

      if (nextIndex < weekPlaylist.length) {
        setAccumulatedWeekScore(totalSoFar);
        setCurrentSongIndex(nextIndex);

        const nextSongItem = weekPlaylist[nextIndex];
        const songPayload = await loadSongAssets(nextSongItem);
        setSelectedSongData({ ...songPayload, difficulty: currentDifficulty });
      } else {
        saveWeekHighScore(activeWeekId, currentDifficulty, totalSoFar);
        setIsHardWeekCompleted(true);

        setWeekPlaylist([]);
        setActiveWeekId(null);
        setAccumulatedWeekScore(0);
        setCurrentScreen("menu");
      }
    } else {
      setCurrentScreen("menu");
    }
  };

  return (
    <div className="app-container">
      {currentScreen === "start" && (
        <StartScreen onStart={handleStartFromTitle} />
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
          onSelectWeek={(weekData) => handleStartWeek(weekData)}
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

      {currentScreen === "gameplay" && selectedSongData && (
        <div
          className="game-screen-wrapper"
          style={{ position: "relative", width: 1280, height: 720 }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: "translateX(60px)", // 👈 Ajuste este valor em pixels para mover mais à direita (ex: 40px, 60px, 100px)
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <CharacterCanvas
              playerAnim={playerAnim}
              opponentAnim={opponentAnim}
            />
          </div>
          <GameCanvas
            songData={selectedSongData}
            difficulty={currentDifficulty}
            isDownscroll={isDownscroll}
            keybinds={keybinds}
            bgmVolume={bgmVolume}
            audioOffset={audioOffset}
            onPlayerHit={(lane) => setPlayerAnim(LANE_ANIMATIONS[lane])}
            onOpponentHit={(lane) => setOpponentAnim(LANE_ANIMATIONS[lane])}
            onExit={() => {
              setWeekPlaylist([]);
              setCurrentScreen("menu");
            }}
            onComplete={handleSongComplete}
          />
        </div>
      )}
    </div>
  );
}
