// src/utils/audioEngine.js
// ÚNICO AudioContext do projeto. Todos os áudios passam por aqui.

let ctx = null;
let masterGain = null;
let sfxMasterGain = null;
let musicMasterGain = null;
let autoplayUnlockInstalled = false;

const sfxBuffers = new Map();
const activeSfx = new Set();
const loopedMusic = new Map();

// Guarda chamadas em andamento — evita double-play em StrictMode / concorrência
const pendingSfx = new Map();
const pendingLooped = new Map();

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    sfxMasterGain = ctx.createGain();
    musicMasterGain = ctx.createGain();
    sfxMasterGain.connect(masterGain);
    musicMasterGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export async function ensureAudioRunning() {
  const c = getCtx();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* noop */
    }
  }
  return c;
}

export function installAutoplayUnlock() {
  if (autoplayUnlockInstalled) return;
  autoplayUnlockInstalled = true;
  const unlock = () => {
    ensureAudioRunning();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

// ---------- Volume (master) ----------
export function setBgmVolume(v) {
  if (!musicMasterGain) return;
  musicMasterGain.gain.value = Math.max(0, Math.min(1, v));
}
export function setSfxVolume(v) {
  if (!sfxMasterGain) return;
  sfxMasterGain.gain.value = Math.max(0, Math.min(1, v));
}

// ---------- SFX ----------
export async function loadSfx(name, url) {
  if (sfxBuffers.has(name)) return;
  if (pendingSfx.has(name)) return pendingSfx.get(name);

  const promise = (async () => {
    try {
      const c = await ensureAudioRunning();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      sfxBuffers.set(name, await c.decodeAudioData(arr));
    } catch (err) {
      console.error(`[audioEngine] Erro carregando SFX "${name}":`, err);
    } finally {
      pendingSfx.delete(name);
    }
  })();

  pendingSfx.set(name, promise);
  return promise;
}

export function playSfx(name, volume = 1, rate = 1) {
  const buffer = sfxBuffers.get(name);
  if (!buffer) return;
  const c = getCtx();
  const source = c.createBufferSource();
  const gain = c.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = Math.max(0, Math.min(1, volume));
  source.connect(gain);
  gain.connect(sfxMasterGain);
  source.start(0);
  activeSfx.add(source);
  source.onended = () => {
    activeSfx.delete(source);
  };
}

export function stopAllSfx() {
  activeSfx.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* noop */
    }
  });
  activeSfx.clear();
}

// ---------- Looped Music ----------
function adjustLoopedVolume(track, volume, fadeMs) {
  const c = getCtx();
  const now = c.currentTime;
  const target = Math.max(0.0001, volume);
  track.gain.gain.cancelScheduledValues(now);
  track.gain.gain.setValueAtTime(track.gain.gain.value, now);
  track.gain.gain.linearRampToValueAtTime(target, now + fadeMs / 1000);
}

export async function playLoopedMusic({ id, url, volume = 1, fadeMs = 0 }) {
  // 1. Já tocando com mesma URL? Só ajusta volume.
  const existing = loopedMusic.get(id);
  if (existing && existing.url === url) {
    adjustLoopedVolume(existing, volume, fadeMs);
    return;
  }

  // 2. Já está carregando? Aguarda e ajusta (evita StrictMode double-play).
  if (pendingLooped.has(id)) {
    try {
      await pendingLooped.get(id);
    } catch {
      /* noop */
    }
    const loaded = loopedMusic.get(id);
    if (loaded && loaded.url === url) {
      adjustLoopedVolume(loaded, volume, fadeMs);
      return;
    }
    if (loaded) stopLoopedMusic(id);
  }

  // 3. Para o antigo se id tem URL diferente
  if (loopedMusic.has(id)) stopLoopedMusic(id);

  // 4. Carrega e toca
  const promise = (async () => {
    try {
      const c = await ensureAudioRunning();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buffer = await c.decodeAudioData(arr);

      // Re-checa: se durante o fetch alguém já iniciou, evita duplicar.
      const nowExisting = loopedMusic.get(id);
      if (nowExisting && nowExisting.url === url) {
        adjustLoopedVolume(nowExisting, volume, fadeMs);
        return;
      }

      const source = c.createBufferSource();
      const gain = c.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(musicMasterGain);

      const target = Math.max(0.0001, volume);
      if (fadeMs > 0) {
        gain.gain.setValueAtTime(0.0001, c.currentTime);
        gain.gain.linearRampToValueAtTime(
          target,
          c.currentTime + fadeMs / 1000,
        );
      } else {
        gain.gain.value = target;
      }

      source.start(0);
      loopedMusic.set(id, {
        source,
        gain,
        buffer,
        url,
        startedAt: c.currentTime,
      });
    } catch (err) {
      console.error(`[audioEngine] Erro carregando música "${id}":`, err);
    } finally {
      pendingLooped.delete(id);
    }
  })();

  pendingLooped.set(id, promise);
  await promise;
}

