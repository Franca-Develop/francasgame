import React, { useState, useEffect } from "react";
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

import {
  loadSfx,
  installAutoplayUnlock,
  playLoopedMusic,
  fadeOutLoopedMusic,
} from "./utils/audioEngine";

import { saveHighScore, saveWeekHighScore } from "./utils/highScoreUtils";
import { WEEKS, ALL_FREEPLAY_SONGS } from "./data/songsData";

const LANE_ANIMATIONS = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];

export default function App() {
  const [selectedSongData, setSelectedSongData] = useState(null);
  const [currentScreen, setCurrentScreen] = useState("start");
  const [isHardWeekCompleted, setIsHardWeekCompleted] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState("NORMAL");
  const [weekPlaylist, setWeekPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [activeWeekId, setActiveWeekId] = useState(null);
  const [accumulatedWeekScore, setAccumulatedWeekScore] = useState(0);
  const [playerAnim, setPlayerAnim] = useState("idle");
  const [opponentAnim, setOpponentAnim] = useState("idle");

  // ---------- Settings globais ----------
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

  useEffect(() => {
    localStorage.setItem("rhythm_bgm_vol", bgmVolume.toString());
    localStorage.setItem("rhythm_sfx_vol", sfxVolume.toString());
    localStorage.setItem("rhythm_audio_offset", audioOffset.toString());
    localStorage.setItem("rhythm_keybinds", keybinds);
    localStorage.setItem("isDownscroll", JSON.stringify(isDownscroll));
  }, [bgmVolume, sfxVolume, audioOffset, keybinds, isDownscroll]);

  // ---------- Áudio ----------
  // Instala o destravador de autoplay UMA vez
  useEffect(() => {
    installAutoplayUnlock();
  }, []);

  // Carrega SFXs na RAM
  useEffect(() => {
    loadSfx("scroll", scrollSfxAudio);
    loadSfx("select", selectSfxAudio);
    loadSfx("cancel", cancelSfxAudio);
    loadSfx("yeah", yeahSfxAudio);
    loadSfx("countdown", countdownSfxAudio);
  }, []);

  // BGM do menu/settings via engine (preserva volumes e fade originais)
  useEffect(() => {
    if (currentScreen === "menu" || currentScreen === "settings") {
      const base = currentScreen === "menu" ? bgmVolume : bgmVolume * 0.35;
      const target = base * 0.25;
      playLoopedMusic({
        id: "menu",
        url: menuThemeAudio,
        volume: target,
        fadeMs: 400,
      });
    } else {
      fadeOutLoopedMusic("menu", 400);
    }
  }, [currentScreen, bgmVolume]);

  const loadSongAssets = async (item) => {
    const playerChartObj = item.playerChart || {};
    const opponentChartObj = item.opponentChart || playerChartObj;
    const songData = playerChartObj.song || playerChartObj;

    const songTitle = songData.title || item.id || "Untitled";
    const songBpm = songData.bpm ?? 120;
    const songSpeed = songData.speed ?? 1.7;

    return {
      id: item.id,
      title: songTitle,
      speed: songSpeed,
      bpm: songBpm,
      audioUrl: item.audio,
      bgUrl: item.bg || null,
      playerChart: playerChartObj,
      opponentChart: opponentChartObj,
    };
  };

  const handleStartFromTitle = () => {
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
              transform: "translateX(60px)",
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
