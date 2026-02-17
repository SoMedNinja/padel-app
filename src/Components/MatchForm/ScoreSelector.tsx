import { Box, Button, Tooltip } from "@mui/material";

interface ScoreSelectorProps {
  value: string;
  onChange: (val: string) => void;
  showExtraScores: boolean;
  setShowExtraScores: (show: boolean) => void;
}

export default function ScoreSelector({
  value,
  onChange,
  showExtraScores,
  setShowExtraScores,
}: ScoreSelectorProps) {
  const mainScores = ["0", "1", "2", "3", "4", "5", "6", "7"];
  const extraScores = ["8", "9", "10", "11", "12"];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        justifyContent: "center",
      }}
    >
      {mainScores.map((s) => (
        <Button
          key={s}
          variant={value === s ? "contained" : "outlined"}
          onClick={() => {
            onChange(s);
            navigator.vibrate?.(10);
          }}
          aria-label={`Välj resultat: ${s}`}
          aria-pressed={value === s}
          sx={{
            minWidth: 50,
            height: 50,
            fontSize: "1.2rem",
            borderRadius: "50%",
          }}
        >
          {s}
        </Button>
      ))}
      {showExtraScores &&
        extraScores.map((s) => (
          <Button
            key={s}
            variant={value === s ? "contained" : "outlined"}
            onClick={() => {
              onChange(s);
              navigator.vibrate?.(10);
            }}
            aria-label={`Välj resultat: ${s}`}
            aria-pressed={value === s}
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "1.2rem",
              borderRadius: "50%",
            }}
          >
            {s}
          </Button>
        ))}
      {!showExtraScores ? (
        <Tooltip title="Visa fler poängalternativ (8–12)" arrow>
          <Button
            variant="outlined"
            onClick={() => setShowExtraScores(true)}
            aria-label="Visa fler poängalternativ"
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "0.8rem",
              borderRadius: "50%",
              textTransform: "none",
            }}
          >
            Mer...
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Visa färre poängalternativ (0–7)" arrow>
          <Button
            variant="outlined"
            onClick={() => setShowExtraScores(false)}
            aria-label="Visa färre poängalternativ"
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "0.8rem",
              borderRadius: "50%",
              textTransform: "none",
            }}
          >
            Göm
          </Button>
        </Tooltip>
      )}
    </Box>
  );
}
