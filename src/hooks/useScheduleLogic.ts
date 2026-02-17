import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useAvailabilityPolls } from "./useAvailabilityPolls";
import { useProfiles } from "./useProfiles";
import { useScheduledGames } from "./useScheduledGames";
import { useRefreshInvalidations } from "./useRefreshInvalidations";
import { availabilityService } from "../services/availabilityService";
import { invalidateAvailabilityData } from "../data/queryInvalidation";
import { AvailabilityPoll, AvailabilityPollDay, AvailabilitySlot } from "../types";
import { queryKeys } from "../utils/queryKeys";
import { getPullToRefreshTuning } from "../Components/Shared/PullToRefreshContent";
import { buildUpcomingWeeks, mergeExpandedPollsState } from "../utils/scheduleUtils";

export function useScheduleLogic() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useStore();
  const canAccessSchema = Boolean(user?.is_regular);
  const [searchParams] = useSearchParams();
  const { data: polls = [], isLoading, isError, error, isFetching: isFetchingPolls, dataUpdatedAt: pollsUpdatedAt } = useAvailabilityPolls();
  const { data: profiles = [] } = useProfiles();
  const {
    data: scheduledGames = [],
    isLoading: isLoadingScheduledGames,
    isFetching: isFetchingScheduledGames,
    dataUpdatedAt: scheduledGamesUpdatedAt,
  } = useScheduledGames();
  const weekOptions = useMemo(() => buildUpcomingWeeks(26), []);
  const [selectedWeekKey, setSelectedWeekKey] = useState(weekOptions[1]?.key || weekOptions[0]?.key || "");
  const [expandedPolls, setExpandedPolls] = useState<Record<string, boolean>>({});
  const [didApplyDeepLinkVote, setDidApplyDeepLinkVote] = useState(false);
  const [onlyMissingVotesByPoll, setOnlyMissingVotesByPoll] = useState<Record<string, boolean>>({});
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuPollId, setActionMenuPollId] = useState<string | null>(null);
  const [dangerPollId, setDangerPollId] = useState<string | null>(null);
  const [confirmDeletePollId, setConfirmDeletePollId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitePollId, setInvitePollId] = useState<string | null>(null);
  const [inviteDate, setInviteDate] = useState("");
  const [inviteStartTime, setInviteStartTime] = useState("18:00");
  const [inviteEndTime, setInviteEndTime] = useState("20:00");
  const [inviteLocation, setInviteLocation] = useState("");
  const [inviteeProfileIds, setInviteeProfileIds] = useState<string[]>([]);
  const [inviteAction, setInviteAction] = useState<"create" | "update" | "cancel">("create");

  const selectedWeek = weekOptions.find((entry) => entry.key === selectedWeekKey) || weekOptions[0];

  // Note for non-coders: this bundles the refresh actions into one pull-to-refresh callback.
  const handleRefresh = useRefreshInvalidations([
    () => invalidateAvailabilityData(queryClient),
    // Note for non-coders: this re-fetches player names/avatars so they update with a refresh.
    () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() }),
  ]);

  const profileDataMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar_url?: string | null }>();
    profiles.forEach((profile) => {
      map.set(profile.id, {
        name: profile.name || "Okänd spelare",
        avatar_url: profile.avatar_url
      });
    });
    return map;
  }, [profiles]);

  const eligibleInvitees = useMemo(() => {
    // Note for non-coders: we default to active, regular players so invites go to the core group.
    return profiles.filter((profile) => profile.is_regular && !profile.is_deleted && profile.is_approved);
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
    mutationFn: (payload: { pollId: string; testRecipientEmail?: string; onlyMissingVotes?: boolean }) =>
      availabilityService.sendPollEmail(payload.pollId, {
        testRecipientEmail: payload.testRecipientEmail,
        onlyMissingVotes: payload.onlyMissingVotes,
      }),
    onSuccess: (result) => {
      const isTest = result.mode === "test";
      const usedVoteFilter = result.onlyMissingVotes === true;
      const baseCountText = `${result.sent}/${result.total}`;
      const filterCountText = usedVoteFilter
        ? ` (utan röster: ${result.total}/${result.totalBeforeVoteFilter || result.total}, har redan röstat: ${result.votedProfileCount || 0})`
        : "";

      toast.success(
        isTest
          ? `Testmail skickat till ${baseCountText} mottagare.${filterCountText}`
          : `Påminnelsemail skickat till ${baseCountText} spelare.${filterCountText}`,
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

  const sendCalendarInviteMutation = useMutation({
    mutationFn: (payload: {
      pollId?: string | null;
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
      inviteeProfileIds: string[];
      action: "create" | "update" | "cancel";
      title?: string;
    }) => availabilityService.sendCalendarInvite(payload),
    onSuccess: (result) => {
      toast.success(`Kalenderinbjudan skickad till ${result.sent}/${result.total} mottagare.`);
      closeInviteDialog();
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledGames() });
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte skicka kalenderinbjudan."),
  });

  const pollsSorted = useMemo(() => {
    return [...polls].sort((a, b) => {
      // Note for non-coders: we assign a small numeric "priority" so open polls show first.
      const statusPriority = (status: AvailabilityPoll["status"]) => (status === "open" ? 0 : 1);

      const statusDiff = statusPriority(a.status) - statusPriority(b.status);
      if (statusDiff !== 0) return statusDiff;
      if (a.week_year !== b.week_year) return a.week_year - b.week_year;
      return a.week_number - b.week_number;
    });
  }, [polls]);

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Note for non-coders: we only show future bookings here so the list stays focused on what's next.
    return [...scheduledGames]
      .filter((game) => (game.status || "scheduled") !== "cancelled")
      .filter((game) => game.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
  }, [scheduledGames]);

  useEffect(() => {
    if (!pollsSorted.length) return;
    setExpandedPolls((prev) => mergeExpandedPollsState(prev, pollsSorted));
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

    let isCancelled = false;

    const applyDeepLinkVote = async () => {
      try {
        // Note for non-coders: a link without slots means "whole day".
        await voteMutation.mutateAsync({ day, slots: parsedSlots });
        if (isCancelled) return;
        toast.success("Länken öppnade rätt dag och förberedde din röst.");
      } catch {
        // Note for non-coders: voteMutation already shows the error toast, so we avoid duplicate messages.
      } finally {
        // Note for non-coders: this marks the deep-link flow as handled once, even if saving failed.
        // That keeps retries deterministic (only on full refresh/new visit, not every re-render).
        if (!isCancelled) {
          setDidApplyDeepLinkVote(true);
        }
      }
    };

    void applyDeepLinkVote();

    return () => {
      isCancelled = true;
    };
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

  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuPollId(null);
  };

  const openActionMenu = (event: MouseEvent<HTMLButtonElement>, pollId: string) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuPollId(pollId);
  };

  const openInviteDialog = (poll?: AvailabilityPoll) => {
    const pollDays = poll?.days || [];
    const defaultDay = pollDays[0];
    setInvitePollId(poll?.id ?? null);
    setInviteDate(defaultDay?.date || new Date().toISOString().slice(0, 10));
    setInviteStartTime("18:00");
    setInviteEndTime("20:00");
    setInviteLocation("");
    setInviteAction("create");
    setInviteeProfileIds(eligibleInvitees.map((profile) => profile.id));
    setInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInvitePollId(null);
  };

  const handleSendInvite = () => {
    sendCalendarInviteMutation.mutate({
      pollId: invitePollId,
      date: inviteDate,
      startTime: inviteStartTime,
      endTime: inviteEndTime,
      location: inviteLocation.trim() || undefined,
      inviteeProfileIds,
      action: inviteAction,
      title: invitePollId
        ? `Padel vecka ${pollsSorted.find((entry) => entry.id === invitePollId)?.week_number ?? ""}`.trim()
        : "Padelpass",
    });
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

  const pullToRefreshTuning = getPullToRefreshTuning();

  return {
    // Data
    pollsSorted,
    upcomingBookings,
    isLoading,
    isError,
    error,
    isFetchingPolls,
    isFetchingScheduledGames,
    pollsUpdatedAt,
    scheduledGamesUpdatedAt,
    user,
    isGuest,
    canAccessSchema,
    weekOptions,
    selectedWeekKey,
    selectedWeek,
    expandedPolls,
    inviteDialogOpen,
    invitePollId,
    inviteDate,
    inviteStartTime,
    inviteEndTime,
    inviteLocation,
    inviteeProfileIds,
    inviteAction,
    profileDataMap,
    eligibleInvitees,
    dangerPollId,
    confirmDeletePollId,
    actionMenuAnchorEl,
    actionMenuPollId,
    onlyMissingVotesByPoll,
    pullToRefreshTuning,

    // Handlers
    handleRefresh,
    handleWeekStep,
    setSelectedWeekKey,
    togglePollExpanded,
    openActionMenu,
    closeActionMenu,
    openInviteDialog,
    closeInviteDialog,
    handleSendInvite,
    handleToggleDay,
    handleToggleSlot,
    setDangerPollId,
    setConfirmDeletePollId,
    setInviteDate,
    setInviteStartTime,
    setInviteEndTime,
    setInviteLocation,
    setInviteeProfileIds,
    setInviteAction,
    setOnlyMissingVotesByPoll,

    // Mutations
    createPollMutation,
    closePollMutation,
    deletePollMutation,
    sendEmailMutation,
    voteMutation,
    sendCalendarInviteMutation,
  };
}