export function fadeOutLoopedMusic(id, ms = 400) {
  const track = loopedMusic.get(id);
  if (!track) return;
  const c = getCtx();
  const now = c.currentTime;
  track.gain.gain.cancelScheduledValues(now);
  track.gain.gain.setValueAtTime(track.gain.gain.value, now);
  track.gain.gain.linearRampToValueAtTime(0.0001, now + ms / 1000);
  try {
    track.source.stop(now + ms / 1000 + 0.05);
  } catch {
    /* noop */
  }
  loopedMusic.delete(id);
}

export function stopLoopedMusic(id) {
  const track = loopedMusic.get(id);
  if (!track) return;
  try {
    track.source.stop();
  } catch {
    /* noop */
  }
  loopedMusic.delete(id);
}

export function stopAllLoopedMusic(ms = 0) {
  if (ms > 0) {
    Array.from(loopedMusic.keys()).forEach((id) => fadeOutLoopedMusic(id, ms));
  } else {
    loopedMusic.forEach((t) => {
      try {
        t.source.stop();
      } catch {
        /* noop */
      }
    });
    loopedMusic.clear();
  }
}

// ---------- Gameplay Song (não-loop, posição precisa) ----------

let gameplayBuffer = null;
let gameplayBufferUrl = null;
let gameplaySource = null;
let gameplayGain = null;
let gameplayStartTime = 0;
let gameplayPauseOffset = 0;
let gameplayIsPlaying = false;
let gameplayDuration = 0;
const gameplayEndedCallbacks = new Set();
const pendingGameplayLoad = new Map();

export async function loadGameplaySong({ id, url }) {
  if (gameplayBufferUrl === url && gameplayBuffer) return;
  if (pendingGameplayLoad.has(url)) return pendingGameplayLoad.get(url);

  const promise = (async () => {
    try {
      const c = await ensureAudioRunning();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buffer = await c.decodeAudioData(arr);
      gameplayBuffer = buffer;
      gameplayBufferUrl = url;
      gameplayDuration = buffer.duration;
    } catch (err) {
      console.error(`[audioEngine] Erro carregando gameplay (${id}):`, err);
    } finally {
      pendingGameplayLoad.delete(url);
    }
  })();

  pendingGameplayLoad.set(url, promise);
  return promise;
}

export function playGameplaySong(volume = 1, offsetMs = 0) {
  if (!gameplayBuffer) {
    console.warn("[audioEngine] playGameplaySong: buffer não carregado");
    return false;
  }
  const c = getCtx();

  if (gameplaySource) {
    try {
      gameplaySource.onended = null;
      gameplaySource.stop();
    } catch {}
    gameplaySource = null;
  }

  gameplaySource = c.createBufferSource();
  gameplayGain = c.createGain();
  gameplaySource.buffer = gameplayBuffer;
  gameplaySource.loop = false;
  gameplayGain.gain.value = Math.max(0, Math.min(1, volume));
  gameplaySource.connect(gameplayGain);
  gameplayGain.connect(musicMasterGain);

  const offsetSec = Math.max(0, offsetMs / 1000);
  gameplaySource.start(0, offsetSec);
  gameplayStartTime = c.currentTime - offsetSec;
  gameplayIsPlaying = true;

  gameplaySource.onended = () => {
    if (!gameplayIsPlaying) return;
    gameplayIsPlaying = false;
    gameplayPauseOffset = gameplayDuration;
    gameplayEndedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        /* noop */
      }
    });
  };

  return true;
}

export function pauseGameplaySong() {
  if (!gameplayIsPlaying || !gameplaySource) return;
  const c = getCtx();
  gameplayPauseOffset = c.currentTime - gameplayStartTime;
  gameplayIsPlaying = false;
  try {
    gameplaySource.onended = null;
    gameplaySource.stop();
  } catch {}
  gameplaySource = null;
}

export function resumeGameplaySong(volume = 1) {
  if (gameplayBuffer) {
    playGameplaySong(volume, gameplayPauseOffset * 1000);
  }
}

export function stopGameplaySong() {
  if (gameplaySource) {
    try {
      gameplaySource.onended = null;
      gameplaySource.stop();
    } catch {}
    gameplaySource = null;
  }
  gameplayIsPlaying = false;
  gameplayPauseOffset = 0;
}

export function getGameplayPositionMs() {
  if (!gameplayIsPlaying) return gameplayPauseOffset * 1000;
  if (!ctx) return 0;
  return (ctx.currentTime - gameplayStartTime) * 1000;
}

export function getGameplayDurationMs() {
  return gameplayDuration * 1000;
}

export function setGameplayVolume(v) {
  if (!gameplayGain) return;
  gameplayGain.gain.value = Math.max(0, Math.min(1, v));
}

export function onGameplayEnded(cb) {
  gameplayEndedCallbacks.add(cb);
  return () => gameplayEndedCallbacks.delete(cb);
}
