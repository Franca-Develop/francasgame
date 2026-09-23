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

import { WEEKS, ALL_FREEPLAY_SONGS } from "./data/songsData";

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

  const loadSongAssets = async (item) => {
    // 1. Recebe os objetos de Chart já parseados pelo Vite
    const playerChartObj = item.playerChart || {};
    const opponentChartObj = item.opponentChart || playerChartObj;

    // 2. Extrai as propriedades bpm, speed e title de dentro do 'song' do chart
    const songData = playerChartObj.song || playerChartObj;

    const songTitle = songData.title || item.id || "Untitled";
    const songBpm = songData.bpm ?? 120;
    const songSpeed = songData.speed ?? 1.7;

    // 3. Retorna o objeto completo para o GameCanvas
    return {
      id: item.id,
      title: songTitle,
      speed: songSpeed,
      bpm: songBpm,
      audioUrl: item.audio, // URL da música gerada pelo import
      bgUrl: item.bg || null, // URL do background gerada pelo import
      playerChart: playerChartObj, // Objeto JS com as notas do player
      opponentChart: opponentChartObj, // Objeto JS com as notas do oponente
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

  const handleNextSongInWeek = async (updatedTotalScore) => {
    const nextIndex = currentSongIndex + 1;

    if (nextIndex < weekPlaylist.length) {
      setCurrentSongIndex(nextIndex);

      const nextSongItem = weekPlaylist[nextIndex];
      const songPayload = await loadSongAssets(nextSongItem);
      setSelectedSongData({ ...songPayload, difficulty: currentDifficulty });
    } else {
      // Fim da semana
      saveWeekHighScore(activeWeekId, currentDifficulty, updatedTotalScore);
      setIsHardWeekCompleted(true);

      setWeekPlaylist([]);
      setActiveWeekId(null);
      setAccumulatedWeekScore(0);
      setCurrentScreen("menu");
    }
  };

  const handleSongComplete = async (finalScore) => {
    if (selectedSongData?.id) {
      saveHighScore(selectedSongData.id, currentDifficulty, finalScore);
    }

    if (activeWeekId && weekPlaylist.length > 0) {
      const totalSoFar = accumulatedWeekScore + finalScore;
      setAccumulatedWeekScore(totalSoFar);
      await handleNextSongInWeek(totalSoFar);
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
