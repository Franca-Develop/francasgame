// src/utils/chartUtils.js
export const parseNotesArray = (rawChart, targetSide = "player") => {
  if (!rawChart) return [];
  let extracted = [];
  const root = rawChart.song || rawChart.playerChart || rawChart;
  const notesData =
    root.notes || root.playerNotes || root.opponentNotes || root;
  if (!Array.isArray(notesData)) return [];

  const isFnfSectionFormat =
    notesData.length > 0 && Array.isArray(notesData[0]?.sectionNotes);

  if (isFnfSectionFormat) {
    notesData.forEach((section) => {
      const mustHit = section?.mustHitSection ?? true;
      const sectionNotes = section?.sectionNotes || [];
      sectionNotes.forEach((n) => {
        if (!Array.isArray(n) || n.length < 2) return;
        const rawTime = n[0];
        const rawLane = n[1];
        const duration = n[2] || 0;
        let isPlayerNote = rawLane >= 0 && rawLane <= 3 ? mustHit : !mustHit;
        if (
          (targetSide === "player" && isPlayerNote) ||
          (targetSide === "opponent" && !isPlayerNote)
        ) {
          extracted.push({
            time: rawTime < 100 ? rawTime * 1000 : rawTime,
            lane: rawLane % 4,
            duration: duration,
            type: duration > 0 ? "hold" : "note",
          });
        }
      });
    });
  } else {
    notesData.forEach((n) => {
      if (!n) return;
      const rawTime = n.time ?? n[0] ?? 0;
      const rawLane = n.lane ?? n[1] ?? 0;
      const duration = n.duration ?? n[2] ?? 0;
      const type = n.type || (duration > 0 ? "hold" : "note");
      extracted.push({
        time: rawTime < 100 ? rawTime * 1000 : rawTime,
        lane: rawLane % 4,
        duration: duration,
        type: type,
      });
    });
  }
  return extracted.sort((a, b) => a.time - b.time);
};
