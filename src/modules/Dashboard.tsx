import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { inputClass, StatCard } from "../components/ui";
import { commissionRate, formatMoney, monthRange } from "../lib/format";
import type { ClientProject, FinancialSale } from "../lib/types";
import { getProjects, getSales, stageTitle } from "./data";

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
  { key: "custom", label: "Personalizado" },
];

function dateInput(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function periodRange(period: PeriodKey, customStart: string, customEnd: string) {
  const now = new Date();
  if (period === "today") {
    const today = dateInput(now);
    return { start: today, end: today, label: "hoje" };
  }
  if (period === "week") {
    const startDate = new Date(now);
    const day = startDate.getDay() || 7;
    startDate.setDate(startDate.getDate() - day + 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return { start: dateInput(startDate), end: dateInput(endDate), label: "semana" };
  }
  if (period === "year") {
    const year = now.getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: "ano" };
  }
  if (period === "custom") {
    return { start: customStart, end: customEnd, label: "período" };
  }
  const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1);
  return { start, end, label: "mês" };
}

function inRange(date: string | null | undefined, start: string, end: string) {
  if (!date) return false;
  const value = date.slice(0, 10);
  return value >= start && value <= end;
}

export function Dashboard({ ctx }: { ctx: AppContext }) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [sales, setSales] = useState<FinancialSale[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState(dateInput(new Date()));
  const [customEnd, setCustomEnd] = useState(dateInput(new Date()));

  useEffect(() => {
    if (!ctx.profile.company_id) return;
    getProjects(ctx.profile.company_id, undefined, ctx.profile).then(({ data }) => setProjects(data || []));
    getSales(ctx.profile.company_id, ctx.profile.role === "ADMIN_EMPRESA" ? undefined : ctx.profile).then(({ data }) => setSales(data || []));
  }, [ctx.profile.company_id, ctx.profile.id, ctx.profile.role]);

  const { start, end, label: periodLabel } = useMemo(() => periodRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const periodSales = sales.filter((sale) => inRange(sale.sale_date, start, end));
  const periodProjects = projects.filter((project) => inRange(project.updated_at, start, end));
  const totalSold = periodSales.reduce((sum, sale) => sum + sale.sold_value, 0);
  const totalReceived = sales.flatMap((sale) => sale.payments || []).filter((payment) => inRange(payment.payment_date, start, end)).reduce((sum, payment) => sum + payment.amount, 0);
  const rate = commissionRate(totalReceived);

  const counts = useMemo(() => periodProjects.reduce<Record<string, number>>((acc, project) => {
    acc[project.current_stage] = (acc[project.current_stage] || 0) + 1;
    return acc;
  }, {}), [periodProjects]);

  const recent = periodProjects.slice(0, 6);

  return (
    <section className="grid gap-6">
      <section className="rounded-lg border border-line bg-white p-4">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-bold">Visão geral do negócio</h2>
            <p className="mt-1 text-sm text-ink/60">Indicadores filtrados por período.</p>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full max-w-2xl flex-nowrap overflow-x-auto rounded-md border border-line bg-fog p-1 text-sm">
              {periodOptions.map((option) => (
                <button
                  key={option.key}
                  className={`min-h-9 flex-1 whitespace-nowrap rounded px-3 font-semibold transition ${period === option.key ? "bg-white text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
                  onClick={() => setPeriod(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {period === "custom" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={inputClass} type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} aria-label="Data inicial" />
                <input className={inputClass} type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} aria-label="Data final" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ctx.profile.role === "ADMIN_EMPRESA" ? (
          <>
            <StatCard label={`Projetos em andamento no ${periodLabel}`} value={periodProjects.filter((p) => p.current_stage !== "FINALIZADO").length} />
            <StatCard label={`Total de venda no ${periodLabel}`} value={formatMoney(totalSold)} />
            <StatCard label={`Total que entrou no ${periodLabel}`} value={formatMoney(totalReceived)} />
            <StatCard label={`Valor da comissão no ${periodLabel}`} value={formatMoney(totalReceived * rate)} detail={`${Math.round(rate * 100)}% aplicado`} />
          </>
        ) : ctx.profile.role === "PROJETISTA" ? (
          <>
            <StatCard label={`Meus projetos no ${periodLabel}`} value={periodProjects.length} />
            <StatCard label={`Minhas negociações no ${periodLabel}`} value={counts.NEGOCIACAO || 0} />
            <StatCard label={`Meu total fechado no ${periodLabel}`} value={formatMoney(totalSold)} />
            <StatCard label="Meu percentual atingido" value="Ver Minha Meta" />
          </>
        ) : (
          <>
            <StatCard label={`Conferências pendentes no ${periodLabel}`} value={counts.CONFERENCIA || 0} />
            <StatCard label={`Itens em montagem no ${periodLabel}`} value={counts.MONTAGEM || 0} />
            <StatCard label={`Assistências abertas no ${periodLabel}`} value={counts.ASSISTENCIA || 0} />
            <StatCard label={`Prazos importantes no ${periodLabel}`} value={periodProjects.filter((p) => p.billing_date || p.assembly_finished_date).length} />
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
            {recent.length ? recent.map((project) => (
              <article key={project.id} className="rounded-md border border-line p-3 text-sm">
                <strong>{project.project_name}</strong>
                <span className="block text-ink/60">{project.client_name} · {stageTitle[project.current_stage]}</span>
              </article>
            )) : (
              <div className="rounded-md border border-line p-3 text-sm text-ink/60">Nenhuma movimentação nesse período.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
