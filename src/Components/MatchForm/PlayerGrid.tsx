import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  ButtonBase,
  Paper,
  Avatar,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  SearchOff as SearchOffIcon,
} from "@mui/icons-material";
import { GUEST_ID, GUEST_NAME } from "../../utils/guest";
import { getProfileDisplayName } from "../../utils/profileMap";
import { Profile } from "../../types";

interface PlayerGridProps {
  selectablePlayers: Profile[];
  registeredPlayerCount: number;
  query: string;
  setQuery: (query: string) => void;
  onSelect: (id: string) => void;
  selectedIds?: string[];
  excludeIds?: string[];
}

export default function PlayerGrid({
  selectablePlayers,
  registeredPlayerCount,
  query,
  setQuery,
  onSelect,
  selectedIds = [],
  excludeIds = [],
}: PlayerGridProps) {
  const sorted = [...selectablePlayers].sort((a, b) =>
    a.id === GUEST_ID
      ? -1
      : b.id === GUEST_ID
      ? 1
      : a.name.localeCompare(b.name)
  );
  const filtered = sorted.filter(
    (p) =>
      p.id === GUEST_ID ||
      getProfileDisplayName(p).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Box>
      {registeredPlayerCount >= 8 && (
        <TextField
          fullWidth
          size="small"
          label="Sök spelare"
          placeholder="Skriv namn..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setQuery("");
                      navigator.vibrate?.(10);
                    }}
                    aria-label="Rensa sökning"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              "aria-label": "Sök spelare",
            },
          }}
        />
      )}
      <Grid container spacing={1}>
        {filtered.map((p) => {
          const isSelected = selectedIds.includes(p.id) && p.id !== GUEST_ID;
          const isExcluded = excludeIds.includes(p.id) && p.id !== GUEST_ID;

          return (
            <Grid key={p.id} size={{ xs: 4, sm: 3 }}>
              <ButtonBase
                component={Paper}
                elevation={isSelected ? 4 : 1}
                aria-pressed={isSelected}
                aria-label={`Välj ${
                  p.id === GUEST_ID ? GUEST_NAME : getProfileDisplayName(p)
                }`}
                disabled={isExcluded}
                sx={{
                  p: 1.5,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  bgcolor: isSelected ? "primary.light" : "background.paper",
                  color: isSelected ? "primary.contrastText" : "text.primary",
                  opacity: isExcluded ? 0.5 : 1,
                  border: isSelected ? "2px solid" : "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  transition: "all 0.2s",
                  borderRadius: 1,
                  "&:hover": {
                    bgcolor: isExcluded
                      ? ""
                      : isSelected
                      ? "primary.light"
                      : "action.hover",
                  },
                }}
                onClick={() => onSelect(p.id)}
              >
                <Avatar
                  src={p.avatar_url || ""}
                  sx={{
                    width: 48,
                    height: 48,
                    mb: 1,
                    border: isSelected ? "2px solid #fff" : "none",
                  }}
                >
                  {p.name.charAt(0)}
                </Avatar>
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    fontWeight: isSelected ? 800 : 500,
                    wordBreak: "break-word",
                    lineHeight: 1.2,
                    height: "2.4em",
                    overflow: "hidden",
                  }}
                >
                  {p.id === GUEST_ID ? GUEST_NAME : getProfileDisplayName(p)}
                </Typography>
                {isSelected && (
                  <CheckCircleIcon
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      fontSize: 16,
                      color: "primary.main",
                    }}
                  />
                )}
              </ButtonBase>
            </Grid>
          );
        })}
      </Grid>
      {filtered.length === 0 && (
        <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
          <SearchOffIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">
            Inga spelare hittades för "{query}"
          </Typography>
        </Box>
      )}
    </Box>
  );
}
