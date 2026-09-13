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

import { loadSfx } from "./utils/useAudio";
import { saveHighScore, saveWeekHighScore } from "./utils/highScoreUtils";

const bgImages = import.meta.glob(
  "./assets/images/backgrounds/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
  },
);

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

  const loadSongAssets = async (item) => {
    const rawId =
      typeof item === "string" ? item : item.id || item.title || item.name;
    const songId =
      typeof item === "object" && item.id ? item.id : formatSongId(rawId);
    const songTitle =
      typeof item === "string" ? item : item.title || item.name || songId;

    let chartData = null;
    try {
      const chartModule = await import(`./assets/charts/${songId}.json`);
      chartData = chartModule.default;
    } catch (e) {
      console.error(
        `Erro ao carregar o chart 'src/assets/charts/${songId}.json':`,
        e,
      );
    }

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
      audioUrl,
      bgUrl,
      chartData,
    };
  };

  const handleStartFromTitle = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setCurrentScreen("menu");
  };

  // Iniciar modo Freeplay extraindo a dificuldade selecionada
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

  // Iniciar modo Story Mode extraindo a dificuldade da Semana
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

  // Avançar mantendo a dificuldade escolhida
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
    // 1. Salva a pontuação individual da música (Freeplay)
    if (selectedSongData?.id) {
      saveHighScore(selectedSongData.id, currentDifficulty, finalScore);
    }

    // 2. Se estiver jogando o Story Mode
    if (activeWeekId && weekPlaylist.length > 0) {
      const totalSoFar = accumulatedWeekScore + finalScore;
      const nextIndex = currentSongIndex + 1;

      if (nextIndex < weekPlaylist.length) {
        // Passa para a próxima música acumulando o placar
        setAccumulatedWeekScore(totalSoFar);
        setCurrentSongIndex(nextIndex);

        const nextSongItem = weekPlaylist[nextIndex];
        const songPayload = await loadSongAssets(nextSongItem);
        setSelectedSongData({ ...songPayload, difficulty: currentDifficulty });
      } else {
        // Semana FINALIZADA: Salva o recorde total da Semana
        saveWeekHighScore(activeWeekId, currentDifficulty, totalSoFar);
        setIsHardWeekCompleted(true);

        // Limpa a fila
        setWeekPlaylist([]);
        setActiveWeekId(null);
        setAccumulatedWeekScore(0);
        setCurrentScreen("menu");
      }
    } else {
      // Se for apenas uma música do Freeplay
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
          <CharacterCanvas
            playerAnim={playerAnim}
            opponentAnim={opponentAnim}
          />
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