import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { Button, Field, inputClass, Modal, StatCard } from "../components/ui";
import { commissionRate, formatDate, formatMoney, monthRange } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { FinancialSale, Profile } from "../lib/types";
import { getDesigners, getProjects, getSales } from "./data";

type PaymentDraft = { amount: string; payment_date: string };

export function FinancePage({ ctx }: { ctx: AppContext }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [designerId, setDesignerId] = useState("");
  const [sales, setSales] = useState<FinancialSale[]>([]);
  const [designers, setDesigners] = useState<Pick<Profile, "id" | "name" | "email">[]>([]);
  const [modal, setModal] = useState(false);

  async function load() {
    if (!ctx.profile.company_id) return;
    const [{ data: salesData }, { data: designersData }] = await Promise.all([
      getSales(ctx.profile.company_id),
      getDesigners(ctx.profile.company_id),
    ]);
    setSales(salesData || []);
    setDesigners(designersData || []);
  }

  useEffect(() => {
    load();
  }, [ctx.profile.company_id]);

  const { start, end } = monthRange(year, month);
  const filteredSales = sales.filter((sale) => (!designerId || sale.designer_id === designerId));
  const monthSales = filteredSales.filter((sale) => sale.sale_date >= start && sale.sale_date <= end);
  const monthPayments = filteredSales.flatMap((sale) => (sale.payments || []).map((payment) => ({ ...payment, sale }))).filter((payment) => payment.payment_date >= start && payment.payment_date <= end);
  const totalSold = monthSales.reduce((sum, sale) => sum + sale.sold_value, 0);
  const totalReceived = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const rate = commissionRate(totalReceived);
  const canManageFinance = ctx.profile.role === "ADMIN_EMPRESA";

  if (!["ADMIN_EMPRESA", "CONFERENTE"].includes(ctx.profile.role)) {
    return <div className="rounded-lg border border-line bg-white p-6">Acesso restrito.</div>;
  }

  async function deleteSale(sale: FinancialSale) {
    if (!window.confirm(`Excluir a venda "${sale.project_name}" de ${sale.client_name}?`)) return;
    const { error } = await supabase.from("financial_sales").delete().eq("id", sale.id);
    if (error) return ctx.toast("error", error.message);
    ctx.toast("success", "Venda excluida com sucesso.");
    load();
  }

  return (
    <section className="grid gap-5">
      <div className={`grid gap-3 ${canManageFinance ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        <StatCard label="Total de venda mês" value={formatMoney(totalSold)} />
        <StatCard label="Total que entrou mês" value={formatMoney(totalReceived)} />
        {canManageFinance ? (
          <>
            <StatCard label="Percentual de comissão aplicado" value={`${Math.round(rate * 100)}%`} />
            <StatCard label="Valor da comissão" value={formatMoney(totalReceived * rate)} />
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-end">
        <Field label="Mês"><input className={inputClass} type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} /></Field>
        <Field label="Ano"><input className={inputClass} type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
        <Field label="Projetista"><select className={inputClass} value={designerId} onChange={(e) => setDesignerId(e.target.value)}><option value="">Todos</option>{designers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        {canManageFinance ? <Button className="md:ml-auto" onClick={() => setModal(true)}><Plus size={17} /> Cadastrar venda</Button> : null}
      </div>
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line p-4 font-bold">Tabela de vendas</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-fog text-xs uppercase text-ink/60">
              <tr>
                <th className="p-3">Cliente</th><th className="p-3">Projeto</th><th className="p-3">Projetista</th><th className="p-3">Valor vendido</th><th className="p-3">Forma</th><th className="p-3">Data</th><th className="p-3">Total recebido</th><th className="p-3">Em aberto</th><th className="p-3">Status</th>{canManageFinance ? <th className="p-3 text-right">Acoes</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => {
                const received = (sale.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
                const status = received === 0 ? "Pendente" : received < sale.sold_value ? "Parcial" : "Pago";
                return (
                  <tr key={sale.id} className="border-t border-line">
                    <td className="p-3">{sale.client_name}</td><td className="p-3">{sale.project_name}</td><td className="p-3">{sale.designer?.name || "-"}</td><td className="p-3">{formatMoney(sale.sold_value)}</td><td className="p-3">{sale.payment_method}</td><td className="p-3">{formatDate(sale.sale_date)}</td><td className="p-3">{formatMoney(received)}</td><td className="p-3">{formatMoney(Math.max(0, sale.sold_value - received))}</td><td className="p-3">{status}</td>{canManageFinance ? <td className="p-3 text-right"><Button variant="danger" title="Excluir" onClick={() => deleteSale(sale)}><Trash2 size={16} /></Button></td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line p-4 font-bold">Pagamentos do mês</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-fog text-xs uppercase text-ink/60"><tr><th className="p-3">Cliente</th><th className="p-3">Projeto</th><th className="p-3">Projetista</th><th className="p-3">Nº</th><th className="p-3">Valor pago</th><th className="p-3">Data</th><th className="p-3">Forma</th></tr></thead>
            <tbody>{monthPayments.map((payment) => <tr key={payment.id} className="border-t border-line"><td className="p-3">{payment.sale.client_name}</td><td className="p-3">{payment.sale.project_name}</td><td className="p-3">{payment.sale.designer?.name || "-"}</td><td className="p-3">{payment.payment_number}</td><td className="p-3">{formatMoney(payment.amount)}</td><td className="p-3">{formatDate(payment.payment_date)}</td><td className="p-3">{payment.sale.payment_method}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      {modal && canManageFinance ? <SaleModal ctx={ctx} designers={designers} onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} /> : null}
    </section>
  );
}

function SaleModal({ ctx, designers, onClose, onDone }: { ctx: AppContext; designers: Pick<Profile, "id" | "name" | "email">[]; onClose: () => void; onDone: () => void }) {
  const [projects, setProjects] = useState<{ id: string; client_name: string; project_name: string; designer_id: string | null; closed_value: number | null }[]>([]);
  const [clientProjectId, setClientProjectId] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [soldValue, setSoldValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [payments, setPayments] = useState<PaymentDraft[]>([{ amount: "", payment_date: new Date().toISOString().slice(0, 10) }]);

  useEffect(() => {
    if (!ctx.profile.company_id) return;
    getProjects(ctx.profile.company_id).then(({ data }) => setProjects((data || []).map((p) => ({ id: p.id, client_name: p.client_name, project_name: p.project_name, designer_id: p.designer_id, closed_value: p.closed_value }))));
  }, [ctx.profile.company_id]);

  function selectProject(id: string) {
    setClientProjectId(id);
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    setClientName(project.client_name);
    setProjectName(project.project_name);
    setDesignerId(project.designer_id || "");
    setSoldValue(String(project.closed_value || ""));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ctx.profile.company_id) return;
    const { data, error } = await supabase.from("financial_sales").insert({
      company_id: ctx.profile.company_id,
      client_project_id: clientProjectId || null,
      designer_id: designerId || null,
      client_name: clientName,
      project_name: projectName,
      sold_value: Number(soldValue),
      payment_method: paymentMethod,
      sale_date: saleDate,
      notes: notes || null,
    }).select("id").single();
    if (error) return ctx.toast("error", error.message);
    const paymentRows = payments.filter((p) => p.amount && p.payment_date).map((payment, index) => ({
      company_id: ctx.profile.company_id,
      financial_sale_id: data.id,
      payment_number: index + 1,
      amount: Number(payment.amount),
      payment_date: payment.payment_date,
    }));
    if (paymentRows.length) {
      const { error: paymentError } = await supabase.from("financial_payments").insert(paymentRows);
      if (paymentError) return ctx.toast("error", paymentError.message);
    }
    ctx.toast("success", "Venda cadastrada com sucesso.");
    ctx.toast("success", "Financeiro recalculado com sucesso.");
    onDone();
  }

  return (
    <Modal title="Cadastrar venda" onClose={onClose}>
      <form onSubmit={save} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vincular a projeto existente"><select className={inputClass} value={clientProjectId} onChange={(e) => selectProject(e.target.value)}><option value="">Venda avulsa</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.client_name} - {p.project_name}</option>)}</select></Field>
          <Field label="Projetista responsável"><select className={inputClass} value={designerId} onChange={(e) => setDesignerId(e.target.value)} required><option value="">Selecione</option>{designers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          <Field label="Cliente"><input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} required /></Field>
          <Field label="Projeto"><input className={inputClass} value={projectName} onChange={(e) => setProjectName(e.target.value)} required /></Field>
          <Field label="Valor vendido"><input className={inputClass} type="number" min="0" step="0.01" value={soldValue} onChange={(e) => setSoldValue(e.target.value)} required /></Field>
          <Field label="Forma de pagamento"><input className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required /></Field>
          <Field label="Data da venda"><input className={inputClass} type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} required /></Field>
        </div>
        <Field label="Observações"><textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <section className="grid gap-3 rounded-lg border border-line p-4">
          <h3 className="font-bold">Pagamentos recebidos</h3>
          {payments.map((payment, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[120px_1fr_1fr_auto] md:items-end">
              <strong>{index + 1}º pagamento</strong>
              <Field label="Valor"><input className={inputClass} type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => setPayments((items) => items.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} /></Field>
              <Field label="Data"><input className={inputClass} type="date" value={payment.payment_date} onChange={(e) => setPayments((items) => items.map((item, i) => i === index ? { ...item, payment_date: e.target.value } : item))} /></Field>
              <Button type="button" variant="secondary" onClick={() => setPayments((items) => items.filter((_, i) => i !== index))} disabled={payments.length === 1}><Trash2 size={16} /></Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setPayments((items) => [...items, { amount: "", payment_date: new Date().toISOString().slice(0, 10) }])}><Plus size={16} /> Adicionar pagamento</Button>
        </section>
        <div className="flex justify-end"><Button>Salvar venda</Button></div>
      </form>
    </Modal>
  );
}
