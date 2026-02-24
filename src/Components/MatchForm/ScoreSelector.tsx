import { Box, Button, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface ScoreSelectorProps {
  value: string;
  onChange: (val: string) => void;
  showExtraScores: boolean;
  setShowExtraScores: (show: boolean) => void;
  disabled?: boolean;
}

export default function ScoreSelector({
  value,
  onChange,
  showExtraScores,
  setShowExtraScores,
  disabled = false,
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
      <Box
        role="radiogroup"
        aria-label="Välj poäng"
        sx={{ display: "contents" }}
      >
        {mainScores.map((s) => (
          <Button
            key={s}
            role="radio"
            variant={value === s ? "contained" : "outlined"}
            onClick={() => {
              onChange(s);
              navigator.vibrate?.(10);
            }}
            disabled={disabled}
            aria-label={`Poäng: ${s}`}
            aria-checked={value === s}
            sx={{
              minWidth: 50,
              height: 50,
              fontSize: "1.2rem",
              borderRadius: "50%",
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
                boxShadow: (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
              }
            }}
          >
            {s}
          </Button>
        ))}
        {showExtraScores &&
          extraScores.map((s) => (
            <Button
              key={s}
              role="radio"
              variant={value === s ? "contained" : "outlined"}
              onClick={() => {
                onChange(s);
                navigator.vibrate?.(10);
              }}
              disabled={disabled}
              aria-label={`Poäng: ${s}`}
              aria-checked={value === s}
              sx={{
                minWidth: 50,
                height: 50,
                fontSize: "1.2rem",
                borderRadius: "50%",
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                  boxShadow: (theme) => `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                }
              }}
            >
              {s}
            </Button>
          ))}
      </Box>
      {!showExtraScores ? (
        <Tooltip title="Visa fler poängalternativ (8–12)" arrow>
          <span>
            <Button
              variant="outlined"
              onClick={() => setShowExtraScores(true)}
              aria-label="Visa fler poängalternativ"
              disabled={disabled}
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
          </span>
        </Tooltip>
      ) : (
        <Tooltip title="Visa färre poängalternativ (0–7)" arrow>
          <span>
            <Button
              variant="outlined"
              onClick={() => setShowExtraScores(false)}
              aria-label="Visa färre poängalternativ"
              disabled={disabled}
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
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
