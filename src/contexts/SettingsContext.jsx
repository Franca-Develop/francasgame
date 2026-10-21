// src/contexts/SettingsContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { loadSettings, persistSettings } from "../utils/migrateStorage";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadSettings());

  // Persiste sempre que settings mudar
  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  // Setters compatíveis com useState: aceitam valor direto OU updater (prev => next)
  const setBgmVolume = useCallback((v) => {
    setSettings((prev) => ({
      ...prev,
      bgmVolume: typeof v === "function" ? v(prev.bgmVolume) : v,
    }));
  }, []);

  const setSfxVolume = useCallback((v) => {
    setSettings((prev) => ({
      ...prev,
      sfxVolume: typeof v === "function" ? v(prev.sfxVolume) : v,
    }));
  }, []);

  const setAudioOffset = useCallback((v) => {
    setSettings((prev) => ({
      ...prev,
      audioOffset: typeof v === "function" ? v(prev.audioOffset) : v,
    }));
  }, []);

  const setKeybinds = useCallback((v) => {
    setSettings((prev) => ({
      ...prev,
      keybinds: typeof v === "function" ? v(prev.keybinds) : v,
    }));
  }, []);

  const setIsDownscroll = useCallback((v) => {
    setSettings((prev) => ({
      ...prev,
      isDownscroll: typeof v === "function" ? v(prev.isDownscroll) : v,
    }));
  }, []);

  const value = useMemo(
    () => ({
      bgmVolume: settings.bgmVolume,
      sfxVolume: settings.sfxVolume,
      audioOffset: settings.audioOffset,
      keybinds: settings.keybinds,
      isDownscroll: settings.isDownscroll,
      setBgmVolume,
      setSfxVolume,
      setAudioOffset,
      setKeybinds,
      setIsDownscroll,
    }),
    [settings, setBgmVolume, setSfxVolume, setAudioOffset, setKeybinds, setIsDownscroll]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings deve ser usado dentro de <SettingsProvider>");
  return ctx;
}