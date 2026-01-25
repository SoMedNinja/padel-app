import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Box
} from "@mui/material";

interface FilterBarProps {
  filter: string;
  setFilter: (filter: string) => void;
}

export default function FilterBar({ filter, setFilter }: FilterBarProps) {
  const handleChange = (event: SelectChangeEvent) => {
    setFilter(event.target.value as string);
  };

  return (
    <Box className="filter-bar" sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
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
          Visa matcher
        </InputLabel>
        <Select
          labelId="filter-select-label"
          id="filter-select"
          value={filter}
          label="Visa matcher"
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
        </Select>
      </FormControl>
    </Box>
  );
}
