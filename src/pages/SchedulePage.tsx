import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Divider,
  Grid,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import { useAvailabilityPolls } from "../hooks/useAvailabilityPolls";
import { useProfiles } from "../hooks/useProfiles";
import { availabilityService } from "../services/availabilityService";
import { invalidateAvailabilityData } from "../data/queryInvalidation";
import { AvailabilityPollDay, AvailabilitySlot } from "../types";
import { evaluatePollDay } from "../utils/availabilityStatus";
import { formatDate, getISOWeek } from "../utils/format";

const SLOT_OPTIONS: Array<{ value: AvailabilitySlot | "all-day"; label: string }> = [
  { value: "all-day", label: "Hela dagen" },
  { value: "morning", label: "Morgon" },
  { value: "day", label: "Dag" },
  { value: "evening", label: "Kväll" },
];

const getUserVote = (day: AvailabilityPollDay, userId?: string) => {
  if (!userId) return null;
  return day.votes?.find((vote) => vote.profile_id === userId) || null;
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useStore();
  const { data: polls = [], isLoading, isError, error } = useAvailabilityPolls();
  const { data: profiles = [] } = useProfiles();
  const nextWeekSeed = getISOWeek(new Date());
  const [createWeekYear, setCreateWeekYear] = useState(nextWeekSeed.year);
  const [createWeekNumber, setCreateWeekNumber] = useState(Math.min(nextWeekSeed.week + 1, 53));

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((profile) => {
      map.set(profile.id, profile.name || "Okänd spelare");
    });
    return map;
  }, [profiles]);

  const createPollMutation = useMutation({
    mutationFn: () =>
      availabilityService.createPoll({
        weekYear: createWeekYear,
        weekNumber: createWeekNumber,
      }),
    onSuccess: () => {
      toast.success("Omröstningen skapades.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Kunde inte skapa omröstning.");
    },
  });

  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => availabilityService.closePoll(pollId),
    onSuccess: () => {
      toast.success("Omröstningen stängdes.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte stänga omröstningen."),
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) => availabilityService.deletePoll(pollId),
    onSuccess: () => {
      toast.success("Omröstningen raderades.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte radera omröstningen."),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ day, slotValue }: { day: AvailabilityPollDay; slotValue: AvailabilitySlot | "all-day" | null }) => {
      if (slotValue === null) {
        await availabilityService.removeVote(day);
        return;
      }
      const slot = slotValue === "all-day" ? null : slotValue;
      await availabilityService.upsertVote(day, slot);
    },
    onSuccess: () => {
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte spara rösten."),
  });

  const pollsSorted = [...polls].sort((a, b) => {
    if (a.week_year !== b.week_year) return a.week_year - b.week_year;
    return a.week_number - b.week_number;
  });

  const handleToggleDay = (day: AvailabilityPollDay, checked: boolean) => {
    if (!user) return;
    if (!checked) {
      voteMutation.mutate({ day, slotValue: null });
      return;
    }

    voteMutation.mutate({ day, slotValue: "all-day" });
  };

  const handleSlotChange = (day: AvailabilityPollDay, value: AvailabilitySlot | "all-day") => {
    voteMutation.mutate({ day, slotValue: value });
  };

  return (
    <Box component="section" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Schema</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Rösta på vilka dagar du kan spela. Resultatet uppdateras live för alla.
      </Typography>

      {isGuest && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {/* Note for non-coders: guests can read results but cannot submit votes. */}
          Du är i gästläge. Logga in för att rösta.
        </Alert>
      )}

      {user?.is_admin && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Skapa ny vecko-omröstning</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="År"
                  type="number"
                  fullWidth
                  value={createWeekYear}
                  onChange={(e) => setCreateWeekYear(Number(e.target.value))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Veckonummer"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1, max: 53 }}
                  value={createWeekNumber}
                  onChange={(e) => setCreateWeekNumber(Number(e.target.value))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => createPollMutation.mutate()}
                  disabled={createPollMutation.isPending}
                >
                  Skapa omröstning
                </Button>
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {/* Note for non-coders: deleting a poll later removes all votes tied to that week permanently. */}
              Administratören kan sedan stänga eller radera omröstningen.
            </Typography>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any)?.message || "Kunde inte hämta omröstningar."}
        </Alert>
      )}

      {isLoading ? (
        <Typography>Laddar schema...</Typography>
      ) : pollsSorted.length === 0 ? (
        <Alert severity="info">Inga öppna eller planerade omröstningar ännu.</Alert>
      ) : (
        <Stack spacing={2}>
          {pollsSorted.map((poll) => (
            <Card key={poll.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "start", sm: "center" }} spacing={1}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Vecka {poll.week_number} ({poll.week_year})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(poll.start_date)} - {formatDate(poll.end_date)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      color={poll.status === "open" ? "success" : "default"}
                      label={poll.status === "open" ? "Öppen" : "Stängd"}
                    />
                    {user?.is_admin && poll.status === "open" && (
                      <Button size="small" color="warning" onClick={() => closePollMutation.mutate(poll.id)}>
                        Stäng
                      </Button>
                    )}
                    {user?.is_admin && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          const confirmed = window.confirm("Radera omröstningen? Alla röster försvinner permanent.");
                          if (confirmed) {
                            deletePollMutation.mutate(poll.id);
                          }
                        }}
                      >
                        Radera
                      </Button>
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.5}>
                  {(poll.days || []).map((day) => {
                    const myVote = getUserVote(day, user?.id);
                    const isChecked = Boolean(myVote);
                    const selectedSlot = myVote?.slot || "all-day";
                    const status = evaluatePollDay(day);

                    const voters = (day.votes || []).map((vote) => ({
                      name: profileMap.get(vote.profile_id) || "Okänd spelare",
                      slot: vote.slot || "hela dagen",
                    }));

                    return (
                      <Card
                        key={day.id}
                        variant="outlined"
                        sx={{
                          borderColor: status.isGreen ? "success.main" : "divider",
                          bgcolor: status.isGreen ? "success.light" : "background.paper",
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "start", sm: "center" }} justifyContent="space-between" spacing={1}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Checkbox
                                checked={isChecked}
                                onChange={(e) => handleToggleDay(day, e.target.checked)}
                                disabled={isGuest || poll.status !== "open"}
                              />
                              <Box>
                                <Typography sx={{ fontWeight: 700 }}>{formatDate(day.date, { weekday: "long", day: "numeric", month: "short" })}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {status.totalVoters} röster {status.isGreen ? "• Spelklar (grön)" : "• Ej spelklar än"}
                                </Typography>
                              </Box>
                            </Stack>

                            <FormControl size="small" sx={{ minWidth: 170 }} disabled={!isChecked || isGuest || poll.status !== "open"}>
                              <InputLabel id={`slot-${day.id}`}>Tid</InputLabel>
                              <Select
                                labelId={`slot-${day.id}`}
                                value={selectedSlot}
                                label="Tid"
                                onChange={(e) => handleSlotChange(day, e.target.value as AvailabilitySlot | "all-day")}
                              >
                                {SLOT_OPTIONS.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Stack>

                          {voters.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {voters.map((v) => `${v.name} (${v.slot})`).join(", ")}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
