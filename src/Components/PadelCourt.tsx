import React, { useRef } from "react";
import { Box } from "@mui/material";

interface PadelCourtProps {
  onTap: (x: number, y: number) => void;
  selectedTap: { x: number; y: number } | null;
  correctTap: { x: number; y: number } | null;
  showResult: boolean;
  imageUrl?: string;
}

const PadelCourt: React.FC<PadelCourtProps> = ({ onTap, selectedTap, correctTap, showResult, imageUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showResult || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onTap(x, y);
  };

  return (
    <Box
      ref={containerRef}
      onClick={handleClick}
      sx={{
        width: "100%",
        aspectRatio: "1/2",
        maxWidth: 300,
        margin: "0 auto",
        position: "relative",
        bgcolor: "#4CAF50", // Padel green
        border: "4px solid #fff",
        borderRadius: 2,
        overflow: "hidden",
        cursor: showResult ? "default" : "crosshair",
      }}
    >
      {/* If an image is provided, overlay it, otherwise use CSS lines */}
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
        />
      ) : (
        <>
          {/* Net */}
          <Box sx={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, bgcolor: "#fff" }} />
          {/* Service lines */}
          <Box sx={{ position: "absolute", top: "25%", left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.5)" }} />
          <Box sx={{ position: "absolute", top: "75%", left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.5)" }} />
          <Box sx={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 2, bgcolor: "rgba(255,255,255,0.5)" }} />
        </>
      )}

      {selectedTap && (
        <Box
          sx={{
            position: "absolute",
            left: `${selectedTap.x * 100}%`,
            top: `${selectedTap.y * 100}%`,
            width: 16,
            height: 16,
            borderRadius: "50%",
            bgcolor: showResult
              ? selectedTap?.x === correctTap?.x && selectedTap?.y === correctTap?.y
                ? "success.main"
                : "error.main"
              : "primary.main",
            transform: "translate(-50%, -50%)",
            border: "2px solid #fff",
            zIndex: 2,
          }}
        />
      )}

      {showResult && correctTap && (
        <Box
          sx={{
            position: "absolute",
            left: `${correctTap.x * 100}%`,
            top: `${correctTap.y * 100}%`,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px dashed #fff",
            bgcolor: "rgba(76, 175, 80, 0.4)",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.8 },
              "50%": { transform: "translate(-50%, -50%) scale(1.5)", opacity: 0.4 },
              "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.8 },
            },
          }}
        />
      )}
    </Box>
  );
};

export default PadelCourt;
