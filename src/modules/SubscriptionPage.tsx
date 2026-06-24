import { Check } from "lucide-react";
import type { AppContext } from "../App";
import { Button, StatCard } from "../components/ui";
import { supabase } from "../lib/supabase";
import { includedFeatures, planById, planLabel, plans, type PlanId } from "../lib/plans";

export function SubscriptionPage({ ctx, blocked = false }: { ctx: AppContext; blocked?: boolean }) {
  const sub = ctx.subscription;
  const selected = ctx.selectedPlan ? planById(ctx.selectedPlan) : null;

  async function startCheckout(planId: PlanId) {
    const { data, error } = await supabase.functions.invoke("create-asaas-checkout", {
      body: { planId },
    });

    if (error) {
      ctx.toast("error", "Não foi possível iniciar o checkout. Tente novamente.");
      return;
    }

    if (data?.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      ctx.toast("error", "Checkout ainda não retornou uma URL válida.");
    }
  }

  return (
    <section className="grid gap-5">
      {blocked ? <div className="rounded-lg border border-clay bg-clay/10 p-5 text-clay">Assinatura cancelada ou bloqueada. Regularize o plano para liberar os módulos principais.</div> : null}
      {selected && sub?.status !== "ACTIVE" ? (
        <div className="rounded-lg border border-moss bg-white p-5">
          <h2 className="font-bold">Você escolheu o plano {selected.name}</h2>
          <p className="mt-1 text-sm text-ink/65">Finalize sua assinatura para ativar sua conta.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => startCheckout(selected.id)}>Finalizar assinatura</Button>
            <Button type="button" variant="secondary" onClick={ctx.clearSelectedPlan}>Escolher depois</Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Plano atual" value={sub ? planLabel(sub.plan) : "Sem plano"} />
        <StatCard label="Status" value={sub?.status || "Pendente"} />
        <StatCard label="Período atual" value={sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "-"} />
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-bold">Planos Arquidesk</h2>
        <p className="mt-1 text-sm text-ink/65">Todos os planos incluem todas as funcionalidades. Escolha apenas de acordo com o tamanho da sua equipe.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.id} className={`relative rounded-lg border bg-white p-5 shadow-sm ${plan.highlighted ? "border-moss ring-2 ring-moss/20" : "border-line"}`}>
            {plan.badge ? <span className="absolute right-4 top-4 rounded-full bg-clay px-3 py-1 text-xs font-black text-white">{plan.badge}</span> : null}
            <h3 className="text-xl font-black">{plan.name}</h3>
            <p className="mt-3 text-3xl font-black">{plan.priceLabel}</p>
            <p className="mt-2 text-sm font-bold text-moss">{plan.users}</p>
            <p className="mt-3 text-sm text-ink/65">{plan.description}</p>
            <ul className="mt-5 grid gap-2 text-sm text-ink/70">
              {includedFeatures.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-moss" /> {feature}</li>)}
            </ul>
            <Button className="mt-5 w-full" variant={plan.highlighted ? "primary" : "secondary"} onClick={() => startCheckout(plan.id)}>
              Começar agora
            </Button>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white p-5 text-sm text-ink/70">
        <strong className="text-ink">Usuários adicionais:</strong> R$ 49/mês por usuário. Todas as funcionalidades continuam liberadas em todos os planos.
      </div>
    </section>
  );
}
