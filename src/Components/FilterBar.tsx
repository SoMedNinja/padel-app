import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box
} from "@mui/material";
import { MatchFilter, MatchFilterType } from "../types";

interface FilterBarProps {
  filter: MatchFilter;
  setFilter: (filter: MatchFilter) => void;
}

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  const handleChange = (event: SelectChangeEvent) => {
    const type = event.target.value as MatchFilterType;
    if (type !== "range") {
      setFilter({ type });
      return;
    }
    setFilter({
      type,
      startDate: filter.startDate || "",
      endDate: filter.endDate || "",
    });
  };

  const handleDateChange = (key: "startDate" | "endDate", value: string) => {
    setFilter({
      type: "range",
      startDate: key === "startDate" ? value : filter.startDate || "",
      endDate: key === "endDate" ? value : filter.endDate || "",
    });
  };

  return (
    <Box className="filter-bar" sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      <FormControl size="small" sx={{ minWidth: 160, mt: 1 }}>
        <InputLabel
          id="filter-select-label"
          sx={{
            backgroundColor: 'var(--color-surface)',
            px: 0.5,
            ml: -0.5,
            '&.Mui-focused, &.MuiInputLabel-shrink': {
              ml: 0,
            }
          }}
        >
          Visa matcher
        </InputLabel>
        <Select
          labelId="filter-select-label"
          id="filter-select"
          value={filter.type}
          label="Visa matcher"
          onChange={handleChange}
          sx={{
            borderRadius: '12px',
            backgroundColor: 'var(--color-surface)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border)',
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
      {filter.type === "range" && (
        <div className="filter-date-range" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label className="muted" htmlFor="filter-start-date">
            Från
          </label>
          <input
            id="filter-start-date"
            type="date"
            value={filter.startDate || ""}
            onChange={(event) => handleDateChange("startDate", event.target.value)}
          />
          <label className="muted" htmlFor="filter-end-date">
            Till
          </label>
          <input
            id="filter-end-date"
            type="date"
            value={filter.endDate || ""}
            onChange={(event) => handleDateChange("endDate", event.target.value)}
          />
        </div>
      )}
    </Box>
  );
}
