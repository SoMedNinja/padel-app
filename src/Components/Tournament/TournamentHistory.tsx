import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  Button,
  IconButton,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { formatDate } from "../../utils/format";
import EmptyState from "../Shared/EmptyState";
import { EmojiEvents as TrophyIcon } from "@mui/icons-material";
import { getTournamentStatusLabel } from "../../utils/profileMap";

interface TournamentHistoryProps {
  tournaments: any[];
  onSelect: (id: string) => void;
  onDelete: (tournament: any) => void;
  isMobile: boolean;
}


export default function TournamentHistory({
  tournaments,
  onSelect,
  onDelete,
  isMobile,
}: TournamentHistoryProps) {
  if (tournaments.length === 0) {
    return (
      <EmptyState
        title="Inga turneringar ännu"
        description="Starta en ny Americano eller Mexicana för att samla gänget!"
        icon={<TrophyIcon sx={{ fontSize: 48 }} />}
      />
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: "auto" }}>
      <Table size="small" sx={{ minWidth: isMobile ? 520 : 700 }}>
        <TableHead sx={{ bgcolor: "grey.50" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Turnering</TableCell>
            <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
              Typ
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>
              Datum
            </TableCell>
            <TableCell align="right"></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tournaments.map((t) => (
            <TableRow key={t.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
              <TableCell
                sx={{ textTransform: "capitalize", display: { xs: "none", sm: "table-cell" } }}
              >
                {t.tournament_type}
              </TableCell>
              <TableCell>
                <Chip
                  label={getTournamentStatusLabel(t.status)}
                  size="small"
                  color={t.status === "completed" ? "success" : "default"}
                  sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                {formatDate(t.scheduled_at)}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" onClick={() => onSelect(t.id)}>
                    Visa
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(t)}
                    aria-label={`Radera turneringen ${t.name}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
