import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { StatCard } from "../components/ui";
import { commissionRate, formatMoney, monthRange } from "../lib/format";
import type { ClientProject, FinancialSale } from "../lib/types";
import { getProjects, getSales, stageTitle } from "./data";

export function Dashboard({ ctx }: { ctx: AppContext }) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [sales, setSales] = useState<FinancialSale[]>([]);

  useEffect(() => {
    if (!ctx.profile.company_id) return;
    getProjects(ctx.profile.company_id, undefined, ctx.profile).then(({ data }) => setProjects(data || []));
    getSales(ctx.profile.company_id, ctx.profile.role === "ADMIN_EMPRESA" ? undefined : ctx.profile).then(({ data }) => setSales(data || []));
  }, [ctx.profile.company_id, ctx.profile.id]);

  const now = new Date();
  const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1);
  const monthSales = sales.filter((sale) => sale.sale_date >= start && sale.sale_date <= end);
  const totalSold = monthSales.reduce((sum, sale) => sum + sale.sold_value, 0);
  const totalReceived = sales.flatMap((sale) => sale.payments || []).filter((payment) => payment.payment_date >= start && payment.payment_date <= end).reduce((sum, payment) => sum + payment.amount, 0);
  const rate = commissionRate(totalReceived);

  const counts = useMemo(() => projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.current_stage] = (acc[project.current_stage] || 0) + 1;
    return acc;
  }, {}), [projects]);

  const recent = projects.slice(0, 6);

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ctx.profile.role === "ADMIN_EMPRESA" ? (
          <>
            <StatCard label="Projetos em andamento" value={projects.filter((p) => p.current_stage !== "FINALIZADO").length} />
            <StatCard label="Total de venda mês" value={formatMoney(totalSold)} />
            <StatCard label="Total que entrou no mês" value={formatMoney(totalReceived)} />
            <StatCard label="Valor da comissão do mês" value={formatMoney(totalReceived * rate)} detail={`${Math.round(rate * 100)}% aplicado`} />
          </>
        ) : ctx.profile.role === "PROJETISTA" ? (
          <>
            <StatCard label="Meus projetos" value={projects.length} />
            <StatCard label="Minhas negociações" value={counts.NEGOCIACAO || 0} />
            <StatCard label="Meu total fechado" value={formatMoney(totalSold)} />
            <StatCard label="Meu percentual atingido" value="Ver Minha Meta" />
          </>
        ) : (
          <>
            <StatCard label="Conferências pendentes" value={counts.CONFERENCIA || 0} />
            <StatCard label="Itens em montagem" value={counts.MONTAGEM || 0} />
            <StatCard label="Assistências abertas" value={counts.ASSISTENCIA || 0} />
            <StatCard label="Prazos importantes" value={projects.filter((p) => p.billing_date || p.assembly_finished_date).length} />
          </>
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-bold">Etapas operacionais</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(["PROJETO", "NEGOCIACAO", "CONFERENCIA", "MONTAGEM", "ASSISTENCIA", "FINALIZADO"] as const).map((stage) => (
              <div key={stage} className="rounded-md bg-fog p-4">
                <span className="text-sm text-ink/60">{stageTitle[stage]}</span>
                <strong className="mt-1 block text-2xl">{counts[stage] || 0}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-4">
          <h2 className="font-bold">Últimas movimentações</h2>
          <div className="mt-3 grid gap-3">
            {recent.map((project) => (
              <article key={project.id} className="rounded-md border border-line p-3 text-sm">
                <strong>{project.project_name}</strong>
                <span className="block text-ink/60">{project.client_name} · {stageTitle[project.current_stage]}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
