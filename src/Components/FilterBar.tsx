import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box,
  TextField,
  Button,
  Tooltip,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Close as CloseIcon, Autorenew as ResetIcon } from "@mui/icons-material";
import { MatchFilter, MatchFilterType } from "../types";

interface FilterBarProps {
  filter: MatchFilter;
  setFilter: (filter: MatchFilter) => void;
}

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  // Note for non-coders: We pre-fill the "till" date with today so it's ready once a "från" date is chosen.
  const getTodayDateString = () => new Date().toISOString().slice(0, 10);
  // Note for non-coders: "isDefaultFilter" just means "show everything with no extra filtering."
  const isDefaultFilter = filter.type === "all";
  const filterLabels: Record<MatchFilterType, string> = {
    all: "Alla matcher",
    short: "Korta matcher",
    long: "Långa matcher",
    tournaments: "Turneringar",
    last7: "Senaste 7 dagar",
    last30: "Senaste 30 dagar",
    range: "Datumintervall",
  };

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
    <Box
      className="filter-bar"
      sx={{
        mb: 2,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1,
        flexWrap: "wrap",
        flexDirection: { xs: "column", sm: "row" }
      }}
    >
      <FormControl size="small" sx={{ minWidth: 160, width: { xs: "100%", sm: "auto" } }}>
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
          <MenuItem value="all">{filterLabels.all}</MenuItem>
          <MenuItem value="short">{filterLabels.short}</MenuItem>
          <MenuItem value="long">{filterLabels.long}</MenuItem>
          <MenuItem value="tournaments">{filterLabels.tournaments}</MenuItem>
          <MenuItem value="last7">{filterLabels.last7}</MenuItem>
          <MenuItem value="last30">{filterLabels.last30}</MenuItem>
          <MenuItem value="range">{filterLabels.range}</MenuItem>
        </Select>
      </FormControl>
      {!isDefaultFilter && (
        <Tooltip title="Visa alla matcher och nollställ aktiva filter" arrow>
          <span>
            <Button
              size="small"
              onClick={() => setFilter({ type: "all" })}
              startIcon={<CloseIcon />}
              // Note for non-coders: this button only shows when a non-default filter is active.
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "12px" }}
            >
              Återställ filter
            </Button>
          </span>
        </Tooltip>
      )}
      {!isDefaultFilter && (
        <Box sx={{ px: 0.75, py: 0.25, borderRadius: 2, bgcolor: "grey.100", width: { xs: "100%", sm: "auto" } }}>
          {/* Note for non-coders: this label reminds people which filter is active right now. */}
          <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>
            Aktivt: {filterLabels[filter.type]}
          </Box>
        </Box>
      )}
      {filter.type === "range" && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1, flexDirection: { xs: "column", sm: "row" }, width: "100%" }}>
          <TextField
            id="filter-start-date"
            label="Från"
            aria-label="Välj startdatum för filter"
            type="date"
            size="small"
            value={filter.startDate || ""}
            onChange={(event) => handleDateChange("startDate", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            // Note for non-coders: resetting to empty means "show everything from the earliest match."
            InputProps={{
              endAdornment: filter.startDate ? (
                <InputAdornment position="end">
                  <Tooltip title="Återställ till tidigaste datum" arrow>
                    <IconButton
                      aria-label="Återställ startdatum"
                      size="small"
                      onClick={() => handleDateChange("startDate", "")}
                    >
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : undefined
            }}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
          />
          <TextField
            id="filter-end-date"
            label="Till"
            aria-label="Välj slutdatum för filter"
            type="date"
            size="small"
            value={filter.endDate || ""}
            onChange={(event) => handleDateChange("endDate", event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            InputProps={{
              endAdornment: filter.endDate ? (
                <InputAdornment position="end">
                  <Tooltip title="Återställ till idag" arrow>
                    <IconButton
                      aria-label="Återställ slutdatum"
                      size="small"
                      onClick={() => handleDateChange("endDate", getTodayDateString())}
                    >
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : undefined
            }}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
          />
        </Box>
      )}
    </Box>
  );
}
