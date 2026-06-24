import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { Button, Field, inputClass, StatCard } from "../components/ui";
import { formatMoney, monthRange } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { DesignerGoal, FinancialSale, Profile } from "../lib/types";
import { getDesigners, getSales } from "./data";

export function GoalsPage({ ctx, mode }: { ctx: AppContext; mode: "goals" | "my-goal" | "team-goals" }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [goals, setGoals] = useState<DesignerGoal[]>([]);
  const [sales, setSales] = useState<FinancialSale[]>([]);
  const [designers, setDesigners] = useState<Pick<Profile, "id" | "name" | "email">[]>([]);
  const [designerId, setDesignerId] = useState("");
  const [amount, setAmount] = useState("");

  async function load() {
    if (!ctx.profile.company_id) return;
    const [{ data: goalsData }, { data: salesData }, { data: designersData }] = await Promise.all([
      supabase.from("designer_goals").select("*, designer:profiles!designer_goals_designer_id_fkey(id,name,email)").eq("company_id", ctx.profile.company_id).eq("month", month).eq("year", year).returns<DesignerGoal[]>(),
      getSales(ctx.profile.company_id, mode === "my-goal" ? ctx.profile : undefined),
      getDesigners(ctx.profile.company_id),
    ]);
    setGoals(goalsData || []);
    setSales(salesData || []);
    setDesigners(designersData || []);
  }

  useEffect(() => {
    load();
  }, [ctx.profile.company_id, ctx.profile.id, month, year, mode]);

  const { start, end } = monthRange(year, month);
  const rows = useMemo(() => {
    const allowedDesigners = mode === "my-goal" ? designers.filter((d) => d.id === ctx.profile.id) : designers;
    return allowedDesigners.map((designer) => {
      const goal = goals.find((item) => item.designer_id === designer.id)?.goal_amount || 0;
      const designerSales = sales.filter((sale) => sale.designer_id === designer.id && sale.sale_date >= start && sale.sale_date <= end);
      const closed = designerSales.reduce((sum, sale) => sum + sale.sold_value, 0);
      return {
        designer,
        goal,
        closed,
        missing: Math.max(0, goal - closed),
        percent: goal ? Math.round((closed / goal) * 100) : 0,
        count: designerSales.length,
        ticket: designerSales.length ? closed / designerSales.length : 0,
      };
    });
  }, [designers, goals, sales, start, end, mode, ctx.profile.id]);

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!ctx.profile.company_id) return;
    const { error } = await supabase.from("designer_goals").upsert({
      company_id: ctx.profile.company_id,
      designer_id: designerId,
      month,
      year,
      goal_amount: Number(amount),
    }, { onConflict: "company_id,designer_id,month,year" });
    if (error) return ctx.toast("error", error.message);
    ctx.toast("success", "Meta atualizada com sucesso.");
    setDesignerId("");
    setAmount("");
    load();
  }

  const first = rows[0];
  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-end">
        <Field label="Mês"><input className={inputClass} type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></Field>
        <Field label="Ano"><input className={inputClass} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
      </div>
      {mode === "my-goal" && first ? (
        <div className="grid gap-3 md:grid-cols-5">
          <StatCard label="Minha meta do mês" value={formatMoney(first.goal)} />
          <StatCard label="Meu total fechado" value={formatMoney(first.closed)} />
          <StatCard label="Quanto falta" value={formatMoney(first.missing)} />
          <StatCard label="Percentual atingido" value={`${first.percent}%`} />
          <StatCard label="Meu ticket médio" value={formatMoney(first.ticket)} />
        </div>
      ) : null}
      {mode === "goals" ? (
        <form onSubmit={saveGoal} className="grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[1fr_180px_auto] md:items-end">
          <Field label="Projetista"><select className={inputClass} value={designerId} onChange={(e) => setDesignerId(e.target.value)} required><option value="">Selecione</option>{designers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Valor da meta"><input className={inputClass} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Button>Salvar meta</Button>
        </form>
      ) : null}
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line p-4 font-bold">{mode === "my-goal" ? "Meus projetos fechados" : "Ranking operacional"}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-fog text-xs uppercase text-ink/60"><tr><th className="p-3">Projetista</th><th className="p-3">Meta</th><th className="p-3">Fechado no mês</th><th className="p-3">Falta</th><th className="p-3">% atingido</th><th className="p-3">Qtd.</th><th className="p-3">Ticket médio</th></tr></thead>
            <tbody>{rows.sort((a, b) => b.closed - a.closed).map((row) => <tr key={row.designer.id} className="border-t border-line"><td className="p-3">{row.designer.name}</td><td className="p-3">{formatMoney(row.goal)}</td><td className="p-3">{formatMoney(row.closed)}</td><td className="p-3">{formatMoney(row.missing)}</td><td className="p-3">{row.percent}%</td><td className="p-3">{row.count}</td><td className="p-3">{formatMoney(row.ticket)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
