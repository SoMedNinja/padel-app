import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { getPlayerWeight } from "../utils/elo";
import { getBadgeLabelById } from "../utils/badges";
import {
  getIdDisplayName,
  getProfileDisplayName,
  idsToNames,
  makeNameToIdMap,
  makeProfileMap,
  resolveTeamIds,
} from "../utils/profileMap";
import ProfileName from "./ProfileName";
import {
  buildRotationSchedule,
  getTeamAverageElo,
  getWinProbability,
  getFairnessScore,
} from "../utils/rotation";
import { Match, PlayerStats, Profile } from "../types";

const ELO_BASELINE = 1000;
const K = 20;

interface MatchFormProps {
  user: any;
  profiles: Profile[];
  matches: Match[];
  eloPlayers: PlayerStats[];
}

export default function MatchForm({
  user,
  profiles = [],
  matches = [],
  eloPlayers = [],
}: MatchFormProps) {
  const [team1, setTeam1] = useState<string[]>(["", ""]);
  const [team2, setTeam2] = useState<string[]>(["", ""]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [matchSuggestion, setMatchSuggestion] = useState<any>(null);
  const [matchRecap, setMatchRecap] = useState<any>(null);
  const [eveningRecap, setEveningRecap] = useState<any>(null);
  const [recapMode, setRecapMode] = useState("evening");
  const [showRecap, setShowRecap] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const selectablePlayers = useMemo(() => {
    const hasGuest = profiles.some(player => player.id === GUEST_ID);
    return hasGuest ? profiles : [...profiles, { id: GUEST_ID, name: GUEST_NAME } as Profile];
  }, [profiles]);
  const profileMap = useMemo(() => makeProfileMap(selectablePlayers), [selectablePlayers]);
  const nameToIdMap = useMemo(
    () => makeNameToIdMap(selectablePlayers),
    [selectablePlayers]
  );
  const badgeNameMap = useMemo(() => {
    const map = new Map<string, string | null>();
    profiles.forEach(profile => {
      map.set(getProfileDisplayName(profile), profile.featured_badge_id || null);
    });
    return map;
  }, [profiles]);
  const eloMap = useMemo(() => {
    const map: Record<string, number> = { [GUEST_ID]: ELO_BASELINE };
    eloPlayers.forEach(player => {
      map[player.id] = Math.round(player.elo ?? ELO_BASELINE);
    });
    return map;
  }, [eloPlayers]);
  const playerPool = useMemo(
    () => Array.from(new Set([...team1, ...team2].filter(Boolean))),
    [team1, team2]
  );


  const getPlayerOptionLabel = (player: Profile) => {
    if (player.id === GUEST_ID) return GUEST_NAME;
    const baseName = getProfileDisplayName(player);
    const badgeLabel = getBadgeLabelById(player.featured_badge_id);
    return badgeLabel ? `${baseName} ${badgeLabel}` : baseName;
  };

  const getBadgeIdForName = (name: string) => badgeNameMap.get(name) || null;

  const isSameDay = (aDate: Date, bDate: Date) =>
    aDate.getFullYear() === bDate.getFullYear() &&
    aDate.getMonth() === bDate.getMonth() &&
    aDate.getDate() === bDate.getDate();

  const buildEveningRecap = (allMatches: Match[], latestMatch: Match) => {
    const now = new Date();
    const normalizedMatches = [...allMatches, latestMatch].map(match => {
      const team1Ids = resolveTeamIds(match.team1_ids, match.team1, nameToIdMap);
      const team2Ids = resolveTeamIds(match.team2_ids, match.team2, nameToIdMap);
      return {
        ...match,
        team1_ids: team1Ids,
        team2_ids: team2Ids,
      };
    });

    const eveningMatches = normalizedMatches.filter(match => {
      const stamp = match.created_at ? new Date(match.created_at) : now;
      return !Number.isNaN(stamp.valueOf()) && isSameDay(stamp, now);
    });

    if (!eveningMatches.length) {
      setEveningRecap(null);
      return;
    }

    const stats: Record<string, any> = {};
    let totalSets = 0;

    eveningMatches.forEach(match => {
      const team1Ids = (match.team1_ids || []) as (string | null)[];
      const team2Ids = (match.team2_ids || []) as (string | null)[];
      const team1Sets = Number(match.team1_sets || 0);
      const team2Sets = Number(match.team2_sets || 0);
      const team1Won = team1Sets > team2Sets;
      totalSets += team1Sets + team2Sets;

      const recordTeam = (teamIds: (string | null)[], didWin: boolean, setsFor: number, setsAgainst: number) => {
        teamIds.forEach(id => {
          if (!id || id === GUEST_ID) return;
          if (!stats[id]) {
            stats[id] = {
              id,
              name: getIdDisplayName(id, profileMap),
              games: 0,
              wins: 0,
              losses: 0,
              setsFor: 0,
              setsAgainst: 0,
            };
          }
          stats[id].games += 1;
          stats[id].wins += didWin ? 1 : 0;
          stats[id].losses += didWin ? 0 : 1;
          stats[id].setsFor += setsFor;
          stats[id].setsAgainst += setsAgainst;
        });
      };

      recordTeam(team1Ids, team1Won, team1Sets, team2Sets);
      recordTeam(team2Ids, !team1Won, team2Sets, team1Sets);
    });

    const players = Object.values(stats);
    const mvp = players
      .slice()
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const winPctA = a.games ? a.wins / a.games : 0;
        const winPctB = b.games ? b.wins / b.games : 0;
        if (winPctB !== winPctA) return winPctB - winPctA;
        return b.games - a.games;
      })[0];

    const leaders = players
      .slice()
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 3);

    setEveningRecap({
      dateLabel: now.toLocaleDateString("sv-SE", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      matches: eveningMatches.length,
      totalSets,
      mvp,
      leaders,
    });
  };

  const createRecap = (teamAIds: string[], teamBIds: string[], scoreA: number, scoreB: number) => {
    const teamAElo = getTeamAverageElo(teamAIds, eloMap);
    const teamBElo = getTeamAverageElo(teamBIds, eloMap);
    const winProbability = getWinProbability(teamAElo, teamBElo);
    const teamAWon = scoreA > scoreB;

    const teamADelta = Math.round(K * ((teamAWon ? 1 : 0) - winProbability));
    const teamBDelta = Math.round(K * ((teamAWon ? 0 : 1) - (1 - winProbability)));

    const mapPlayers = (ids: string[], delta: number, teamAverageElo: number) =>
      ids
        .filter(Boolean)
        .map(id => ({
          id,
          name: getIdDisplayName(id, profileMap),
          elo: eloMap[id] ?? ELO_BASELINE,
          delta:
            id === GUEST_ID
              ? 0
              : Math.round(
                  delta * getPlayerWeight(eloMap[id] ?? ELO_BASELINE, teamAverageElo)
                ),
        }));

    const recap = {
      createdAt: new Date().toISOString(),
      scoreline: `${scoreA}–${scoreB}`,
      teamAWon,
      fairness: getFairnessScore(winProbability),
      winProbability,
      teamA: {
        ids: teamAIds,
        averageElo: Math.round(teamAElo),
        delta: teamADelta,
        players: mapPlayers(teamAIds, teamADelta, teamAElo),
      },
      teamB: {
        ids: teamBIds,
        averageElo: Math.round(teamBElo),
        delta: teamBDelta,
        players: mapPlayers(teamBIds, teamBDelta, teamBElo),
      },
    };

    setMatchRecap(recap);
    setShowRecap(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      team1.includes("") ||
      team2.includes("") ||
      team1.some(p => team2.includes(p))
    ) {
      toast.error("Ogiltiga lag.");
      return;
    }

    const scoreA = Number(a);
    const scoreB = Number(b);
    const team1Label = team1.map(id => getIdDisplayName(id, profileMap)).join(" & ");
    const team2Label = team2.map(id => getIdDisplayName(id, profileMap)).join(" & ");

    const team1IdsForDb = team1.map(id => (id === GUEST_ID ? null : id));
    const team2IdsForDb = team2.map(id => (id === GUEST_ID ? null : id));

    try {
      const { error } = await supabase.from("matches").insert({
        team1: idsToNames(team1, profileMap),
        team2: idsToNames(team2, profileMap),
        team1_ids: team1IdsForDb,
        team2_ids: team2IdsForDb,
        team1_sets: scoreA,
        team2_sets: scoreB,
        score_type: "sets",
        score_target: null,
        source_tournament_id: null,
        source_tournament_type: "standalone",
        team1_serves_first: true,
        created_by: user.id,
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte spara matchen.");
      return;
    }

    const newMatch: Match = {
      id: "temp",
      team1: idsToNames(team1, profileMap),
      team2: idsToNames(team2, profileMap),
      team1_ids: team1IdsForDb,
      team2_ids: team2IdsForDb,
      team1_sets: scoreA,
      team2_sets: scoreB,
      created_at: new Date().toISOString(),
    };

    createRecap(team1, team2, scoreA, scoreB);
    buildEveningRecap(matches, newMatch);
    setTeam1(["", ""]);
    setTeam2(["", ""]);
    setA("");
    setB("");
    setMatchSuggestion(null);
    setRecapMode("evening");
    setShowRecap(true);
    toast.success(`Match sparad: ${team1Label} vs ${team2Label} (${scoreA}–${scoreB})`);
  };

  const suggestTeams = () => {
    const uniquePool = Array.from(new Set(playerPool)).filter(Boolean);

    if (uniquePool.length < 4 || uniquePool.length > 8) {
      toast.error("Välj 4–8 unika spelare för smarta lagförslag.");
      return;
    }

    if (uniquePool.length > 4) {
      const rotation = buildRotationSchedule(uniquePool, eloMap);
      if (!rotation.rounds.length) {
        toast.error("Kunde inte skapa rotation. Prova med färre spelare.");
        return;
      }
      const firstRound = rotation.rounds[0];
      setTeam1(firstRound.teamA);
      setTeam2(firstRound.teamB);
      setMatchSuggestion({
        mode: "rotation",
        rounds: rotation.rounds,
        fairness: rotation.averageFairness,
        targetGames: rotation.targetGames,
      });
      showToast("Rotationsschema klart!");
      return;
    }

    const [p1, p2, p3, p4] = uniquePool;
    const options = [
      { teamA: [p1, p2], teamB: [p3, p4] },
      { teamA: [p1, p3], teamB: [p2, p4] },
      { teamA: [p1, p4], teamB: [p2, p3] },
    ];

    const scored = options
      .map(option => {
        const teamAElo = getTeamAverageElo(option.teamA, eloMap);
        const teamBElo = getTeamAverageElo(option.teamB, eloMap);
        const winProbability = getWinProbability(teamAElo, teamBElo);
        const fairness = getFairnessScore(winProbability);
        return { ...option, teamAElo, teamBElo, winProbability, fairness };
      })
      .sort((a, b) => b.fairness - a.fairness);

    const best = scored[0];
    setTeam1(best.teamA);
    setTeam2(best.teamB);
    setMatchSuggestion({
      mode: "single",
      fairness: best.fairness,
      winProbability: best.winProbability,
      teamA: best.teamA,
      teamB: best.teamB,
    });
    toast.success("Lagförslag klart!");
  };

  const recapSummary = useMemo(() => {
    if (recapMode === "evening") {
      if (!eveningRecap) return "";
      const mvpName = eveningRecap.mvp?.name || "Ingen MVP";
      return `🌙 Kvällsrecap (${eveningRecap.dateLabel}): ${eveningRecap.matches} matcher, ${eveningRecap.totalSets} sets. MVP: ${mvpName}.`;
    }
    if (!matchRecap) return "";
    const teamA = matchRecap.teamA.players.map((player: any) => player.name).join(" & ");
    const teamB = matchRecap.teamB.players.map((player: any) => player.name).join(" & ");
    const winner = matchRecap.teamAWon ? teamA : teamB;
    return `🎾 Matchen: ${teamA} vs ${teamB} (${matchRecap.scoreline}). Vinnare: ${winner}.`;
  }, [eveningRecap, matchRecap, recapMode]);

  const buildRecapLines = () => {
    if (recapMode === "evening" && eveningRecap) {
      const mvpName = eveningRecap.mvp?.name || "Ingen MVP";
      return [
        "Kvällsrecap",
        eveningRecap.dateLabel,
        `${eveningRecap.matches} matcher · ${eveningRecap.totalSets} sets`,
        `MVP: ${mvpName}`,
        "Topp vinster:",
        ...eveningRecap.leaders.map(
          (player: any) => `${player.name} · ${player.wins} vinster`
        ),
      ];
    }
    if (recapMode === "match" && matchRecap) {
      const teamALabel = matchRecap.teamAWon ? "Vinst" : "Förlust";
      const teamBLabel = matchRecap.teamAWon ? "Förlust" : "Vinst";
      return [
        "Match‑recap",
        `Resultat: ${matchRecap.scoreline}`,
        `Lag A (${teamALabel})`,
        ...matchRecap.teamA.players.map(
          (player: any) =>
            `${player.name} · ELO ${player.elo} ${player.delta >= 0 ? "+" : ""}${player.delta}`
        ),
        `Lag B (${teamBLabel})`,
        ...matchRecap.teamB.players.map(
          (player: any) =>
            `${player.name} · ELO ${player.elo} ${player.delta >= 0 ? "+" : ""}${player.delta}`
        ),
        `Fairness ${matchRecap.fairness}% · Vinstchans Lag A ${Math.round(matchRecap.winProbability * 100)}%`,
      ];
    }
    return [];
  };

  const exportRecapImage = async () => {
    const lines = buildRecapLines();
    if (!lines.length) {
      toast.error("Ingen recap att exportera ännu.");
      return;
    }

    try {
      setIsExporting(true);
      const canvas = document.createElement("canvas");
      const width = 1080;
      const height = 1080;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Kunde inte skapa bild.");
        return;
      }

      const palette = {
        bg: "#f6f7fb",
        surface: "#ffffff",
        text: "#1f1f1f",
        muted: "#6d6d6d",
        brand: "#d32f2f",
        brandDark: "#b71c1c",
        border: "#ececec",
        highlight: "#fff5f5",
        success: "#ecfdf3",
        warning: "#fff7ed",
      };

      const drawRoundedRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill: string,
        stroke?: string
      ) => {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };

      const drawWrappedText = (
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        color: string
      ) => {
        ctx.fillStyle = color;
        const words = text.split(" ");
        let line = "";
        let currentY = y;
        words.forEach((word, index) => {
          const testLine = line ? `${line} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && index > 0) {
            ctx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
      };

      const drawChip = (label: string, x: number, y: number, bg: string, color: string) => {
        ctx.font = "bold 26px Inter, system-ui, sans-serif";
        const paddingX = 18;
        const paddingY = 10;
        const textWidth = ctx.measureText(label).width;
        const chipWidth = textWidth + paddingX * 2;
        const chipHeight = 40;
        drawRoundedRect(x, y, chipWidth, chipHeight, 20, bg);
        ctx.fillStyle = color;
        ctx.fillText(label, x + paddingX, y + chipHeight - paddingY);
        return chipWidth;
      };

      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, width, height);

      const cardPadding = 70;
      const cardX = cardPadding;
      const cardY = 140;
      const cardW = width - cardPadding * 2;
      const cardH = height - cardPadding * 2 - 40;

      ctx.save();
      ctx.shadowColor = "rgba(17, 24, 39, 0.12)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 16;
      drawRoundedRect(cardX, cardY, cardW, cardH, 32, palette.surface, palette.border);
      ctx.restore();

      const headerY = cardY + 60;
      const logoSize = 64;
      const logoX = cardX + 50;
      const logoY = headerY - 36;
      // Note for non-coders: We load the app icon so the exported recap looks branded and shareable.
      const logoImage = new Image();
      logoImage.src = "/icon-192.png";
      await new Promise<void>((resolve) => {
        logoImage.onload = () => resolve();
        logoImage.onerror = () => resolve();
      });
      if (logoImage.complete && logoImage.naturalWidth > 0) {
        ctx.save();
        const radius = 18;
        ctx.beginPath();
        ctx.moveTo(logoX + radius, logoY);
        ctx.arcTo(logoX + logoSize, logoY, logoX + logoSize, logoY + logoSize, radius);
        ctx.arcTo(logoX + logoSize, logoY + logoSize, logoX, logoY + logoSize, radius);
        ctx.arcTo(logoX, logoY + logoSize, logoX, logoY, radius);
        ctx.arcTo(logoX, logoY, logoX + logoSize, logoY, radius);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      } else {
        drawRoundedRect(logoX, logoY, logoSize, logoSize, 18, palette.brand);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 30px Inter, system-ui, sans-serif";
        ctx.fillText("GS", logoX + 18, headerY + 6);
      }

      ctx.fillStyle = palette.text;
      ctx.font = "bold 44px Inter, system-ui, sans-serif";
      ctx.fillText("Grabbarnas serie", cardX + 130, headerY + 10);
      ctx.fillStyle = palette.muted;
      ctx.font = "normal 24px Inter, system-ui, sans-serif";
      ctx.fillText("Padel, prestige & bragging rights", cardX + 130, headerY + 44);

      const contentX = cardX + 60;
      let contentY = headerY + 90;
      const contentWidth = cardW - 120;

      if (recapMode === "evening" && eveningRecap) {
        ctx.font = "bold 38px Inter, system-ui, sans-serif";
        ctx.fillStyle = palette.text;
        ctx.fillText("Kvällsrecap", contentX, contentY);

        ctx.font = "normal 28px Inter, system-ui, sans-serif";
        ctx.fillStyle = palette.muted;
        ctx.fillText(eveningRecap.dateLabel, contentX, contentY + 40);

        drawRoundedRect(contentX, contentY + 70, contentWidth, 120, 24, palette.highlight);
        ctx.fillStyle = palette.text;
        ctx.font = "bold 30px Inter, system-ui, sans-serif";
        ctx.fillText(
          `${eveningRecap.matches} matcher · ${eveningRecap.totalSets} sets`,
          contentX + 24,
          contentY + 120
        );

        const mvpName = eveningRecap.mvp?.name || "Ingen MVP";
        contentY += 230;
        drawChip("MVP", contentX, contentY - 24, palette.success, "#166534");
        ctx.fillStyle = palette.text;
        ctx.font = "bold 34px Inter, system-ui, sans-serif";
        ctx.fillText(mvpName, contentX + 120, contentY + 5);

        contentY += 70;
        ctx.fillStyle = palette.text;
        ctx.font = "bold 30px Inter, system-ui, sans-serif";
        ctx.fillText("Topp vinster", contentX, contentY + 8);
        contentY += 40;

        ctx.font = "normal 26px Inter, system-ui, sans-serif";
        eveningRecap.leaders.forEach((player: any) => {
          contentY = drawWrappedText(
            `${player.name} · ${player.wins} vinster`,
            contentX,
            contentY + 16,
            contentWidth,
            38,
            palette.text
          );
        });
      } else if (recapMode === "match" && matchRecap) {
        ctx.font = "bold 38px Inter, system-ui, sans-serif";
        ctx.fillStyle = palette.text;
        ctx.fillText("Match‑recap", contentX, contentY);

        const scoreLabel = matchRecap.scoreline;
        const winnerLabel = matchRecap.teamAWon ? "Vinst Lag A" : "Vinst Lag B";
        ctx.font = "bold 26px Inter, system-ui, sans-serif";
        const scoreWidth = ctx.measureText(scoreLabel).width + 36;
        const winnerWidth = ctx.measureText(winnerLabel).width + 36;
        const totalChipWidth = scoreWidth + winnerWidth + 16;
        const chipStartX = contentX + Math.max(0, contentWidth - totalChipWidth);
        const winnerX = chipStartX;
        const scoreX = chipStartX + winnerWidth + 16;
        drawChip(
          winnerLabel,
          winnerX,
          contentY - 24,
          matchRecap.teamAWon ? palette.success : palette.warning,
          matchRecap.teamAWon ? "#166534" : "#9a3412"
        );
        drawChip(scoreLabel, scoreX, contentY - 24, palette.brand, "#ffffff");

        contentY += 60;
        const columnGap = 40;
        const columnWidth = (contentWidth - columnGap) / 2;

        const drawTeamColumn = (title: string, players: any[], x: number, y: number) => {
          drawRoundedRect(x, y, columnWidth, 360, 24, palette.bg, palette.border);
          ctx.fillStyle = palette.text;
          ctx.font = "bold 28px Inter, system-ui, sans-serif";
          ctx.fillText(title, x + 24, y + 50);
          ctx.font = "normal 24px Inter, system-ui, sans-serif";
          let rowY = y + 90;
          players.forEach((player) => {
            rowY = drawWrappedText(
              `${player.name}`,
              x + 24,
              rowY,
              columnWidth - 48,
              32,
              palette.text
            );
            ctx.fillStyle = palette.muted;
            ctx.fillText(
              `ELO ${player.elo} · ${player.delta >= 0 ? "+" : ""}${player.delta}`,
              x + 24,
              rowY
            );
            rowY += 32;
            ctx.fillStyle = palette.text;
          });
        };

        drawTeamColumn("Lag A", matchRecap.teamA.players, contentX, contentY);
        drawTeamColumn(
          "Lag B",
          matchRecap.teamB.players,
          contentX + columnWidth + columnGap,
          contentY
        );

        contentY += 400;
        ctx.font = "normal 26px Inter, system-ui, sans-serif";
        drawWrappedText(
          `Fairness ${matchRecap.fairness}% · Vinstchans Lag A ${Math.round(
            matchRecap.winProbability * 100
          )}%`,
          contentX,
          contentY,
          contentWidth,
          36,
          palette.muted
        );
      } else {
        ctx.font = "normal 30px Inter, system-ui, sans-serif";
        lines.forEach((line) => {
          contentY = drawWrappedText(line, contentX, contentY + 12, contentWidth, 40, palette.text);
        });
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `recap-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      toast.success("Recap-bild nedladdad!");
    } catch (error: any) {
      toast.error(error?.message || "Kunde inte exportera bild.");
    } finally {
      setIsExporting(false);
    }
  };

  const renderPlayerSelect = (team: string[], setTeam: (t: string[]) => void, index: number, teamLabel: string) => (
    <select
      aria-label={`${teamLabel} spelare ${index + 1}`}
      value={team[index]}
      onChange={e => {
        const t = [...team];
        t[index] = e.target.value;
        setTeam(t);
      }}
    >
      <option value="">Välj</option>
      {selectablePlayers.map(p => (
        <option key={p.id} value={p.id}>
          {getPlayerOptionLabel(p)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="match-form-stack">
      <form onSubmit={submit} className="match-form">
        <div className="match-form-title">
          <h3>Ny match</h3>
          <button
            type="button"
            className="ghost-button matchmaker-button"
            onClick={suggestTeams}
          >
            ⚖️ Föreslå lag
          </button>
        </div>

        <div className="match-form-grid">
          <div className="match-form-header">
            <span>Lag A (Börjar med serv)</span>
            <span>Lag B</span>
          </div>

          <div className="match-form-row">
            <div className="match-form-cell">
              {renderPlayerSelect(team1, setTeam1, 0, "Lag A")}
            </div>
            <div className="match-form-cell">
              {renderPlayerSelect(team2, setTeam2, 0, "Lag B")}
            </div>
          </div>

          <div className="match-form-row">
            <div className="match-form-cell">
              {renderPlayerSelect(team1, setTeam1, 1, "Lag A")}
            </div>
            <div className="match-form-cell">
              {renderPlayerSelect(team2, setTeam2, 1, "Lag B")}
            </div>
          </div>

          <div className="match-form-header match-form-result-title">
            <span>Resultat</span>
            <span />
          </div>

          <div className="match-form-row match-form-result-row">
            <input
              type="number"
              min="0"
              className="match-form-score-input"
              aria-label="Set Lag A"
              value={a}
              onChange={e => setA(e.target.value)}
            />
            <span className="match-form-score-separator">–</span>
            <input
              type="number"
              min="0"
              className="match-form-score-input"
              aria-label="Set Lag B"
              value={b}
              onChange={e => setB(e.target.value)}
            />
          </div>
        </div>

        <button type="submit">Spara</button>
      </form>

      {matchSuggestion && (
        <div className="matchmaker-card">
          <div className="matchmaker-header">
            <strong>Smart Matchmaker</strong>
            <span className="chip chip-success">
              {matchSuggestion.mode === "rotation" ? "Rotation" : "Balansering"}{" "}
              {matchSuggestion.fairness}%
            </span>
          </div>
          <div className="matchmaker-body">
            {matchSuggestion.mode === "rotation" ? (
              <div className="matchmaker-rotation">
                {matchSuggestion.rounds.map((round: any) => (
                  <div key={round.round} className="matchmaker-round">
                    <div className="matchmaker-round-title">Runda {round.round}</div>
                    <div className="matchmaker-round-teams">
                      <div>
                        <span className="muted">Lag A</span>
                        <div className="matchmaker-team">
                          {round.teamA.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}
                        </div>
                      </div>
                      <div>
                        <span className="muted">Lag B</span>
                        <div className="matchmaker-team">
                          {round.teamB.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}
                        </div>
                      </div>
                    </div>
                    <div className="matchmaker-round-meta muted">
                      Balans {round.fairness}% · Vinstchans Lag A:{" "}
                      {Math.round(round.winProbability * 100)}%
                    </div>
                    <div className="matchmaker-round-meta muted">
                      Vilar: {round.rest.map((id: string) => getIdDisplayName(id, profileMap)).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <span className="muted">Lag A</span>
                  <div className="matchmaker-team">
                    {matchSuggestion.teamA.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}
                  </div>
                </div>
                <div>
                  <span className="muted">Lag B</span>
                  <div className="matchmaker-team">
                    {matchSuggestion.teamB.map((id: string) => getIdDisplayName(id, profileMap)).join(" & ")}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="matchmaker-footer muted">
            {matchSuggestion.mode === "rotation"
              ? `Mål: ${matchSuggestion.targetGames} matcher per spelare.`
              : `Förväntad vinstchans Lag A: ${Math.round(
                  matchSuggestion.winProbability * 100
                )}%`}
          </div>
        </div>
      )}

      {showRecap && (matchRecap || eveningRecap) && (
        <div className="recap-card">
          <div className="recap-header">
            <div className="recap-brand">
              {/* Note for non-coders: Using a public image path keeps the logo easy to reuse in the UI. */}
              <img src="/icon-192.png" alt="App-logga" className="recap-logo" />
              <div>
                <strong>{recapMode === "evening" ? "Kvällsrecap" : "Match‑recap"}</strong>
                <div className="recap-subtitle muted">Redo att dela kvällens highlights.</div>
              </div>
            </div>
            <div className="recap-header-actions">
              <div className="recap-toggle">
                <button
                  type="button"
                  className={`ghost-button ${recapMode === "evening" ? "is-active" : ""}`}
                  onClick={() => setRecapMode("evening")}
                  disabled={!eveningRecap}
                >
                  Kväll
                </button>
                <button
                  type="button"
                  className={`ghost-button ${recapMode === "match" ? "is-active" : ""}`}
                  onClick={() => setRecapMode("match")}
                  disabled={!matchRecap}
                >
                  Match
                </button>
              </div>
              {recapMode === "evening" && (
                <button type="button" className="ghost-button" onClick={() => setShowRecap(false)}>
                  Stäng
                </button>
              )}
              {recapMode === "match" && matchRecap && (
                <span className="chip chip-neutral">{matchRecap.scoreline}</span>
              )}
            </div>
          </div>
          <div className="recap-body">
            {recapMode === "evening" && eveningRecap ? (
              <>
                <div className="recap-hero recap-hero-evening">
                  <div className="recap-hero-date">{eveningRecap.dateLabel}</div>
                  <div className="recap-hero-stats">
                    {eveningRecap.matches} matcher · {eveningRecap.totalSets} sets
                  </div>
                  <div className="recap-hero-mvp">
                    <span className="chip chip-success">MVP</span>
                    <strong>
                      <ProfileName
                        name={eveningRecap.mvp?.name || "—"}
                        badgeId={getBadgeIdForName(eveningRecap.mvp?.name || "")}
                      />
                    </strong>
                  </div>
                </div>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Topp vinster</span>
                  </div>
                  <div className="recap-team-players">
                    {eveningRecap.leaders.map((player: any) => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          {player.wins} vinster · {player.games} matcher
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {recapMode === "match" && matchRecap ? (
              <>
                <div className="recap-hero recap-hero-match">
                  <div className="recap-hero-score">{matchRecap.scoreline}</div>
                  <div
                    className={`recap-hero-result ${
                      matchRecap.teamAWon ? "is-win" : "is-loss"
                    }`}
                  >
                    {matchRecap.teamAWon ? "Vinst Lag A" : "Vinst Lag B"}
                  </div>
                  <div className="recap-hero-subtitle muted">Matchens resultat i fokus.</div>
                </div>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Lag A</span>
                    <span className={matchRecap.teamAWon ? "chip chip-success" : "chip chip-warning"}>
                      {matchRecap.teamAWon ? "Vinst" : "Förlust"}
                    </span>
                  </div>
                  <div className="recap-team-players">
                    {matchRecap.teamA.players.map((player: any) => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          ELO {player.elo} · {player.delta >= 0 ? "+" : ""}{player.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="recap-team">
                  <div className="recap-team-header">
                    <span>Lag B</span>
                    <span className={!matchRecap.teamAWon ? "chip chip-success" : "chip chip-warning"}>
                      {!matchRecap.teamAWon ? "Vinst" : "Förlust"}
                    </span>
                  </div>
                  <div className="recap-team-players">
                    {matchRecap.teamB.players.map((player: any) => (
                      <div key={player.id} className="recap-player">
                        <ProfileName
                          name={player.name}
                          badgeId={getBadgeIdForName(player.name)}
                        />
                        <span className="muted">
                          ELO {player.elo} · {player.delta >= 0 ? "+" : ""}{player.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
          <div className="recap-footer">
            {recapMode === "match" && matchRecap ? (
              <div className="muted">
                Fairness: {matchRecap.fairness}% · Förväntad vinstchans Lag A:{" "}
                {Math.round(matchRecap.winProbability * 100)}%
              </div>
            ) : (
              <div className="muted">Dela kvällens höjdpunkter med laget.</div>
            )}
            <button
              type="button"
              className="ghost-button"
              onClick={exportRecapImage}
              disabled={isExporting}
            >
              {isExporting ? "Exporterar..." : "Ladda ner som bild"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                if (!navigator.clipboard) {
                  toast.error("Kopiering stöds inte i den här webbläsaren.");
                  return;
                }
                navigator.clipboard.writeText(recapSummary);
                toast.success("Recap kopierad!");
              }}
            >
              Kopiera sammanfattning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
