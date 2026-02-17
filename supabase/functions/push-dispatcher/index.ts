
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

    // Verify this is a match insert event
    // Note: The payload structure depends on how the trigger sends it.
    // If using pg_net with json_build_object('type', 'INSERT', 'record', ...), it will be { type, record }.
    const { type, record } = payload;

    if (type !== "INSERT" || !record) {
      return new Response(
        JSON.stringify({ message: "Not a match INSERT event, skipping." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = record;
    const creatorId = match.created_by;

    // Construct notification content
    const team1Name = Array.isArray(match.team1) ? match.team1.join(" & ") : match.team1;
    const team2Name = Array.isArray(match.team2) ? match.team2.join(" & ") : match.team2;
    const title = "Ny match registrerad!";
    const body = `${team1Name} vs ${team2Name}: ${match.team1_sets} - ${match.team2_sets}`;
    const eventType = "match_result_new";

    console.log(`Processing match ${match.id} from user ${creatorId}`);

    // Fetch all push subscriptions for other users
    // We only target 'web' platform here as 'ios' requires APNs (unless using web-push for iOS PWA).
    // Note: iOS 16.4+ supports Web Push if installed as PWA. They will have platform='web' in that case?
    // The frontend sends platform='web' for PWA.

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("profile_id, platform, device_token, subscription")
      .eq("platform", "web")
      .neq("profile_id", creatorId);

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
              route: `/matches/${match.id}`, // Deep link to match
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
