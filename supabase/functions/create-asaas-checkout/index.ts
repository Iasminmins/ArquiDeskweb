import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PlanId = "start" | "professional" | "business";

const plans: Record<PlanId, { name: string; amount: number; users: number; legacyPlan: "ESSENCIAL" | "PROFISSIONAL" | "PREMIUM" }> = {
  start: { name: "Start", amount: 149, users: 3, legacyPlan: "ESSENCIAL" },
  professional: { name: "Profissional", amount: 297, users: 8, legacyPlan: "PROFISSIONAL" },
  business: { name: "Business", amount: 497, users: 15, legacyPlan: "PREMIUM" },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasBaseUrl = Deno.env.get("ASAAS_BASE_URL") || "https://api-sandbox.asaas.com/v3";
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !asaasApiKey) {
      return json({ error: "Backend de checkout não configurado." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Usuário não autenticado." }, 401);

    const body = await req.json();
    const planId = body?.planId as PlanId;
    const plan = plans[planId];
    if (!plan) return json({ error: "Plano inválido." }, 400);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id,company_id,name,email")
      .eq("id", userData.user.id)
      .single();
    if (profileError || !profile?.company_id) return json({ error: "Perfil não encontrado." }, 404);

    const { data: company } = await adminClient
      .from("companies")
      .select("id,name,email,phone,document")
      .eq("id", profile.company_id)
      .single();

    const customerResponse = await fetch(`${asaasBaseUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        name: company?.name || profile.name,
        email: company?.email || profile.email,
        mobilePhone: company?.phone || undefined,
        cpfCnpj: company?.document || undefined,
      }),
    });
    const customer = await customerResponse.json();
    if (!customerResponse.ok) return json({ error: "Não foi possível criar cliente no Asaas.", details: customer }, 502);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const subscriptionResponse = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType: "UNDEFINED",
        value: plan.amount,
        nextDueDate: dueDate.toISOString().slice(0, 10),
        cycle: "MONTHLY",
        description: `Arquidesk ${plan.name} - até ${plan.users} usuários`,
        externalReference: profile.company_id,
      }),
    });
    const subscription = await subscriptionResponse.json();
    if (!subscriptionResponse.ok) return json({ error: "Não foi possível criar assinatura no Asaas.", details: subscription }, 502);

    const checkoutUrl = subscription.invoiceUrl || subscription.bankSlipUrl || `${appUrl}/assinatura`;
    await adminClient.from("subscriptions").upsert({
      company_id: profile.company_id,
      plan: plan.legacyPlan,
      status: "TRIAL",
      provider: "asaas",
      external_customer_id: customer.id,
      external_subscription_id: subscription.id,
      checkout_url: checkoutUrl,
      selected_plan_key: planId,
      trial_ends_at: dueDate.toISOString().slice(0, 10),
    }, { onConflict: "company_id" });

    return json({ checkoutUrl });
  } catch (_error) {
    return json({ error: "Erro inesperado ao iniciar checkout." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
