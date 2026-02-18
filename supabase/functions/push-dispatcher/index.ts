
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "npm:web-push@3.6.7";

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

// Simple p-limit implementation for concurrency control
const pLimit = (concurrency: number) => {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  const run = async <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    activeCount++;
    const result = (async () => fn())();
    try {
      const res = await result;
      resolve(res);
    } catch (err) {
      reject(err);
    }
    next();
  };

  const enqueue = <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    queue.push(run.bind(null, fn, resolve, reject));
    if (activeCount < concurrency && queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => enqueue(fn, resolve, reject));
};

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
    console.log("Push dispatcher started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY") || Deno.env.get("VITE_WEB_PUSH_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY") || Deno.env.get("VITE_WEB_PUSH_PRIVATE_KEY");

    const missingEnvVars = [];
    if (!supabaseUrl) missingEnvVars.push("SUPABASE_URL");
    if (!supabaseServiceKey) missingEnvVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!vapidPublicKey) missingEnvVars.push("WEB_PUSH_PUBLIC_KEY/VITE_WEB_PUSH_PUBLIC_KEY");
    if (!vapidPrivateKey) missingEnvVars.push("WEB_PUSH_PRIVATE_KEY/VITE_WEB_PUSH_PRIVATE_KEY");

    if (missingEnvVars.length > 0) {
      console.error("Missing environment variables:", missingEnvVars.join(", "));
      return new Response(
        JSON.stringify({ error: `Server configuration error: Missing secrets: ${missingEnvVars.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      // Configure web-push
      webpush.setVapidDetails(
        "mailto:admin@padelapp.com",
        vapidPublicKey!,
        vapidPrivateKey!
      );
    } catch (e) {
      console.error("Failed to configure web-push:", e);
      return new Response(
        JSON.stringify({ error: "Failed to configure web-push VAPID keys. Check your secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    let payload;
    try {
        payload = await req.json();
    } catch (e) {
        console.error("Failed to parse request JSON:", e);
        return new Response(
            JSON.stringify({ error: "Invalid JSON payload" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Verify this is a valid INSERT event
    // The payload structure is { type: 'INSERT', table: 'matches', record: { ... } }
    const { type, table, record } = payload;

    if (type !== "INSERT" || !record || !table) {
      console.log("Invalid payload or not an INSERT event, skipping.", { type, table });
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
      route = "/matchhistory";
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
      route = "/schema"; // Or deep link if available
    } else if (table === "availability_polls") {
      const poll = record;
      // Polls are created by admins usually.
      title = "Ny tillgänglighetspoll!";
      body = "Nu kan du rösta på tider för kommande vecka.";
      eventType = "availability_poll_reminder"; // Using existing type for "Poll" events
      route = "/schema";
    } else {
       console.log(`Unsupported table: ${table}, skipping.`);
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

    if (subError) {
        console.error("Error fetching subscriptions:", subError);
        throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found.");
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

    if (prefError) {
        console.error("Error fetching preferences:", prefError);
        throw prefError;
    }

    const prefsMap = new Map<string, NotificationPreferences>();
    preferences?.forEach((row: any) => {
      // Normalize preferences if needed, but assuming stored structure is correct
      prefsMap.set(row.profile_id, row.preferences);
    });

    // Send notifications
    const limit = pLimit(5);
    const tokensToDelete: string[] = [];
    const results = await Promise.all(
      subscriptions.map((sub: PushSubscriptionRow) => limit(async () => {
        const prefs = prefsMap.get(sub.profile_id);

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
            // Subscription is gone, mark for removal
            tokensToDelete.push(sub.device_token);
            return { status: "removed" };
          }
          console.error(`Failed to send to user ${sub.profile_id}:`, err);
          return { status: "error", error: err.message };
        }
      }))
    );

    if (tokensToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("device_token", tokensToDelete)
        .eq("platform", "web");

      if (deleteError) {
        console.error("Failed to bulk delete subscriptions:", deleteError);
      } else {
        console.log(`Bulk removed ${tokensToDelete.length} invalid subscriptions.`);
      }
    }

    const sentCount = results.filter(r => r.status === "sent").length;
    const removedCount = results.filter(r => r.status === "removed").length;

    console.log(`Processed ${results.length} subscriptions. Sent: ${sentCount}, Removed: ${removedCount}`);

    return new Response(
      JSON.stringify({ message: `Processed ${results.length} subscriptions. Sent: ${sentCount}, Removed: ${removedCount}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in push-dispatcher:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({ error: errorMessage, stack: errorStack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
