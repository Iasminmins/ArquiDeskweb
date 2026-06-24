import type { AppContext } from "../App";
import { StatCard } from "../components/ui";

export function SubscriptionPage({ ctx, blocked = false }: { ctx: AppContext; blocked?: boolean }) {
  const sub = ctx.subscription;
  return (
    <section className="grid gap-5">
      {blocked ? <div className="rounded-lg border border-clay bg-clay/10 p-5 text-clay">Assinatura cancelada ou bloqueada. Regularize o plano para liberar os módulos principais.</div> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Plano atual" value={sub?.plan || "Sem plano"} />
        <StatCard label="Status" value={sub?.status || "Pendente"} />
        <StatCard label="Período atual" value={sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "-"} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {["ESSENCIAL", "PROFISSIONAL", "PREMIUM"].map((plan) => (
          <article key={plan} className="rounded-lg border border-line bg-white p-5">
            <h3 className="font-bold">{plan}</h3>
            <p className="mt-2 text-sm text-ink/60">{plan === "ESSENCIAL" ? "Até 2 projetistas e recursos principais." : plan === "PROFISSIONAL" ? "Metas, ranking, histórico e relatórios básicos." : "Mais usuários, relatórios avançados e suporte prioritário."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
