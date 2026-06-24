import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const statusByEvent: Record<string, "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED"> = {
  PAYMENT_CONFIRMED: "ACTIVE",
  PAYMENT_RECEIVED: "ACTIVE",
  PAYMENT_CREATED: "TRIAL",
  PAYMENT_OVERDUE: "PAST_DUE",
  PAYMENT_DELETED: "CANCELED",
  PAYMENT_REFUNDED: "CANCELED",
  SUBSCRIPTION_DELETED: "CANCELED",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (webhookToken) {
      const receivedToken = req.headers.get("asaas-access-token");
      if (receivedToken !== webhookToken) return json({ error: "Webhook não autorizado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Webhook não configurado." }, 500);

    const payload = await req.json();
    const event = String(payload?.event || "");
    const payment = payload?.payment || {};
    const subscriptionId = payment.subscription || payload?.subscription?.id;
    const companyId = payment.externalReference || payload?.subscription?.externalReference;
    const status = statusByEvent[event];

    if (!status) return json({ received: true, ignored: true });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let query = adminClient.from("subscriptions").update({ status }).select("id");
    if (subscriptionId) query = query.eq("external_subscription_id", subscriptionId);
    else if (companyId) query = query.eq("company_id", companyId);
    else return json({ received: true, ignored: true });

    const { error } = await query;
    if (error) return json({ error: "Não foi possível atualizar assinatura." }, 500);

    return json({ received: true });
  } catch (_error) {
    return json({ error: "Erro inesperado no webhook." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
