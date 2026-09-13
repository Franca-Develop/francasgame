import React, { useEffect, useRef } from "react";
import "./CharacterCanvas.css";

// Mapeamento de lanes para nomes de Animação estilo FNF
const LANE_ANIMATIONS = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];

export default function CharacterCanvas({
  playerAnim = "idle",
  opponentAnim = "idle",
  playerSpriteSrc,
  opponentSpriteSrc,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Espaço reservado para o Desenho do Opponent (Lado Esquerdo do Palco)
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      // Aqui você usará ctx.drawImage() quando carregar a Spritesheet do Opponent
      ctx.font = "20px sans-serif";
      ctx.fillText(`Opponent: ${opponentAnim}`, 200, 450);
      ctx.restore();

      // Espaço reservado para o Desenho do Player (Lado Direito do Palco)
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      // Aqui você usará ctx.drawImage() quando carregar a Spritesheet do BF / Player
      ctx.font = "20px sans-serif";
      ctx.fillText(`Player: ${playerAnim}`, 950, 450);
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playerAnim, opponentAnim]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="character-canvas"
    />
  );
}

export { LANE_ANIMATIONS };