// Gerenciador global de SFX via Web Audio API
let audioCtx = null;
const sfxBuffers = {};

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

// Pré-carrega o som em memória
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

// Toca o som pré-carregado instantaneamente
export function playSfx(name, volume = 1) {
  if (!sfxBuffers[name]) return;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = sfxBuffers[name];
  gainNode.gain.value = Math.min(1, Math.max(0, volume));

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(0);
}