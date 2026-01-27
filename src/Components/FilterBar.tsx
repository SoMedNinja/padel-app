import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box,
  TextField,
  Button
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { MatchFilter, MatchFilterType } from "../types";

interface FilterBarProps {
  filter: MatchFilter;
  setFilter: (filter: MatchFilter) => void;
}

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  // Note for non-coders: We pre-fill the "till" date with today so it's ready once a "från" date is chosen.
  const getTodayDateString = () => new Date().toISOString().slice(0, 10);

  const handleChange = (event: SelectChangeEvent) => {
    const type = event.target.value as MatchFilterType;
    if (type !== "range") {
      setFilter({ type });
      return;
    }
    setFilter({
      type,
      startDate: filter.startDate || "",
      endDate: filter.endDate || getTodayDateString(),
    });
  };

  const handleDateChange = (key: "startDate" | "endDate", value: string) => {
    const nextEndDate = key === "startDate" && !filter.endDate ? getTodayDateString() : filter.endDate || "";
    setFilter({
      type: "range",
      startDate: key === "startDate" ? value : filter.startDate || "",
      endDate: key === "endDate" ? value : nextEndDate,
    });
  };

  return (
    <Box className="filter-bar" sx={{ mb: 2, display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      <FormControl size="small" sx={{ minWidth: 160, mt: 1 }}>
        <InputLabel
          id="filter-select-label"
          sx={{
            // Note for non-coders: "background.paper" means "use the app's default surface color."
            backgroundColor: "background.paper",
            px: 0.5,
            ml: -0.5,
            "&.Mui-focused, &.MuiInputLabel-shrink": {
              ml: 0,
            }
          }}
        >
          {/* Note for non-coders: This text is the heading users see above the filter dropdown. */}
          Globalt filter
        </InputLabel>
        <Select
          labelId="filter-select-label"
          id="filter-select"
          value={filter.type}
          label="Globalt filter"
          onChange={handleChange}
          sx={{
            borderRadius: "12px",
            backgroundColor: "background.paper",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "divider",
            },
          }}
        >
          <MenuItem value="all">Alla matcher</MenuItem>
          <MenuItem value="short">Korta matcher</MenuItem>
          <MenuItem value="long">Långa matcher</MenuItem>
          <MenuItem value="tournaments">Turneringar</MenuItem>
          <MenuItem value="last7">Senaste 7 dagarna</MenuItem>
          <MenuItem value="last30">Senaste 30 dagarna</MenuItem>
          <MenuItem value="range">Datumintervall</MenuItem>
        </Select>
      </FormControl>
      {filter.type !== "all" && (
        <Button
          size="small"
          onClick={() => setFilter({ type: "all" })}
          startIcon={<CloseIcon />}
          sx={{ mt: 1, textTransform: "none", fontWeight: 700, borderRadius: "12px" }}
        >
          Rensa filter
        </Button>
      )}
      {filter.type === "range" && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
          <TextField
            id="filter-start-date"
            label="Från"
            type="date"
            size="small"
            value={filter.startDate || ""}
            onChange={(event) => handleDateChange("startDate", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            id="filter-end-date"
            label="Till"
            type="date"
            size="small"
            value={filter.endDate || ""}
            onChange={(event) => handleDateChange("endDate", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      )}
    </Box>
  );
}
