
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPreferences {
  enabled: boolean;
  eventToggles: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

interface PushSubscriptionRow {
  profile_id: string;
  platform: string;
  device_token: string;
  subscription: any; // The full PushSubscription JSON object
}

interface NotificationPreferenceRow {
  profile_id: string;
  preferences: NotificationPreferences;
}

// Helper to check quiet hours
function isQuietHoursActive(preferences: NotificationPreferences, now = new Date()): boolean {
  if (!preferences.quietHours?.enabled) return false;
  const startHour = Number(preferences.quietHours.startHour ?? 22);
  const endHour = Number(preferences.quietHours.endHour ?? 7);
  const hour = now.getHours();

  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY") || Deno.env.get("VITE_WEB_PUSH_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(
      "mailto:admin@padelapp.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();

    // Verify this is a valid INSERT event
    // The payload structure is { type: 'INSERT', table: 'matches', record: { ... } }
    const { type, table, record } = payload;

    if (type !== "INSERT" || !record || !table) {
      return new Response(
        JSON.stringify({ message: "Invalid payload or not an INSERT event, skipping." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let title = "";
    let body = "";
    let eventType = "";
    let route = "/";
    let creatorId: string | null = null;

    if (table === "matches") {
      const match = record;
      creatorId = match.created_by;
      const team1Name = Array.isArray(match.team1) ? match.team1.join(" & ") : match.team1;
      const team2Name = Array.isArray(match.team2) ? match.team2.join(" & ") : match.team2;
      title = "Ny match registrerad!";
      body = `${team1Name} vs ${team2Name}: ${match.team1_sets} - ${match.team2_sets}`;
      eventType = "match_result_new";
      route = `/matches/${match.id}`;
    } else if (table === "availability_scheduled_games") {
      const game = record;
      // Scheduled games don't have a direct 'created_by' in the schema shown,
      // but usually associated with a poll. We'll broadcast to all.
      // If we want to exclude someone, we'd need that info.
      // Assuming open broadcast for now as per instructions.
      title = "Ny schemalagd match!";
      // Format date/time if possible
      const date = new Date(game.date).toLocaleDateString('sv-SE');
      const time = game.start_time ? game.start_time.substring(0, 5) : "";
      body = `En match har bokats ${date} kl ${time}. ${game.location ? `Plats: ${game.location}` : ""}`;
      eventType = "scheduled_match_new";
      route = "/schedule"; // Or deep link if available
    } else if (table === "availability_polls") {
      const poll = record;
      // Polls are created by admins usually.
      title = "Ny tillgänglighetspoll!";
      body = "Nu kan du rösta på tider för kommande vecka.";
      eventType = "availability_poll_reminder"; // Using existing type for "Poll" events
      route = "/availability";
    } else {
       return new Response(
        JSON.stringify({ message: `Unsupported table: ${table}, skipping.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${eventType} for table ${table}`);

    // Fetch all push subscriptions for other users
    // We only target 'web' platform here as 'ios' requires APNs (unless using web-push for iOS PWA).

    let query = supabase
      .from("push_subscriptions")
      .select("profile_id, platform, device_token, subscription")
      .eq("platform", "web");

    if (creatorId) {
      query = query.neq("profile_id", creatorId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch notification preferences for these users
    const userIds = [...new Set(subscriptions.map(s => s.profile_id))];
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("profile_id, preferences")
      .in("profile_id", userIds);

    if (prefError) throw prefError;

    const prefsMap = new Map<string, NotificationPreferences>();
    preferences?.forEach((row: any) => {
      // Normalize preferences if needed, but assuming stored structure is correct
      prefsMap.set(row.profile_id, row.preferences);
    });

    // Send notifications
    const results = await Promise.all(
      subscriptions.map(async (sub: PushSubscriptionRow) => {
        const prefs = prefsMap.get(sub.profile_id);

        // Default to enabled if no preferences found?
        // Codebase seems to imply default enabled.
        // But let's check strict enabled check if prefs exist.
        // If prefs don't exist, we might skip or default to true.
        // Based on `webNotificationService.ts`, default is enabled.

        const isEnabled = prefs ? prefs.enabled : true;
        const isEventEnabled = prefs ? (prefs.eventToggles?.[eventType] ?? true) : true;

        if (!isEnabled || !isEventEnabled) {
          return { status: "skipped", reason: "disabled" };
        }

        if (prefs && isQuietHoursActive(prefs)) {
          return { status: "skipped", reason: "quiet_hours" };
        }

        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title,
              body,
              eventType,
              route,
            })
          );
          return { status: "sent" };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription is gone, remove it
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("device_token", sub.device_token)
              .eq("platform", "web");
            return { status: "removed" };
          }
          console.error(`Failed to send to user ${sub.profile_id}:`, err);
          return { status: "error", error: err.message };
        }
      })
    );

    const sentCount = results.filter(r => r.status === "sent").length;
    const removedCount = results.filter(r => r.status === "removed").length;

    return new Response(
      JSON.stringify({ message: `Processed ${results.length} subscriptions. Sent: ${sentCount}, Removed: ${removedCount}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in push-dispatcher:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
