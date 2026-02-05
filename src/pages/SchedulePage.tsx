import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Typography,
  Divider,
  IconButton,
  MenuItem,
  Select,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useAvailabilityPolls } from "../hooks/useAvailabilityPolls";
import { useProfiles } from "../hooks/useProfiles";
import { availabilityService } from "../services/availabilityService";
import { invalidateAvailabilityData } from "../data/queryInvalidation";
import { AvailabilityPoll, AvailabilityPollDay, AvailabilitySlot } from "../types";
import { evaluatePollDay } from "../utils/availabilityStatus";
import { formatDate, getISOWeek } from "../utils/format";

interface UpcomingWeekOption {
  key: string;
  label: string;
  week: number;
  year: number;
}

const SLOT_OPTIONS: Array<{ value: AvailabilitySlot; label: string }> = [
  { value: "morning", label: "Morgon" },
  { value: "day", label: "Dag" },
  { value: "evening", label: "Kväll" },
];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const buildUpcomingWeeks = (count = 26): UpcomingWeekOption[] => {
  const start = new Date();
  const seen = new Set<string>();
  const options: UpcomingWeekOption[] = [];

  for (let offset = 0; options.length < count; offset += 7) {
    const date = addDays(start, offset);
    const { week, year } = getISOWeek(date);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ key, label: `Vecka ${week} (${year})`, week, year });
  }

  return options;
};

// Note for non-coders: if a user hasn't selected any slot, that means "whole day".
const normalizeVoteSlots = (day: AvailabilityPollDay, userId?: string): AvailabilitySlot[] | null => {
  if (!userId) return null;
  const vote = day.votes?.find((entry) => entry.profile_id === userId);
  if (!vote) return null;

  if (vote.slot_preferences && vote.slot_preferences.length > 0) {
    return vote.slot_preferences;
  }

  if (vote.slot) return [vote.slot];
  return [];
};

