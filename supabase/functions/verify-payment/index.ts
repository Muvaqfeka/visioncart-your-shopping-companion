import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // Verify role (admin OR worker)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "worker");
    if (!allowed) return json({ error: "Forbidden — admin/worker only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { order_id, decision, delivery_status } = body as {
      order_id?: string;
      decision?: "approve" | "reject";
      delivery_status?: "placed" | "packed" | "out_for_delivery" | "delivered";
    };
    if (!order_id) return json({ error: "order_id required" }, 400);

    const patch: Record<string, unknown> = {};
    if (decision === "approve") {
      patch.payment_status = "paid";
      patch.verified_by = user.id;
      patch.verified_at = new Date().toISOString();
    } else if (decision === "reject") {
      patch.payment_status = "failed";
      patch.verified_by = user.id;
      patch.verified_at = new Date().toISOString();
    }
    if (delivery_status) patch.delivery_status = delivery_status;

    if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);

    const { data, error } = await admin
      .from("orders")
      .update(patch)
      .eq("id", order_id)
      .select()
      .single();

    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, order: data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
