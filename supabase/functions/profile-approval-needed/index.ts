import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const postmarkToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
const postmarkFrom = Deno.env.get("POSTMARK_FROM");
const postmarkTo = Deno.env.get("POSTMARK_TO");
const templateAlias = Deno.env.get("POSTMARK_TEMPLATE_ALIAS") ?? "approval-needed";
const approvalDashboardUrl = Deno.env.get("APPROVAL_DASHBOARD_URL") ?? "";
const functionKey = Deno.env.get("PROFILE_APPROVAL_FUNCTION_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!functionKey) {
    return new Response("Missing function key", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${functionKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || !payload.user_id) {
    return new Response("Invalid payload", { status: 400 });
  }

  if (!postmarkToken || !postmarkFrom || !postmarkTo) {
    return new Response("Postmark not configured", { status: 500 });
  }

  const templateModel = {
    user_id: payload.user_id,
    email: payload.email ?? "",
    name: payload.name ?? "",
    approval_dashboard_url: approvalDashboardUrl,
  };

  const postmarkResponse = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": postmarkToken,
    },
    body: JSON.stringify({
      From: postmarkFrom,
      To: postmarkTo,
      TemplateAlias: templateAlias,
      TemplateModel: templateModel,
    }),
  });

  if (!postmarkResponse.ok) {
    const errorBody = await postmarkResponse.text();
    return new Response(
      JSON.stringify({
        error: "Postmark request failed",
        details: errorBody,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