const computeEmailAvailability = (poll: AvailabilityPoll) => {
  const logs = poll.mail_logs || [];
  const sentCount = logs.length;
  const latest = logs[0]?.sent_at ? new Date(logs[0].sent_at) : null;

  if (sentCount >= 2) {
    return {
      canSend: false,
      helper: "Max 2 mail redan skickade för denna omröstning.",
    };
  }

  if (!latest) {
    return {
      canSend: true,
      helper: "Inga utskick ännu.",
    };
  }

  const nextAllowed = new Date(latest.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < nextAllowed) {
    const hoursLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      canSend: false,
      helper: `Vänta cirka ${hoursLeft}h till nästa utskick.`,
    };
  }

  return {
    canSend: true,
    helper: "Du kan skicka påminnelse nu.",
  };
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useStore();
  const canAccessSchema = Boolean(user?.is_regular);
  const [searchParams] = useSearchParams();
  const { data: polls = [], isLoading, isError, error } = useAvailabilityPolls();
  const { data: profiles = [] } = useProfiles();
  const weekOptions = useMemo(() => buildUpcomingWeeks(26), []);
  const [selectedWeekKey, setSelectedWeekKey] = useState(weekOptions[1]?.key || weekOptions[0]?.key || "");
  const [expandedPolls, setExpandedPolls] = useState<Record<string, boolean>>({});
  const [didApplyDeepLinkVote, setDidApplyDeepLinkVote] = useState(false);

  const selectedWeek = weekOptions.find((entry) => entry.key === selectedWeekKey) || weekOptions[0];

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((profile) => {
      map.set(profile.id, profile.name || "Okänd spelare");
    });
    return map;
  }, [profiles]);

  const createPollMutation = useMutation({
    mutationFn: () => availabilityService.createPoll({ weekYear: selectedWeek.year, weekNumber: selectedWeek.week }),
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

  const sendEmailMutation = useMutation({
    mutationFn: (payload: { pollId: string; testRecipientEmail?: string }) =>
      availabilityService.sendPollEmail(payload.pollId, {
        testRecipientEmail: payload.testRecipientEmail,
      }),
    onSuccess: (result) => {
      const isTest = result.mode === "test";
      toast.success(
        isTest
          ? `Testmail skickat till ${result.sent}/${result.total} mottagare.`
          : `Påminnelsemail skickat till ${result.sent}/${result.total} ordinarie spelare.`,
      );
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte skicka mail."),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ day, slots }: { day: AvailabilityPollDay; slots: AvailabilitySlot[] | null }) => {
      if (slots === null) {
        await availabilityService.removeVote(day);
        return;
      }
      await availabilityService.upsertVote(day, slots);
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

  useEffect(() => {
    if (!pollsSorted.length) return;
    setExpandedPolls((prev) => {
      const next = { ...prev };
      pollsSorted.forEach((poll, index) => {
        if (!(poll.id in next)) {
          // Note for non-coders: first poll opens by default, others start collapsed.
          next[poll.id] = index === 0;
        }
      });
      return next;
    });
  }, [pollsSorted]);

  useEffect(() => {
    if (didApplyDeepLinkVote || !user || isGuest || pollsSorted.length === 0) return;

    const pollId = searchParams.get("poll");
    const dayId = searchParams.get("day");
    const slotsRaw = searchParams.get("slots");

    if (!pollId || !dayId) {
      setDidApplyDeepLinkVote(true);
      return;
    }

    const poll = pollsSorted.find((entry) => entry.id === pollId);
    const day = poll?.days?.find((entry) => entry.id === dayId);
    if (!poll || !day) {
      setDidApplyDeepLinkVote(true);
      return;
    }

    const parsedSlots = slotsRaw
      ? slotsRaw
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry): entry is AvailabilitySlot => entry === "morning" || entry === "day" || entry === "evening")
      : [];

    setExpandedPolls((prev) => ({ ...prev, [poll.id]: true }));

    // Note for non-coders: a link without slots means "whole day".
    voteMutation.mutate({ day, slots: parsedSlots });
    toast.success("Länken öppnade rätt dag och förberedde din röst.");
    setDidApplyDeepLinkVote(true);
  }, [didApplyDeepLinkVote, isGuest, pollsSorted, searchParams, user, voteMutation]);

  const handleWeekStep = (direction: -1 | 1) => {
    const currentIndex = weekOptions.findIndex((entry) => entry.key === selectedWeekKey);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= weekOptions.length) return;
    setSelectedWeekKey(weekOptions[nextIndex].key);
  };

  const togglePollExpanded = (pollId: string, expanded: boolean) => {
    setExpandedPolls((prev) => ({ ...prev, [pollId]: expanded }));
  };

  const handleToggleDay = (day: AvailabilityPollDay, checked: boolean) => {
    if (!user) return;
    if (!checked) {
      voteMutation.mutate({ day, slots: null });
      return;
    }

    // Empty array = whole day available.
    voteMutation.mutate({ day, slots: [] });
  };

  const handleToggleSlot = (day: AvailabilityPollDay, slot: AvailabilitySlot, currentlySelected: AvailabilitySlot[]) => {
    const nextSlots = currentlySelected.includes(slot)
      ? currentlySelected.filter((entry) => entry !== slot)
      : [...currentlySelected, slot];

    voteMutation.mutate({ day, slots: nextSlots });
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

      {!isGuest && !canAccessSchema && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {/* Note for non-coders: only players marked as "ordinarie" by admin can access Schema. */}
          Du är inte markerad som ordinarie spelare ännu. Kontakta admin för åtkomst till Schema.
        </Alert>
      )}

      {user?.is_admin && selectedWeek && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Skapa ny vecko-omröstning</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
              <IconButton onClick={() => handleWeekStep(-1)} disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) <= 0}>
                <RemoveIcon />
              </IconButton>

              <Select size="small" value={selectedWeekKey} onChange={(e) => setSelectedWeekKey(e.target.value)} sx={{ minWidth: 220 }}>
                {weekOptions.map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

              <IconButton
                onClick={() => handleWeekStep(1)}
                disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) >= weekOptions.length - 1}
              >
                <AddIcon />
              </IconButton>

              <Button variant="contained" onClick={() => createPollMutation.mutate()} disabled={createPollMutation.isPending}>
                Skapa omröstning
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {/* Note for non-coders: delete removes all rows connected to that poll in the database. */}
              Du kan senare stänga eller radera omröstningen helt.
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
        <Stack spacing={1.5}>
          {pollsSorted.map((poll) => {
            const mailState = computeEmailAvailability(poll);
            const isExpanded = Boolean(expandedPolls[poll.id]);

            return (
              <Accordion key={poll.id} expanded={isExpanded} onChange={(_, expanded) => togglePollExpanded(poll.id, expanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" sx={{ width: "100%" }} spacing={1}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Vecka {poll.week_number} ({poll.week_year})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(poll.start_date)} - {formatDate(poll.end_date)}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip color={poll.status === "open" ? "success" : "default"} label={poll.status === "open" ? "Öppen" : "Stängd"} />
                      <Chip variant="outlined" label={isExpanded ? "Minimera" : "Expandera"} />
                    </Stack>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
                    {user?.is_admin && poll.status === "open" && (
                      <Button
                        size="small"
                        color="warning"
                        variant="contained"
                        onClick={() => closePollMutation.mutate(poll.id)}
                      >
                        Stäng omröstning
                      </Button>
                    )}

                    {user?.is_admin && (
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => {
                          const confirmed = window.confirm("Radera omröstningen permanent? Alla röster försvinner.");
                          if (confirmed) {
                            deletePollMutation.mutate(poll.id);
                          }
                        }}
                      >
                        Radera omröstning permanent
                      </Button>
                    )}

                    {user?.is_admin && (
                      <Button
                        size="small"
                        startIcon={<EmailIcon />}
                        variant="outlined"
                        disabled={!mailState.canSend || sendEmailMutation.isPending}
                        onClick={() => sendEmailMutation.mutate({ pollId: poll.id })}
                      >
                        Skicka påminnelsemail till ordinarie spelare
                      </Button>
                    )}

                    {user?.is_admin && (
                      <Button
                        size="small"
                        startIcon={<EmailIcon />}
                        variant="outlined"
                        disabled={sendEmailMutation.isPending}
                        onClick={() =>
                          sendEmailMutation.mutate({
                            pollId: poll.id,
                            testRecipientEmail: "Robbanh94@gmail.com",
                          })
                        }
                      >
                        Skicka testmail (endast Robbanh94@gmail.com)
                      </Button>
                    )}
                  </Stack>

                  {user?.is_admin && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                      {mailState.helper} • Testmail påverkar inte 2-utskicksgränsen.
                    </Typography>
                  )}

                  <Divider sx={{ mb: 1.5 }} />

                  <Stack spacing={1.25}>
                    {(poll.days || []).map((day) => {
                      const mySlots = normalizeVoteSlots(day, user?.id);
                      const isChecked = mySlots !== null;
                      const selectedSlots = mySlots || [];
                      const status = evaluatePollDay(day);

                      const voters = (day.votes || []).map((vote) => {
                        const slots = vote.slot_preferences && vote.slot_preferences.length > 0
                          ? vote.slot_preferences.join("/")
                          : vote.slot
                            ? vote.slot
                            : "hela dagen";
                        return {
                          name: profileMap.get(vote.profile_id) || "Okänd spelare",
                          slots,
                        };
                      });

                      return (
                        <Card
                          key={day.id}
                          variant="outlined"
                          sx={{
                            borderColor: status.isGreen ? "success.main" : "divider",
                            bgcolor: status.isGreen ? "success.light" : "background.paper",
                          }}
                        >
                          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox
                                  checked={isChecked}
                                  onChange={(e) => handleToggleDay(day, e.target.checked)}
                                  disabled={isGuest || poll.status !== "open"}
                                />
                                <Box>
                                  <Typography sx={{ fontWeight: 700 }}>
                                    {formatDate(day.date, { weekday: "long", day: "numeric", month: "short" })}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {status.totalVoters} röster {status.isGreen ? "• Spelklar (grön)" : "• Ej spelklar än"}
                                  </Typography>
                                </Box>
                              </Stack>

                              <Chip
                                size="small"
                                label={selectedSlots.length === 0 ? "Hela dagen" : selectedSlots.map((slot) => SLOT_OPTIONS.find((o) => o.value === slot)?.label || slot).join(" + ")}
                              />
                            </Stack>

                            {isChecked && (
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                                {SLOT_OPTIONS.map((option) => (
                                  <FormControlLabel
                                    key={option.value}
                                    control={
                                      <Checkbox
                                        size="small"
                                        checked={selectedSlots.includes(option.value)}
                                        onChange={() => handleToggleSlot(day, option.value, selectedSlots)}
                                        disabled={isGuest || poll.status !== "open"}
                                      />
                                    }
                                    label={option.label}
                                  />
                                ))}
                              </Stack>
                            )}

                            {voters.length > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                {voters.map((v) => `${v.name} (${v.slots})`).join(", ")}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
