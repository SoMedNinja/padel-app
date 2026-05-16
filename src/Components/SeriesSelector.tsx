import React, { useMemo } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  alpha
} from "@mui/material";
import { useStore } from "../store/useStore";
import { getAvailableSeries } from "../utils/series";
import { Match } from "../types";
import { FilterList as FilterIcon } from "@mui/icons-material";

interface SeriesSelectorProps {
  matches: Match[];
}

export const SeriesSelector: React.FC<SeriesSelectorProps> = ({ matches }) => {
  const { selectedSeries, setSelectedSeries } = useStore();

  const seriesOptions = useMemo(() => getAvailableSeries(matches), [matches]);

  return (
    <Box sx={{
      mb: 3,
      p: 2,
      borderRadius: "16px",
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
      border: "1px solid",
      borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
      display: "flex",
      alignItems: "center",
      gap: 2
    }}>
      <Box sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: "10px",
        bgcolor: "primary.main",
        color: "primary.contrastText"
      }}>
        <FilterIcon />
      </Box>
      <FormControl fullWidth size="small">
        <InputLabel id="series-selector-label">Välj Serie</InputLabel>
        <Select
          labelId="series-selector-label"
          id="series-selector"
          value={selectedSeries}
          label="Välj Serie"
          onChange={(e) => setSelectedSeries(e.target.value)}
          sx={{
            borderRadius: "10px",
            bgcolor: "background.paper",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "primary.main",
            },
            fontWeight: 700
          }}
        >
          {seriesOptions.map((series) => (
            <MenuItem key={series} value={series}>
              {series}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
