import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  corsHeaders,
  GUEST_ID,
  ALLOWED_TEST_ROLES,
} from "./constants.ts";
import {
  pLimit,
  escapeHtml,
  getIsoWeek,
  getISOWeekRange,
} from "./utils.ts";
import { calculateElo } from "./elo.ts";
import {
  getMvpWinner,
  findWeekHighlight,
  calculateWeeklyStats,
} from "./stats.ts";
import {
  generateEmailHtml,
  sendEmailWithRetry,
} from "./email.ts";
import { Profile, Match, MvpCandidate, EmailResult } from "./types.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  console.log(JSON.stringify({
    event: "weekly-summary.auth-header-check",
    hasAuthorizationHeader: authHeader.length > 0,
    hasBearerPrefix: authHeader.startsWith("Bearer "),
  }));

  const jsonResponse = (payload: Record<string, any>, status = 200) => {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const cronToken = Deno.env.get('WEEKLY_SUMMARY_CRON_TOKEN') ?? '';
    const cronHeader = req.headers.get("x-cron-token");
    const isCronRequest = Boolean(cronToken) && cronHeader === cronToken;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        success: false,
        error: "SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas.",
        hint: "Lägg till variablerna i Supabase Functions > Environment Variables."
      });
    }

    if (!anonKey && !isCronRequest) {
      return jsonResponse({
        success: false,
        error: "SUPABASE_ANON_KEY saknas.",
        hint: "Lägg till variabeln i Supabase Functions > Environment Variables."
      });
    }

    if (!resendApiKey) {
      return jsonResponse({
        success: false,
        error: "RESEND_API_KEY saknas.",
        hint: "Lägg till variabeln i Supabase Functions > Environment Variables."
      });
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // Parse request body
    let targetPlayerId: string | null = null;
    let requestedTimeframe: string | null = null;
    let requestedWeek: number | null = null;
    let requestedYear: number | null = null;
    let previewOnly = false;

    try {
      const body = await req.json();
      targetPlayerId = body.playerId || null;
      requestedTimeframe = body.timeframe || null;
      requestedWeek = body.week || null;
      requestedYear = body.year || null;
      previewOnly = body.previewOnly === true;
    } catch {
      // No body or not JSON, proceed with defaults
    }

    if (cronHeader && !isCronRequest) {
      return new Response(JSON.stringify({ error: "Invalid cron token" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- AUTH HELPERS ---
    const getBearerToken = (req: Request) => {
      const header = req.headers.get("Authorization") ?? "";
      if (!header.startsWith("Bearer ")) return null;
      return header.slice("Bearer ".length).trim();
    };

    let userId: string | null = null;
    let role: string | null = null;

    if (!isCronRequest) {
      const token = getBearerToken(req);
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing bearer token" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const authClient = createClient(
        supabaseUrl,
        anonKey
      );
      const { data: authData, error } = await authClient.auth.getUser(token);
      if (error || !authData?.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      userId = authData.user.id;
      role =
        authData.user.role ??
        authData.user.app_metadata?.role ??
        null;
    } else {
      role = "service_role";
    }

    // Determine timeframe
    let start: Date;
    let end: Date;
    let weekLabel: string;

    const now = new Date();

    if (requestedTimeframe === "7days") {
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      weekLabel = "SENASTE 7 DAGARNA";
    } else if (requestedTimeframe === "30days") {
      end = now;
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      weekLabel = "SENASTE 30 DAGARNA";
    } else if (requestedTimeframe === "isoWeek" && requestedWeek && requestedYear) {
      const range = getISOWeekRange(requestedWeek, requestedYear);
      start = range.start;
      end = range.end;
      weekLabel = `VECKA ${requestedWeek} I PADEL`;
    } else {
      // Default to the previous full ISO week
      const lastWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { week, year } = getIsoWeek(lastWeekDate);
      const range = getISOWeekRange(week, year);
      start = range.start;
      end = range.end;
      weekLabel = `VECKA ${week} I PADEL`;
    }

    const startOfWeekISO = start.toISOString();
    const endOfWeekISO = end.toISOString();

    const { data: currentUserProfileData, error: currentUserProfileError } = userId
      ? await supabase
        .from('profiles')
        .select('id, is_admin, is_deleted')
        .eq('id', userId)
        .maybeSingle()
      : { data: null, error: null };
    if (currentUserProfileError) {
      console.error("Current profile fetch error:", currentUserProfileError);
      throw new Error(`Failed to fetch current profile: ${currentUserProfileError.message}`);
    }

    const { data: rawProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, featured_badge_id, is_admin, email')
      .eq('is_deleted', false);
    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Security: Sanitize profile data early to prevent injection in emails
    const profiles = (rawProfiles || []).map((p: Profile) => ({
      ...p,
      name: escapeHtml(p.name || "Okänd"),
      avatar_url: p.avatar_url ? escapeHtml(p.avatar_url) : null,
      email: p.email ?? null
    }));

    const profileMap = new Map(profiles.map((p: Profile) => [p.id, p]));

    const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
    if (matchesError) {
      console.error("Matches fetch error:", matchesError);
      throw new Error(`Failed to fetch matches: ${matchesError.message}`);
    }

    if (!profiles || !matches) throw new Error("Failed to fetch data from database");

    // Security: Verify admin status from database and enforce test email ownership
    const isActualAdmin = currentUserProfileData?.is_admin === true || role === 'service_role';

    if (targetPlayerId) {
      if (!role || !ALLOWED_TEST_ROLES.has(role)) {
        if (!isActualAdmin) {
          return new Response(JSON.stringify({ error: "Roll saknar behörighet för testläge" }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } else if (!isActualAdmin) {
      const profileHint = currentUserProfileData
        ? "Din profil saknar adminflagga."
        : "Ingen profil hittades som matchar din inloggade användare.";
      return new Response(JSON.stringify({ error: `Roll saknar behörighet för massutskick. ${profileHint}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (targetPlayerId && !isActualAdmin && targetPlayerId !== userId) {
      return new Response(JSON.stringify({ error: "Du kan bara skicka test-mail till dig själv" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const weeklyMatches = matches.filter((m: Match) => m.created_at >= startOfWeekISO && m.created_at <= endOfWeekISO);

    const activePlayerIds = new Set<string>();
    if (targetPlayerId) {
      activePlayerIds.add(targetPlayerId);
    } else {
      weeklyMatches.forEach((m: Match) => {
        [...m.team1_ids, ...m.team2_ids].forEach(id => { if (id && id !== GUEST_ID) activePlayerIds.add(id); });
      });
    }

    // Performance Optimization: Fetch only active users instead of all users.
    const activeIdsArray = Array.from(activePlayerIds);
    const activeIdsSet = new Set(activeIdsArray);
    const allUsers: any[] = [];
    const userMap = new Map<string, any>();

    let page = 1;
    const PER_PAGE = 1000;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });

      if (error) {
        console.error("Error fetching users list:", error);
        break;
      }

      const users = data?.users || [];
      if (users.length === 0) break;

      users.forEach((u: any) => {
        if (activeIdsSet.has(u.id)) {
          userMap.set(u.id, u);
        }
      });

      if (userMap.size === activeIdsSet.size) break;

      if (users.length < PER_PAGE) break;
      page++;
    }

    activeIdsArray.forEach(id => {
      if (userMap.has(id)) {
        allUsers.push(userMap.get(id));
      } else {
        console.warn(`User ${id} not found in Auth users list.`);
      }
    });

    const resolveUserEmail = (user: any) => {
      if (!user) return null;
      const metadataEmail = user.user_metadata?.email ?? user.user_metadata?.email_address ?? null;
      const identityEmail = Array.isArray(user.identities)
        ? user.identities
          .map((identity: any) => identity?.identity_data?.email ?? identity?.email ?? null)
          .find((email: string | null) => Boolean(email))
        : null;
      return user.email ?? metadataEmail ?? identityEmail ?? null;
    };

    const authUserMap = new Map(allUsers.map(u => [u.id, u]));
    const emailMap = new Map(allUsers.map(u => [u.id, resolveUserEmail(u)]));
    const profileEmailMap = new Map(profiles.map((profile: Profile) => [profile.id, profile.email ?? null]));
    const profileNameMap = new Map(profiles.map((profile: Profile) => [profile.id, profile.name]));

    const sortedAllMatches = [...matches].sort((a: Match, b: Match) => a.created_at.localeCompare(b.created_at));
    const matchesBefore = sortedAllMatches.filter((m: Match) => m.created_at < startOfWeekISO);
    const matchesWeekForElo = sortedAllMatches.filter((m: Match) => m.created_at >= startOfWeekISO && m.created_at < endOfWeekISO);

    const eloStart = calculateElo(matchesBefore, profileMap);
    const eloEnd = calculateElo(matchesWeekForElo, profileMap, eloStart);

    if (activePlayerIds.size === 0 && !targetPlayerId) {
      console.log("No active players and no targetPlayerId provided");
      return new Response(JSON.stringify({ message: "No activity" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const weeklyStats = calculateWeeklyStats(activePlayerIds, eloStart, eloEnd, profileMap, weeklyMatches);

    const mvpCandidates = Object.values(weeklyStats).map((s) => ({
      ...s,
      score: s.eloDelta + (s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 15 : 0) + s.matchesPlayed * 0.5,
      periodEloGain: s.eloDelta,
      eloNet: s.currentElo
    } as MvpCandidate));

    const mvp = getMvpWinner(mvpCandidates);
    const highlight = findWeekHighlight(weeklyMatches, eloEnd, eloStart, profileMap);

    const previousRanks = new Map(
      Object.values(eloStart)
        .sort((a, b) => b.elo - a.elo)
        .map((player, index) => [player.id, index + 1])
    );

    const leaderboard = Object.values(eloEnd)
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 5)
      .map((player, index) => {
        const currentRank = index + 1;
        const previousRank = previousRanks.get(player.id);
        const movement = previousRank ? previousRank - currentRank : 0;
        const trend = movement > 0 ? "up" : movement < 0 ? "down" : "same";
        const avatarUrl = profileMap.get(player.id)?.avatar_url || null;
        return {
          id: player.id,
          name: player.name,
          elo: player.elo,
          rank: currentRank,
          trend: trend as "up" | "down" | "same",
          avatarUrl,
        };
      });

    // Encapsulate email generation and sending logic
    const processPlayer = async (id: string): Promise<EmailResult> => {
      const email = emailMap.get(id) ?? profileEmailMap.get(id);
      const name = profileNameMap.get(id) ?? "Okänd";
      const authUser = authUserMap.get(id);
      if (!email) {
        const missingEmailError = !authUser
          ? "No auth user"
          : !authUser.email
            ? "Auth user email empty"
            : "Email not found";
        return { id, name, success: false, error: missingEmailError };
      }
      const stats = weeklyStats[id];

      const html = generateEmailHtml(stats, mvp, highlight, leaderboard, weekLabel);

      if (previewOnly) {
        return { id, name, success: true, previewHtml: html };
      }

      const result = await sendEmailWithRetry(email, html, weekLabel, resendApiKey);

      if (!result.ok) {
        console.error(`Failed to send email to ${email}:`, result.errorMessage);
        return { id, name, success: false, error: result.errorMessage };
      } else {
        return { id, name, success: true };
      }
    };

    let emailResults: EmailResult[] = [];
    let previewHtml: string | null = null;

    if (previewOnly) {
      const id = Array.from(activePlayerIds)[0];
      if (id) {
        const result = await processPlayer(id);
        if (result.previewHtml) previewHtml = result.previewHtml;
        emailResults.push(result);
      }
    } else {
      const limit = pLimit(5);
      emailResults = await Promise.all(
        Array.from(activePlayerIds).map(id => limit(() => processPlayer(id)))
      );
    }

    if (previewOnly) {
      return new Response(JSON.stringify({
        success: true,
        previewHtml,
        total: 1,
        sent: previewHtml ? 1 : 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const successfulCount = emailResults.filter(r => r.success).length;
    console.log(`Successfully sent ${successfulCount}/${emailResults.length} emails`);

    return new Response(JSON.stringify({
      success: true,
      sent: successfulCount,
      total: emailResults.length,
      errors: emailResults.filter(r => !r.success)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Function error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: message });
  }
});
