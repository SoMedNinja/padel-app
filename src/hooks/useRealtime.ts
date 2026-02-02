import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { invalidateMatchData, invalidateProfileData, invalidateTournamentData } from "../data/queryInvalidation";

export const useRealtime = () => {
  const queryClient = useQueryClient();
  const tournamentStatusRef = useRef<Record<string, string>>({});
  const pollingIntervalRef = useRef<number | null>(null);
  const warningShownRef = useRef(false);
  const realtimeWarningToastId = "realtime-warning";
  const tournamentChannels = [
    "mexicana-results-realtime",
    "mexicana-tournaments-realtime",
    "mexicana-rounds-realtime",
    "mexicana-participants-realtime",
  ];

  useEffect(() => {
    const startTournamentPollingFallback = () => {
      if (pollingIntervalRef.current !== null) return;
      // Note for non-coders: when realtime drops, we do a light refresh every 30 seconds
      // so the tournament screen stays up to date without needing a full page reload.
      pollingIntervalRef.current = window.setInterval(() => {
        invalidateTournamentData(queryClient);
      }, 30000);
    };

    const stopTournamentPollingFallback = () => {
      if (pollingIntervalRef.current === null) return;
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    };

    const handleTournamentStatus = (channelName: string, status: string) => {
      tournamentStatusRef.current[channelName] = status;

      const statuses = tournamentChannels.map(name => tournamentStatusRef.current[name]);
      const hasRealtimeIssue = statuses.some(
        current => current === "CHANNEL_ERROR" || current === "TIMED_OUT" || current === "CLOSED"
      );
      const allSubscribed = statuses.length > 0 && statuses.every(current => current === "SUBSCRIBED");

      if (hasRealtimeIssue) {
        // Note for non-coders: we log a message so developers can diagnose dropped live updates.
        console.warn(`Realtime channel issue for ${channelName}: ${status}`);
        startTournamentPollingFallback();
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          // Note for non-coders: using a fixed toast id prevents duplicate warnings stacking up.
          toast.warning("Liveuppdateringar tappades – vi uppdaterar data automatiskt i bakgrunden.", {
            id: realtimeWarningToastId,
            duration: 6000,
          });
        }
      } else if (allSubscribed) {
        stopTournamentPollingFallback();
        warningShownRef.current = false;
        // Note for non-coders: when live updates recover, we hide the warning immediately.
        toast.dismiss(realtimeWarningToastId);
      }
    };

    const matchesChannel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          invalidateMatchData(queryClient);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          invalidateProfileData(queryClient);
        }
      )
      .subscribe();

    const tournamentResultsChannel = supabase
      .channel("mexicana-results-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_results" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe(status => handleTournamentStatus("mexicana-results-realtime", status));

    const tournamentsChannel = supabase
      .channel("mexicana-tournaments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_tournaments" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe(status => handleTournamentStatus("mexicana-tournaments-realtime", status));

    const roundsChannel = supabase
      .channel("mexicana-rounds-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_rounds" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe(status => handleTournamentStatus("mexicana-rounds-realtime", status));

    const participantsChannel = supabase
      .channel("mexicana-participants-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mexicana_participants" },
        () => {
          invalidateTournamentData(queryClient);
        }
      )
      .subscribe(status => handleTournamentStatus("mexicana-participants-realtime", status));

    return () => {
      supabase.removeChannel(matchesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(tournamentResultsChannel);
      supabase.removeChannel(tournamentsChannel);
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(participantsChannel);
      stopTournamentPollingFallback();
      toast.dismiss(realtimeWarningToastId);
    };
  }, [queryClient]);
};
