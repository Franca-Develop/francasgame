// src/contexts/ProgressContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { loadProgress, persistProgress } from "../utils/migrateStorage";

const ProgressContext = createContext(null);

const keyOf = (id, difficulty) =>
  `${id}_${(difficulty || "NORMAL").toUpperCase()}`;

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(() => loadProgress());
  // Toggle de DEBUG (não persiste — F5 reseta). Útil pra testar músicas secretas.
  const [debugUnlockSecrets, setDebugUnlockSecrets] = useState(false);

  useEffect(() => {
    persistProgress(progress);
  }, [progress]);

  // ---------- Getters ----------
  const getSongHighScore = useCallback(
    (songId, difficulty) =>
      progress.songHighScores[keyOf(songId, difficulty)] || 0,
    [progress.songHighScores],
  );

  const getWeekHighScore = useCallback(
    (weekId, difficulty) =>
      progress.weekHighScores[keyOf(weekId, difficulty)] || 0,
    [progress.weekHighScores],
  );

  const isWeekCompleted = useCallback(
    (weekId, difficulty) =>
      Boolean(progress.completedWeeks[keyOf(weekId, difficulty)]),
    [progress.completedWeeks],
  );

  // ---------- Setters ----------
  const recordSongScore = useCallback((songId, difficulty, score) => {
    const key = keyOf(songId, difficulty);
    setProgress((prev) => {
      const current = prev.songHighScores[key] || 0;
      if (score <= current) return prev;
      return {
        ...prev,
        songHighScores: { ...prev.songHighScores, [key]: score },
      };
    });
  }, []);

  const recordWeekScore = useCallback((weekId, difficulty, score) => {
    const key = keyOf(weekId, difficulty);
    setProgress((prev) => {
      const current = prev.weekHighScores[key] || 0;
      if (score <= current) return prev;
      return {
        ...prev,
        weekHighScores: { ...prev.weekHighScores, [key]: score },
      };
    });
  }, []);

  const markWeekCompleted = useCallback((weekId, difficulty) => {
    const key = keyOf(weekId, difficulty);
    setProgress((prev) => {
      if (prev.completedWeeks[key]) return prev;
      return {
        ...prev,
        completedWeeks: { ...prev.completedWeeks, [key]: true },
      };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ songHighScores: {}, weekHighScores: {}, completedWeeks: {} });
    setDebugUnlockSecrets(false);
  }, []);

  const toggleDebugSecret = useCallback(() => {
    setDebugUnlockSecrets((prev) => !prev);
  }, []);

  // ---------- Derivado ----------
  // Regra atual: qualquer semana completada em HARD destrava secretas.
  // Regra futura (anotada): todas as semanas em HARD → trocar `some` por `every`.
  const isSecretUnlocked = useMemo(() => {
    if (debugUnlockSecrets) return true;
    return Object.keys(progress.completedWeeks).some((k) =>
      k.endsWith("_HARD"),
    );
  }, [progress.completedWeeks, debugUnlockSecrets]);

  const value = useMemo(
    () => ({
      songHighScores: progress.songHighScores,
      weekHighScores: progress.weekHighScores,
      completedWeeks: progress.completedWeeks,
      isSecretUnlocked,
      getSongHighScore,
      getWeekHighScore,
      isWeekCompleted,
      recordSongScore,
      recordWeekScore,
      markWeekCompleted,
      resetProgress,
      toggleDebugSecret,
    }),
    [
      progress,
      isSecretUnlocked,
      getSongHighScore,
      getWeekHighScore,
      isWeekCompleted,
      recordSongScore,
      recordWeekScore,
      markWeekCompleted,
      resetProgress,
      toggleDebugSecret,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx)
    throw new Error("useProgress deve ser usado dentro de <ProgressProvider>");
  return ctx;
}
