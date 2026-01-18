import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ApprovalPayload = {
  user_id: string;
  is_approved: boolean;
  profile_name?: string | null;
  club_name?: string | null;
};

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("RESEND_FROM") ?? "Padel App <noreply@padel.app>";
  const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://padel.app";
  const defaultClubName = Deno.env.get("CLUB_NAME");

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return new Response("Missing required environment variables", { status: 500 });
  }

  let payload: ApprovalPayload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(`Invalid JSON payload: ${error}`, { status: 400 });
  }

  if (!payload.user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.getUserById(payload.user_id);
  if (error || !data?.user?.email) {
    return new Response("Unable to resolve user email", { status: 404 });
  }

  const clubName = payload.club_name ?? defaultClubName ?? "Padel Club";
  const approvalText = payload.is_approved
    ? "Din profil är nu godkänd och du kan börja boka matcher direkt."
    : "Din profil har blivit återkallad och du behöver kontakta en admin för mer info.";
  const subject = payload.is_approved
    ? `${clubName}: din profil är godkänd!`
    : `${clubName}: din profil är återkallad`;

  const text = `Hej ${payload.profile_name ?? ""}\n\n${approvalText}\n\nNästa steg:\n- Logga in på appen: ${appUrl}\n- Uppdatera din profil om något saknas\n- Kontakta klubben vid frågor\n\nHälsningar,\n${clubName}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>${subject}</h2>
      <p>Hej ${payload.profile_name ?? ""},</p>
      <p>${approvalText}</p>
      <p><strong>Nästa steg</strong></p>
      <ul>
        <li>Logga in på appen: <a href="${appUrl}">${appUrl}</a></li>
        <li>Uppdatera din profil om något saknas</li>
        <li>Kontakta klubben vid frågor</li>
      </ul>
      <p>Hälsningar,<br />${clubName}</p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: data.user.email,
      subject,
      html,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    return new Response(`Resend error: ${errorBody}`, { status: 502 });
  }

  return new Response("ok", { status: 200 });
});
