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
    <Box className="filter-bar" sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="filter-select-label">Visa matcher</InputLabel>
        <Select
          labelId="filter-select-label"
          id="filter-select"
          value={filter}
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
        </Select>
      </FormControl>
    </Box>
  );
}
