// src/utils/migrateStorage.js
// Migração centralizada de localStorage. Idempotente.
// Cada domínio (settings, progress) tem sua chave frrt_* versionada.

const SETTINGS_KEY = "frrt_settings";
const CURRENT_VERSION = 1;

const SETTINGS_DEFAULTS = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  audioOffset: 0,
  keybinds: "ARROWS",
  isDownscroll: false,
};

const LEGACY_SETTINGS_KEYS = {
  bgmVolume: "rhythm_bgm_vol",
  sfxVolume: "rhythm_sfx_vol",
  audioOffset: "rhythm_audio_offset",
  keybinds: "rhythm_keybinds",
  isDownscroll: "isDownscroll",
};

const VALID_KEYBINDS = ["ARROWS", "WASD", "DFJK"];

function safeParseNum(str, fallback) {
  if (str === null) return fallback;
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : fallback;
}

function safeParseInt(str, fallback) {
  if (str === null) return fallback;
  const n = parseInt(str, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeParseBool(str, fallback) {
  if (str === null) return fallback;
  try {
    return Boolean(JSON.parse(str));
  } catch {
    return fallback;
  }
}

/**
 * Carrega settings. Se frrt_settings existir, usa. Senão, migra de chaves legadas.
 * Sempre retorna o shape completo (com defaults preenchidos).
 */
export function loadSettings() {
  // 1. Tenta ler a versão nova
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { version, ...rest } = parsed;
      // Merge com defaults pra sobreviver a updates futuros
      return { ...SETTINGS_DEFAULTS, ...rest };
    }
  } catch (err) {
    console.warn(
      "[migrateStorage] frrt_settings corrompido, migrando de legado",
      err,
    );
  }

  // 2. Migra do legado (primeira vez ou recuperação)
  const migrated = {
    bgmVolume: safeParseNum(
      localStorage.getItem(LEGACY_SETTINGS_KEYS.bgmVolume),
      SETTINGS_DEFAULTS.bgmVolume,
    ),
    sfxVolume: safeParseNum(
      localStorage.getItem(LEGACY_SETTINGS_KEYS.sfxVolume),
      SETTINGS_DEFAULTS.sfxVolume,
    ),
    audioOffset: safeParseInt(
      localStorage.getItem(LEGACY_SETTINGS_KEYS.audioOffset),
      SETTINGS_DEFAULTS.audioOffset,
    ),
    keybinds: (() => {
      const k = localStorage.getItem(LEGACY_SETTINGS_KEYS.keybinds);
      return VALID_KEYBINDS.includes(k) ? k : SETTINGS_DEFAULTS.keybinds;
    })(),
    isDownscroll: safeParseBool(
      localStorage.getItem(LEGACY_SETTINGS_KEYS.isDownscroll),
      SETTINGS_DEFAULTS.isDownscroll,
    ),
  };

  // 3. Persiste na nova chave (com version)
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...migrated, version: CURRENT_VERSION }),
    );
  } catch (err) {
    console.warn("[migrateStorage] Falha ao salvar frrt_settings", err);
    return migrated; // mesmo assim retorna, não trava o app
  }

  // 4. Remove chaves legadas (só se a persistência acima deu certo)
  Object.values(LEGACY_SETTINGS_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  });

  return migrated;
}

export function persistSettings(settings) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...settings, version: CURRENT_VERSION }),
    );
  } catch (err) {
    console.warn("[migrateStorage] Falha ao persistir settings", err);
  }
}

// ============================================================
// PROGRESS (highscores + semanas concluídas + unlocks)
// ============================================================

const PROGRESS_KEY = "frrt_progress";
const PROGRESS_VERSION = 1;

const PROGRESS_DEFAULTS = {
  songHighScores: {},
  weekHighScores: {},
  completedWeeks: {},
};

const LEGACY_SONG_SCORES_KEY = "fnf_highscores";
const LEGACY_WEEK_SCORE_PREFIX = "hs_week_";

/**
 * Carrega progresso. Migra de fnf_highscores (objeto) e hs_week_* (chaves individuais)
 * na primeira vez. Idempotente.
 */
export function loadProgress() {
  // 1. Tenta frrt_progress
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const { version, ...rest } = parsed;
      return {
        ...PROGRESS_DEFAULTS,
        ...rest,
        songHighScores: { ...PROGRESS_DEFAULTS.songHighScores, ...(rest.songHighScores || {}) },
        weekHighScores: { ...PROGRESS_DEFAULTS.weekHighScores, ...(rest.weekHighScores || {}) },
        completedWeeks: { ...PROGRESS_DEFAULTS.completedWeeks, ...(rest.completedWeeks || {}) },
      };
    }
  } catch (err) {
    console.warn("[migrateStorage] frrt_progress corrompido, migrando de legado", err);
  }

  // 2. Migra fnf_highscores → songHighScores
  const songHighScores = {};
  try {
    const raw = localStorage.getItem(LEGACY_SONG_SCORES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.entries(parsed).forEach(([key, val]) => {
          if (typeof val === "number" && Number.isFinite(val) && val > 0) {
            songHighScores[key] = val;
          }
        });
      }
    }
  } catch (err) {
    console.warn("[migrateStorage] fnf_highscores corrompido", err);
  }

  // 3. Migra hs_week_<weekId>_<DIFF> → weekHighScores
  const weekHighScores = {};
  const legacyWeekKeys = [];
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(LEGACY_WEEK_SCORE_PREFIX)) {
        legacyWeekKeys.push(key);
        const composite = key.slice(LEGACY_WEEK_SCORE_PREFIX.length); // "week-1_NORMAL"
        const score = parseInt(localStorage.getItem(key) || "0", 10);
        if (Number.isFinite(score) && score > 0) {
          weekHighScores[composite] = score;
        }
      }
    });
  } catch (err) {
    console.warn("[migrateStorage] hs_week_* corrompido", err);
  }

  // 4. Persiste
  const migrated = { songHighScores, weekHighScores, completedWeeks: {} };
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ ...migrated, version: PROGRESS_VERSION })
    );
  } catch (err) {
    console.warn("[migrateStorage] Falha ao salvar frrt_progress", err);
    return migrated;
  }

  // 5. Remove legados (só se persistiu)
  try { localStorage.removeItem(LEGACY_SONG_SCORES_KEY); } catch { /* noop */ }
  legacyWeekKeys.forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  });

  return migrated;
}

export function persistProgress(progress) {
  try {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ ...progress, version: PROGRESS_VERSION })
    );
  } catch (err) {
    console.warn("[migrateStorage] Falha ao persistir progress", err);
  }
}