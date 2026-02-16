import React, { useRef } from "react";
import { Box, Typography } from "@mui/material";

interface TargetCoordinate {
  x: number;
  y: number;
}

interface PadelCourtInteractionProps {
  onSelect: (coord: TargetCoordinate) => void;
  selectedCoord: TargetCoordinate | null;
  correctCoord?: TargetCoordinate;
  showResult?: boolean;
}

export default function PadelCourtInteraction({
  onSelect,
  selectedCoord,
  correctCoord,
  showResult,
}: PadelCourtInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showResult) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onSelect({ x, y });
  };

  return (
    <Box sx={{ width: "100%", textAlign: "center", my: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        Klicka på banan för att välja din målpunkt
      </Typography>
      <Box
        ref={containerRef}
        onClick={handleClick}
        sx={{
          width: "100%",
          aspectRatio: "10 / 20",
          maxWidth: 300,
          margin: "0 auto",
          bgcolor: "#2c3e50",
          border: "4px solid white",
          position: "relative",
          cursor: showResult ? "default" : "crosshair",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {/* Court lines */}
        {/* Net */}
        <Box sx={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, bgcolor: "rgba(255,255,255,0.8)" }} />
        {/* Service lines */}
        <Box sx={{ position: "absolute", top: "30%", left: 0, right: 0, height: 1, bgcolor: "rgba(255,255,255,0.5)" }} />
        <Box sx={{ position: "absolute", top: "70%", left: 0, right: 0, height: 1, bgcolor: "rgba(255,255,255,0.5)" }} />
        {/* Center line */}
        <Box sx={{ position: "absolute", top: "30%", bottom: "70%", left: "50%", width: 1, bgcolor: "rgba(255,255,255,0.5)" }} />
        <Box sx={{ position: "absolute", top: "70%", bottom: "30%", left: "50%", width: 1, bgcolor: "rgba(255,255,255,0.5)" }} />

        {/* Selected target */}
        {selectedCoord && (
          <Box
            sx={{
              position: "absolute",
              left: `${selectedCoord.x}%`,
              top: `${selectedCoord.y}%`,
              width: 16,
              height: 16,
              bgcolor: "primary.main",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid white",
              boxShadow: 3,
              zIndex: 10,
            }}
          />
        )}

        {/* Correct target (shown after submission) */}
        {showResult && correctCoord && (
          <Box
            sx={{
              position: "absolute",
              left: `${correctCoord.x}%`,
              top: `${correctCoord.y}%`,
              width: 20,
              height: 20,
              bgcolor: "success.main",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid white",
              boxShadow: 3,
              zIndex: 9,
              opacity: 0.8,
              "&::after": {
                content: '""',
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: "50%",
                border: "2px solid white",
                animation: "pulse 1.5s infinite",
              },
              "@keyframes pulse": {
                "0%": { transform: "scale(1)", opacity: 1 },
                "100%": { transform: "scale(1.5)", opacity: 0 },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}
