// Gerenciador global de Áudio (SFX + BGM) via Web Audio API
let audioCtx = null;
const sfxBuffers = {};

// Variáveis de controle para a Música (BGM)
let musicBuffer = null;
let musicSource = null;
let musicGainNode = null;
let startTime = 0;
let pauseOffset = 0;
let isPlaying = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ==================== ÁREA DE SFX (Seu Código Original) ====================

export async function loadSfx(name, audioUrl) {
  try {
    const ctx = getAudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    sfxBuffers[name] = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error(`Erro ao carregar SFX (${name}):`, err);
  }
}

export function playSfx(name, volume = 1, rate = 1) {
  const buffer = sfxBuffers[name]; // Buffer pré-carregado
  if (!buffer || !sfxBuffers[name]) return;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = sfxBuffers[name];
  gainNode.gain.value = Math.min(1, Math.max(0, volume));

  source.playbackRate.value = rate;

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(0);
}

// ==================== ÁREA DE MÚSICA (BGM Gameplay) ====================

// Carrega o áudio da fase em memória
export async function loadSong(audioUrl) {
  try {
    const ctx = getAudioContext();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    musicBuffer = await ctx.decodeAudioData(arrayBuffer);
    pauseOffset = 0;
  } catch (err) {
    console.error(`Erro ao carregar Música (${audioUrl}):`, err);
  }
}

// Toca a música aplicando o controle de volume
export function playSong(volume = 1) {
  if (!musicBuffer || isPlaying) return;
  const ctx = getAudioContext();

  musicSource = ctx.createBufferSource();
  musicGainNode = ctx.createGain();

  musicSource.buffer = musicBuffer;
  musicGainNode.gain.value = Math.min(1, Math.max(0, volume));

  musicSource.connect(musicGainNode);
  musicGainNode.connect(ctx.destination);

  musicSource.start(0, pauseOffset);
  startTime = ctx.currentTime - pauseOffset;
  isPlaying = true;
}

// Pausa a música e salva a posição atual
export function pauseSong() {
  if (!isPlaying || !musicSource) return;
  const ctx = getAudioContext();

  musicSource.stop();
  pauseOffset = ctx.currentTime - startTime;
  isPlaying = false;
}

// Retorna o tempo exato da música em milissegundos para o GameCanvas
export function getSongPosition() {
  if (!isPlaying) return pauseOffset * 1000;
  const ctx = getAudioContext();
  return (ctx.currentTime - startTime) * 1000;
}

// Ajusta o volume da música em tempo real (para o SettingsMenu)
export function setMusicVolume(volume = 1) {
  if (musicGainNode && audioCtx) {
    musicGainNode.gain.value = Math.min(1, Math.max(0, volume));
  }
}

export async function ensureAudioContext() {
  const ctx = getAudioContext();

  // Só tenta reativar se estiver suspenso e NÃO estiver fechado
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      // Trata o cancelamento limpo caso a tela mude no meio do processo
    }
  }
  return ctx;
}