import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppContext } from "../App";
import { Button, Field, inputClass, Modal, StatCard } from "../components/ui";
import { formatDate, formatMoney, monthRange } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { FinancialSale, Profile } from "../lib/types";
import { getDesigners, getProjects, getSales } from "./data";

type PaymentDraft = { amount: string; payment_date: string };

function commissionValue(sale: FinancialSale) {
  return (sale.sold_value * Number(sale.commission_percent || 0)) / 100;
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

export function FinancePage({ ctx }: { ctx: AppContext }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [designerId, setDesignerId] = useState("");
  const [sales, setSales] = useState<FinancialSale[]>([]);
  const [designers, setDesigners] = useState<Pick<Profile, "id" | "name" | "email">[]>([]);
  const [modal, setModal] = useState<FinancialSale | "new" | null>(null);

  const isAdmin = ctx.profile.role === "ADMIN_EMPRESA";
  const isDesigner = ctx.profile.role === "PROJETISTA";
  const canWriteFinance = isAdmin || isDesigner;

  async function load() {
    if (!ctx.profile.company_id) return;
    const [{ data: salesData }, { data: designersData }] = await Promise.all([
      getSales(ctx.profile.company_id, isDesigner ? ctx.profile : undefined),
      isDesigner
        ? Promise.resolve({ data: [{ id: ctx.profile.id, name: ctx.profile.name, email: ctx.profile.email }] })
        : getDesigners(ctx.profile.company_id),
    ]);
    setSales(salesData || []);
    setDesigners(designersData || []);
  }

  useEffect(() => {
    load();
  }, [ctx.profile.company_id, ctx.profile.id, ctx.profile.role]);

  const { start, end } = monthRange(year, month);
  const activeDesignerId = isDesigner ? ctx.profile.id : designerId;
  const filteredSales = sales.filter((sale) => !activeDesignerId || sale.designer_id === activeDesignerId);
  const monthSales = filteredSales.filter((sale) => sale.sale_date >= start && sale.sale_date <= end);
  const monthPayments = filteredSales
    .flatMap((sale) => (sale.payments || []).map((payment) => ({ ...payment, sale })))
    .filter((payment) => payment.payment_date >= start && payment.payment_date <= end);
  const totalSold = monthSales.reduce((sum, sale) => sum + sale.sold_value, 0);
  const totalReceived = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalCommission = monthSales.reduce((sum, sale) => sum + commissionValue(sale), 0);
  const averageCommission = monthSales.length
    ? monthSales.reduce((sum, sale) => sum + Number(sale.commission_percent || 0), 0) / monthSales.length
    : 0;

  if (!["ADMIN_EMPRESA", "CONFERENTE", "PROJETISTA"].includes(ctx.profile.role)) {
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
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total de venda mes" value={formatMoney(totalSold)} />
        <StatCard label="Total que entrou mes" value={formatMoney(totalReceived)} />
        <StatCard label="Percentual medio de comissao" value={formatPercent(averageCommission)} />
        <StatCard label="Valor da comissao" value={formatMoney(totalCommission)} />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-end">
        <Field label="Mes">
          <input className={inputClass} type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} />
        </Field>
        <Field label="Ano">
          <input className={inputClass} type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
        </Field>
        {isDesigner ? (
          <Field label="Projetista">
            <input className={inputClass} value={ctx.profile.name} disabled />
          </Field>
        ) : (
          <Field label="Projetista">
            <select className={inputClass} value={designerId} onChange={(event) => setDesignerId(event.target.value)}>
              <option value="">Todos</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>{designer.name}</option>
              ))}
            </select>
          </Field>
        )}
        {canWriteFinance ? <Button className="md:ml-auto" onClick={() => setModal("new")}><Plus size={17} /> Cadastrar venda</Button> : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line p-4 font-bold">Tabela de vendas</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-fog text-xs uppercase text-ink/60">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Projeto</th>
                <th className="p-3">Projetista</th>
                <th className="p-3">Valor vendido</th>
                <th className="p-3">Forma</th>
                <th className="p-3">Data</th>
                <th className="p-3">Total recebido</th>
                <th className="p-3">Em aberto</th>
                <th className="p-3">Comissao</th>
                <th className="p-3">Status</th>
                {canWriteFinance ? <th className="p-3 text-right">Acoes</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => {
                const received = (sale.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
                const status = received === 0 ? "Pendente" : received < sale.sold_value ? "Parcial" : "Pago";
                return (
                  <tr key={sale.id} className="border-t border-line">
                    <td className="p-3">{sale.client_name}</td>
                    <td className="p-3">{sale.project_name}</td>
                    <td className="p-3">{sale.designer?.name || "-"}</td>
                    <td className="p-3">{formatMoney(sale.sold_value)}</td>
                    <td className="p-3">{sale.payment_method}</td>
                    <td className="p-3">{formatDate(sale.sale_date)}</td>
                    <td className="p-3">{formatMoney(received)}</td>
                    <td className="p-3">{formatMoney(Math.max(0, sale.sold_value - received))}</td>
                    <td className="p-3">
                      <span className="block">{formatPercent(Number(sale.commission_percent || 0))}</span>
                      <span className="block text-xs text-ink/55">{formatMoney(commissionValue(sale))}</span>
                    </td>
                    <td className="p-3">{status}</td>
                    {canWriteFinance ? (
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" title="Editar" onClick={() => setModal(sale)}><Pencil size={16} /></Button>
                          {isAdmin ? <Button variant="danger" title="Excluir" onClick={() => deleteSale(sale)}><Trash2 size={16} /></Button> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line p-4 font-bold">Pagamentos do mes</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-fog text-xs uppercase text-ink/60">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Projeto</th>
                <th className="p-3">Projetista</th>
                <th className="p-3">No.</th>
                <th className="p-3">Valor pago</th>
                <th className="p-3">Data</th>
                <th className="p-3">Forma</th>
              </tr>
            </thead>
            <tbody>
              {monthPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-line">
                  <td className="p-3">{payment.sale.client_name}</td>
                  <td className="p-3">{payment.sale.project_name}</td>
                  <td className="p-3">{payment.sale.designer?.name || "-"}</td>
                  <td className="p-3">{payment.payment_number}</td>
                  <td className="p-3">{formatMoney(payment.amount)}</td>
                  <td className="p-3">{formatDate(payment.payment_date)}</td>
                  <td className="p-3">{payment.sale.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && canWriteFinance ? (
        <SaleModal
          ctx={ctx}
          designers={designers}
          sale={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      ) : null}
    </section>
  );
}

function SaleModal({
  ctx,
  designers,
  sale,
  onClose,
  onDone,
}: {
  ctx: AppContext;
  designers: Pick<Profile, "id" | "name" | "email">[];
  sale?: FinancialSale;
  onClose: () => void;
  onDone: () => void;
}) {
  const [projects, setProjects] = useState<{ id: string; client_name: string; project_name: string; designer_id: string | null; closed_value: number | null }[]>([]);
  const [clientProjectId, setClientProjectId] = useState(sale?.client_project_id || "");
  const [clientName, setClientName] = useState(sale?.client_name || "");
  const [projectName, setProjectName] = useState(sale?.project_name || "");
  const [designerId, setDesignerId] = useState(sale?.designer_id || (ctx.profile.role === "PROJETISTA" ? ctx.profile.id : ""));
  const [soldValue, setSoldValue] = useState(sale ? String(sale.sold_value) : "");
  const [commissionPercent, setCommissionPercent] = useState(sale ? String(sale.commission_percent || 0) : "0");
  const [paymentMethod, setPaymentMethod] = useState(sale?.payment_method || "Pix");
  const [saleDate, setSaleDate] = useState(sale?.sale_date || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(sale?.notes || "");
  const [payments, setPayments] = useState<PaymentDraft[]>(
    sale?.payments?.length
      ? [...sale.payments].sort((a, b) => a.payment_number - b.payment_number).map((payment) => ({ amount: String(payment.amount), payment_date: payment.payment_date }))
      : [{ amount: "", payment_date: new Date().toISOString().slice(0, 10) }],
  );

  const isDesigner = ctx.profile.role === "PROJETISTA";

  useEffect(() => {
    if (!ctx.profile.company_id) return;
    getProjects(ctx.profile.company_id, undefined, isDesigner ? ctx.profile : undefined).then(({ data }) =>
      setProjects((data || []).map((project) => ({
        id: project.id,
        client_name: project.client_name,
        project_name: project.project_name,
        designer_id: project.designer_id,
        closed_value: project.closed_value,
      }))),
    );
  }, [ctx.profile.company_id, ctx.profile.id, ctx.profile.role]);

  function selectProject(id: string) {
    setClientProjectId(id);
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    setClientName(project.client_name);
    setProjectName(project.project_name);
    setDesignerId(isDesigner ? ctx.profile.id : project.designer_id || "");
    setSoldValue(String(project.closed_value || ""));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ctx.profile.company_id) return;

    const payload = {
      company_id: ctx.profile.company_id,
      client_project_id: clientProjectId || null,
      designer_id: isDesigner ? ctx.profile.id : designerId || null,
      client_name: clientName,
      project_name: projectName,
      sold_value: Number(soldValue),
      commission_percent: Number(commissionPercent || 0),
      payment_method: paymentMethod,
      sale_date: saleDate,
      notes: notes || null,
    };

    const query = sale
      ? supabase.from("financial_sales").update(payload).eq("id", sale.id).select("id").single()
      : supabase.from("financial_sales").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error) return ctx.toast("error", error.message);

    if (sale) {
      const { error: deletePaymentsError } = await supabase.from("financial_payments").delete().eq("financial_sale_id", sale.id);
      if (deletePaymentsError) return ctx.toast("error", deletePaymentsError.message);
    }

    const paymentRows = payments.filter((payment) => payment.amount && payment.payment_date).map((payment, index) => ({
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

    ctx.toast("success", sale ? "Venda atualizada com sucesso." : "Venda cadastrada com sucesso.");
    ctx.toast("success", "Financeiro recalculado com sucesso.");
    onDone();
  }

  return (
    <Modal title={sale ? "Editar venda" : "Cadastrar venda"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vincular a projeto existente">
            <select className={inputClass} value={clientProjectId} onChange={(event) => selectProject(event.target.value)}>
              <option value="">Venda avulsa</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.client_name} - {project.project_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Projetista responsavel">
            <select className={inputClass} value={designerId} onChange={(event) => setDesignerId(event.target.value)} required disabled={isDesigner}>
              <option value="">Selecione</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>{designer.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Cliente">
            <input className={inputClass} value={clientName} onChange={(event) => setClientName(event.target.value)} required />
          </Field>
          <Field label="Projeto">
            <input className={inputClass} value={projectName} onChange={(event) => setProjectName(event.target.value)} required />
          </Field>
          <Field label="Valor vendido">
            <input className={inputClass} type="number" min="0" step="0.01" value={soldValue} onChange={(event) => setSoldValue(event.target.value)} required />
          </Field>
          <Field label="Comissao (%)">
            <input className={inputClass} type="number" min="0" step="0.01" value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} />
          </Field>
          <Field label="Forma de pagamento">
            <input className={inputClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required />
          </Field>
          <Field label="Data da venda">
            <input className={inputClass} type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} required />
          </Field>
        </div>
        <Field label="Observacoes">
          <textarea className={`${inputClass} min-h-20`} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <section className="grid gap-3 rounded-lg border border-line p-4">
          <h3 className="font-bold">Pagamentos recebidos</h3>
          {payments.map((payment, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[120px_1fr_1fr_auto] md:items-end">
              <strong>{index + 1}o pagamento</strong>
              <Field label="Valor">
                <input className={inputClass} type="number" min="0" step="0.01" value={payment.amount} onChange={(event) => setPayments((items) => items.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} />
              </Field>
              <Field label="Data">
                <input className={inputClass} type="date" value={payment.payment_date} onChange={(event) => setPayments((items) => items.map((item, i) => i === index ? { ...item, payment_date: event.target.value } : item))} />
              </Field>
              <Button type="button" variant="secondary" onClick={() => setPayments((items) => items.filter((_, i) => i !== index))} disabled={payments.length === 1}><Trash2 size={16} /></Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setPayments((items) => [...items, { amount: "", payment_date: new Date().toISOString().slice(0, 10) }])}><Plus size={16} /> Adicionar pagamento</Button>
        </section>
        <div className="flex justify-end"><Button>{sale ? "Salvar alteracoes" : "Salvar venda"}</Button></div>
      </form>
    </Modal>
  );
}
