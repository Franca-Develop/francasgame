// utils/highScoreUtils.js

// Retorna o recorde salvo para uma música e dificuldade específica
export const getHighScore = (songId, difficulty) => {
  const scores = JSON.parse(localStorage.getItem("fnf_highscores") || "{}");
  const key = `${songId}_${difficulty.toUpperCase()}`;
  return scores[key] || 0;
};

// Salva a nova pontuação apenas se for maior que o recorde anterior
export const saveHighScore = (songId, difficulty, score) => {
  const scores = JSON.parse(localStorage.getItem("fnf_highscores") || "{}");
  const key = `${songId}_${difficulty.toUpperCase()}`;
  const currentHigh = scores[key] || 0;

  if (score > currentHigh) {
    scores[key] = score;
    localStorage.setItem("fnf_highscores", JSON.stringify(scores));
    return score;
  }
  return currentHigh;
};

export const getWeekHighScore = (weekId, difficulty) => {
  const key = `hs_week_${weekId}_${difficulty.toUpperCase()}`;
  return parseInt(localStorage.getItem(key) || "0", 10);
};

export const saveWeekHighScore = (weekId, difficulty, newScore) => {
  const key = `hs_week_${weekId}_${difficulty.toUpperCase()}`;
  const currentScore = getWeekHighScore(weekId, difficulty);
  if (newScore > currentScore) {
    localStorage.setItem(key, newScore.toString());
  }
};