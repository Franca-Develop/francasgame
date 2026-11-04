// src/utils/scoreUtils.js
import { parseNotesArray } from "./chartUtils";

export function calculateSFC(songData) {
  if (!songData || !songData.playerChart) return 0;
  const notes = parseNotesArray(songData.playerChart, "player");
  return notes.length * 350;
}

export function calculateRank(score, sfc) {
  if (score === 0 || sfc === 0) return "Uncompleted";
  const percent = (score / sfc) * 100;
  if (percent >= 99) return "S+";
  if (percent >= 95) return "S";
  if (percent >= 80) return "A";
  if (percent >= 50) return "B";
  if (percent >= 25) return "C";
  if (percent >= 0.1) return "D";
  return "Uncompleted";
}

export function getRankColor(rank) {
  switch (rank) {
    case "S+":
      return "#FFD700";
    case "S":
      return "#00E5FF";
    case "A":
      return "#00FF66";
    case "B":
      return "#FFDE00";
    case "C":
      return "#FF9900";
    case "D":
      return "#FF3333";
    default:
      return "#AAAAAA";
  }
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
