import { Download, Upload } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import type { AppContext } from "../App";
import { Button, Field, inputClass } from "../components/ui";
import { downloadText, toCsv } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Role, Stage } from "../lib/types";
import { getProjects, getSales } from "./data";

type PreviewRow = Record<string, string | number | boolean | Date | null>;
type ImportSheets = Partial<Record<"Projetos" | "Vendas financeiras" | "Pagamentos financeiros" | "Metas dos projetistas" | "Funcionarios", PreviewRow[]>>;
type ImportSummary = { label: string; count: number };

const requiredFields: Record<string, string[]> = {
  Projetos: ["Nome do cliente", "Telefone", "Nome do projeto", "Status", "Data de entrada"],
  "Vendas financeiras": ["Cliente", "Projeto", "Valor vendido", "Forma de pagamento", "Data da venda"],
  "Pagamentos financeiros": ["Cliente", "Projeto", "Valor pago", "Data de pagamento"],
  "Metas dos projetistas": ["Projetista", "Mes", "Ano", "Valor da meta"],
};

const stageMap: Record<string, Stage> = {
  PROJETO: "PROJETO",
  PROJETOS: "PROJETO",
  NEGOCIACAO: "NEGOCIACAO",
  "NEGOCIAÇÃO": "NEGOCIACAO",
  CONFERENCIA: "CONFERENCIA",
  "CONFERÊNCIA": "CONFERENCIA",
  MONTAGEM: "MONTAGEM",
  ASSISTENCIA: "ASSISTENCIA",
  "ASSISTÊNCIA": "ASSISTENCIA",
  FINALIZADO: "FINALIZADO",
  FINALIZADOS: "FINALIZADO",
};

function value(row: PreviewRow, key: string) {
  return row[key] ?? "";
}

function text(row: PreviewRow, key: string) {
  return String(value(row, key)).trim();
}

function numberValue(row: PreviewRow, key: string) {
  const raw = value(row, key);
  if (typeof raw === "number") return raw;
  const normalized = String(raw || "0").replace(/[R$\s.]/g, "").replace(",", ".");
  return Number(normalized) || 0;
}

function dateValue(row: PreviewRow, key: string) {
  const raw = value(row, key);
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const asDate = new Date(String(raw));
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
}

function roleValue(row: PreviewRow): Role {
  const raw = text(row, "Permissao").toUpperCase();
  if (raw === "CONFERENTE" || raw === "ADMIN_EMPRESA") return raw;
  return "PROJETISTA";
}

function wantedStage(row: PreviewRow): Stage {
  const raw = text(row, "Etapa desejada").toUpperCase();
  return stageMap[raw] || "PROJETO";
}

function sheetRows(workbook: XLSX.WorkBook, name: string) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<PreviewRow>(sheet, { defval: "" }).filter((row) =>
    Object.values(row).some((cell) => String(cell ?? "").trim() !== ""),
  );
}

function validateSheet(importType: string, data: PreviewRow[]) {
  const fields = requiredFields[importType] || requiredFields.Projetos;
  return data.flatMap((row, index) => fields.filter((field) => !row[field]).map((field) => `${importType} linha ${index + 2}: campo obrigatorio ausente: ${field}`));
}

function normalizeDesignerName(name: string) {
  return name.trim().toLowerCase();
}

export function ImportExportPage({ ctx, mode }: { ctx: AppContext; mode: string }) {
  const [type, setType] = useState("Completo Arquidesk");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [sheets, setSheets] = useState<ImportSheets>({});
  const [summary, setSummary] = useState<ImportSummary[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const admin = ctx.profile.role === "ADMIN_EMPRESA";

  async function parseFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { cellDates: true });

    if (type === "Completo Arquidesk") {
      const parsed: ImportSheets = {
        Projetos: sheetRows(workbook, "Projetos"),
        "Vendas financeiras": sheetRows(workbook, "Vendas financeiras"),
        "Pagamentos financeiros": sheetRows(workbook, "Pagamentos financeiros"),
        "Metas dos projetistas": sheetRows(workbook, "Metas dos projetistas"),
        Funcionarios: sheetRows(workbook, "Funcionarios"),
      };
      setSheets(parsed);
      setRows(parsed.Projetos || []);
      setSummary(Object.entries(parsed).map(([label, data]) => ({ label, count: data?.length || 0 })).filter((item) => item.count > 0));
      setErrors([
        ...validateSheet("Projetos", parsed.Projetos || []),
        ...validateSheet("Vendas financeiras", parsed["Vendas financeiras"] || []),
        ...validateSheet("Pagamentos financeiros", parsed["Pagamentos financeiros"] || []),
        ...validateSheet("Metas dos projetistas", parsed["Metas dos projetistas"] || []),
      ]);
      return;
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<PreviewRow>(sheet, { defval: "" });
    setSheets({ [type]: json } as ImportSheets);
    setRows(json);
    setSummary([{ label: type, count: json.length }]);
    setErrors(validateSheet(type, json));
  }

  async function loadDesignerMap(companyId: string) {
    const { data, error } = await supabase.from("profiles").select("id,name,email,role").eq("company_id", companyId).in("role", ["PROJETISTA", "ADMIN_EMPRESA", "CONFERENTE"]);
    if (error) throw error;
    return new Map((data || []).map((profile) => [normalizeDesignerName(profile.name), profile.id]));
  }

  async function ensureImportProfiles(companyId: string, designerMap: Map<string, string>) {
    const employeeRows = sheets.Funcionarios || [];
    const toInsert = employeeRows
      .filter((row) => text(row, "Nome") && text(row, "E-mail"))
      .filter((row) => !designerMap.has(normalizeDesignerName(text(row, "Nome"))))
      .map((row) => ({
        company_id: companyId,
        name: text(row, "Nome"),
        email: text(row, "E-mail"),
        role: roleValue(row),
        active: !["NAO", "NÃO", "FALSE", "0"].includes(text(row, "Ativo").toUpperCase()),
      }));

    if (!toInsert.length) return;
    const { error } = await supabase.from("profiles").insert(toInsert);
    if (error) throw error;
    const { data } = await supabase.from("profiles").select("id,name").eq("company_id", companyId);
    (data || []).forEach((profile) => designerMap.set(normalizeDesignerName(profile.name), profile.id));
  }

  async function insertProjects(companyId: string, designerMap: Map<string, string>) {
    const projectRows = type === "Completo Arquidesk" ? sheets.Projetos || [] : rows;
    if (!projectRows.length) return new Map<string, string>();

    const payload = projectRows.map((row) => ({
      company_id: companyId,
      designer_id: designerMap.get(normalizeDesignerName(text(row, "Projetista responsavel"))) || null,
      client_name: text(row, "Nome do cliente"),
      client_address: text(row, "Endereco do cliente") || null,
      client_phone: text(row, "Telefone"),
      project_name: text(row, "Nome do projeto"),
      current_stage: wantedStage(row),
      project_status: text(row, "Status") || null,
      entry_date: dateValue(row, "Data de entrada"),
      presentation_date: dateValue(row, "Data de apresentacao"),
      negotiation_status: text(row, "Status da negociacao") || null,
      new_proposal_value: numberValue(row, "Valor nova proposta"),
      closed_value: numberValue(row, "Valor fechado"),
      closing_date: dateValue(row, "Data de fechamento"),
      conference_status: text(row, "Status conferencia") || null,
      sent_to_factory_date: dateValue(row, "Data envio fabrica"),
      billing_date: dateValue(row, "Data faturamento"),
      assembly_status: text(row, "Status montagem") || null,
      assembly_started_date: dateValue(row, "Data inicio montagem"),
      assembly_finished_date: dateValue(row, "Data fim montagem"),
      assistance_status: text(row, "Status assistencia") || null,
      assistance_date: dateValue(row, "Data assistencia"),
      order_date: dateValue(row, "Data pedido"),
      notes: text(row, "Observacoes") || null,
    }));

    const { data, error } = await supabase.from("client_projects").insert(payload).select("id,client_name,project_name");
    if (error) throw error;

    return new Map((data || []).map((project) => [`${normalizeDesignerName(project.client_name)}|${normalizeDesignerName(project.project_name)}`, project.id]));
  }

  async function insertSales(companyId: string, designerMap: Map<string, string>, projectMap: Map<string, string>) {
    const salesRows = type === "Completo Arquidesk" ? sheets["Vendas financeiras"] || [] : rows;
    if (!salesRows.length || type === "Projetos") return new Map<string, string>();

    const payload = salesRows.map((row) => {
      const key = `${normalizeDesignerName(text(row, "Cliente"))}|${normalizeDesignerName(text(row, "Projeto"))}`;
      return {
        company_id: companyId,
        client_project_id: projectMap.get(key) || null,
        designer_id: designerMap.get(normalizeDesignerName(text(row, "Projetista"))) || null,
        client_name: text(row, "Cliente"),
        project_name: text(row, "Projeto"),
        sold_value: numberValue(row, "Valor vendido"),
        commission_percent: numberValue(row, "Comissao (%)"),
        payment_method: text(row, "Forma de pagamento"),
        sale_date: dateValue(row, "Data da venda"),
        notes: text(row, "Observacoes") || null,
      };
    });

    const { data, error } = await supabase.from("financial_sales").insert(payload).select("id,client_name,project_name");
    if (error) throw error;
    return new Map((data || []).map((sale) => [`${normalizeDesignerName(sale.client_name)}|${normalizeDesignerName(sale.project_name)}`, sale.id]));
  }

  async function insertPayments(companyId: string, saleMap: Map<string, string>) {
    const paymentRows = type === "Completo Arquidesk" ? sheets["Pagamentos financeiros"] || [] : rows;
    if (!paymentRows.length || !["Completo Arquidesk", "Pagamentos financeiros"].includes(type)) return;

    const payload = paymentRows.flatMap((row, index) => {
      const key = `${normalizeDesignerName(text(row, "Cliente"))}|${normalizeDesignerName(text(row, "Projeto"))}`;
      const saleId = saleMap.get(key);
      if (!saleId) return [];
      return [{
        company_id: companyId,
        financial_sale_id: saleId,
        payment_number: numberValue(row, "Numero do pagamento") || index + 1,
        amount: numberValue(row, "Valor pago"),
        payment_date: dateValue(row, "Data de pagamento"),
      }];
    });

    if (!payload.length) return;
    const { error } = await supabase.from("financial_payments").insert(payload);
    if (error) throw error;
  }

  async function insertGoals(companyId: string, designerMap: Map<string, string>) {
    const goalRows = type === "Completo Arquidesk" ? sheets["Metas dos projetistas"] || [] : rows;
    if (!goalRows.length || !["Completo Arquidesk", "Metas dos projetistas"].includes(type)) return;

    const payload = goalRows.flatMap((row) => {
      const designerId = designerMap.get(normalizeDesignerName(text(row, "Projetista")));
      if (!designerId) return [];
      return [{
        company_id: companyId,
        designer_id: designerId,
        month: numberValue(row, "Mes"),
        year: numberValue(row, "Ano"),
        goal_amount: numberValue(row, "Valor da meta"),
      }];
    });

    if (!payload.length) return;
    const { error } = await supabase.from("designer_goals").upsert(payload, { onConflict: "company_id,designer_id,month,year" });
    if (error) throw error;
  }

  async function confirmImport() {
    if (!ctx.profile.company_id || !admin) return;
    if (errors.length) return ctx.toast("error", "Corrija os erros antes de importar.");
    setImporting(true);
    try {
      const designerMap = await loadDesignerMap(ctx.profile.company_id);
      await ensureImportProfiles(ctx.profile.company_id, designerMap);
      const projectMap = await insertProjects(ctx.profile.company_id, designerMap);
      const saleMap = await insertSales(ctx.profile.company_id, designerMap, projectMap);
      await insertPayments(ctx.profile.company_id, saleMap);
      await insertGoals(ctx.profile.company_id, designerMap);

      const total = summary.reduce((sum, item) => sum + item.count, 0);
      await supabase.from("import_batches").insert({
        company_id: ctx.profile.company_id,
        type,
        file_name: "upload.xlsx",
        status: "COMPLETED",
        total_rows: total,
        success_rows: total,
        error_rows: 0,
        created_by_user_id: ctx.profile.id,
      });
      ctx.toast("success", "Importacao completa concluida com sucesso.");
      setRows([]);
      setSheets({});
      setSummary([]);
    } catch (error) {
      ctx.toast("error", error instanceof Error ? error.message : "Erro ao importar arquivo.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const link = document.createElement("a");
    link.href = "/templates/modelo_importacao_completa_arquidesk.xlsx";
    link.download = "modelo_importacao_completa_arquidesk.xlsx";
    link.click();
  }

  async function exportCompleteWorkbook(companyId: string) {
    const [{ data: projects }, { data: sales }, { data: goals }, { data: employees }, { data: history }] = await Promise.all([
      getProjects(companyId, undefined, ctx.profile),
      getSales(companyId, ctx.profile.role === "PROJETISTA" ? ctx.profile : undefined),
      supabase.from("designer_goals").select("*, designer:profiles!designer_goals_designer_id_fkey(id,name,email)").eq("company_id", companyId),
      supabase.from("profiles").select("name,email,role,active").eq("company_id", companyId).order("name"),
      supabase.from("flow_history").select("*, user:profiles!flow_history_user_id_fkey(id,name)").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);

    const workbook = XLSX.utils.book_new();
    const projectRows = (projects || []).map((project) => ({
      "Nome do cliente": project.client_name,
      Telefone: project.client_phone,
      "Nome do projeto": project.project_name,
      Status: project.project_status || "",
      "Data de entrada": project.entry_date || "",
      "Endereco do cliente": project.client_address || "",
      "Data de apresentacao": project.presentation_date || "",
      "Status da negociacao": project.negotiation_status || "",
      "Valor nova proposta": project.new_proposal_value || "",
      "Valor fechado": project.closed_value || "",
      "Data de fechamento": project.closing_date || "",
      "Status conferencia": project.conference_status || "",
      "Data envio fabrica": project.sent_to_factory_date || "",
      "Data faturamento": project.billing_date || "",
      "Status montagem": project.assembly_status || "",
      "Data inicio montagem": project.assembly_started_date || "",
      "Data fim montagem": project.assembly_finished_date || "",
      "Status assistencia": project.assistance_status || "",
      "Data assistencia": project.assistance_date || "",
      "Data pedido": project.order_date || "",
      Observacoes: project.notes || "",
      "Projetista responsavel": project.designer?.name || "",
      "Etapa desejada": project.current_stage,
    }));

    const saleRows = (sales || []).map((sale) => ({
      Cliente: sale.client_name,
      Projeto: sale.project_name,
      Projetista: sale.designer?.name || "",
      "Valor vendido": sale.sold_value,
      "Comissao (%)": sale.commission_percent || 0,
      "Valor comissao": (sale.sold_value * Number(sale.commission_percent || 0)) / 100,
      "Forma de pagamento": sale.payment_method,
      "Data da venda": sale.sale_date,
      Observacoes: sale.notes || "",
    }));

    const paymentRows = (sales || []).flatMap((sale) =>
      (sale.payments || []).map((payment) => ({
        Cliente: sale.client_name,
        Projeto: sale.project_name,
        "Numero do pagamento": payment.payment_number,
        "Valor pago": payment.amount,
        "Data de pagamento": payment.payment_date,
        Forma: sale.payment_method,
        Projetista: sale.designer?.name || "",
        Observacoes: "",
      })),
    );

    const goalRows = (goals || []).map((goal: any) => ({
      Projetista: goal.designer?.name || "",
      Mes: goal.month,
      Ano: goal.year,
      "Valor da meta": goal.goal_amount,
      Observacoes: "",
      Status: "Ativa",
    }));

    const employeeRows = (employees || []).map((employee) => ({
      Nome: employee.name,
      "E-mail": employee.email,
      Permissao: employee.role,
      Ativo: employee.active ? "Sim" : "Nao",
      Telefone: "",
      Observacoes: "",
    }));

    const historyRows = (history || []).map((row: any) => ({
      Acao: row.action,
      "Etapa origem": row.from_stage || "",
      "Etapa destino": row.to_stage,
      Usuario: row.user?.name || "",
      Observacoes: row.notes || "",
      "Criado em": row.created_at,
    }));

    [
      ["Projetos", projectRows],
      ["Vendas financeiras", saleRows],
      ["Pagamentos financeiros", paymentRows],
      ["Metas dos projetistas", goalRows],
      ["Funcionarios", employeeRows],
      ["Historico", historyRows],
    ].forEach(([name, rows]) => {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]), String(name));
    });

    XLSX.writeFile(workbook, "arquidesk-completo.xlsx");
  }

  async function exportData(format: "csv" | "xlsx" | "pdf") {
    if (!ctx.profile.company_id) return;
    if (type === "Completo Arquidesk") {
      if (format !== "xlsx") {
        ctx.toast("error", "Exportacao completa esta disponivel em XLSX.");
        return;
      }
      await exportCompleteWorkbook(ctx.profile.company_id);
      await supabase.from("export_logs").insert({ company_id: ctx.profile.company_id, type, format, filters: {}, created_by_user_id: ctx.profile.id });
      ctx.toast("success", "Exportacao completa gerada com sucesso.");
      return;
    }
    const data = type === "Financeiro" || type === "Pagamentos" ? (await getSales(ctx.profile.company_id, ctx.profile.role === "PROJETISTA" ? ctx.profile : undefined)).data || [] : (await getProjects(ctx.profile.company_id, undefined, ctx.profile)).data || [];
    const flat = data.map((item: any) => ({
      cliente: item.client_name,
      projeto: item.project_name,
      projetista: item.designer?.name || "",
      valor: item.sold_value || item.closed_value || "",
      comissao_percentual: item.commission_percent || "",
      valor_comissao: item.sold_value ? (item.sold_value * Number(item.commission_percent || 0)) / 100 : "",
      data: item.sale_date || item.closing_date || item.entry_date || "",
    }));
    if (format === "xlsx") {
      const sheet = XLSX.utils.json_to_sheet(flat);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Arquidesk");
      XLSX.writeFile(workbook, "arquidesk-export.xlsx");
    } else {
      downloadText(format === "pdf" ? "arquidesk-relatorio.pdf" : "arquidesk-export.csv", toCsv(flat), format === "pdf" ? "application/pdf" : undefined);
    }
    await supabase.from("export_logs").insert({ company_id: ctx.profile.company_id, type, format, filters: {}, created_by_user_id: ctx.profile.id });
    ctx.toast("success", "Exportacao gerada com sucesso.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-bold">{mode === "import-export" ? "Importacao e exportacao" : "Exportacoes permitidas"}</h2>
        <p className="mt-1 text-sm text-ink/60">As permissoes respeitam companyId e perfil do usuario logado.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {admin ? (
          <section className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-bold">Importar</h3>
              <Button type="button" variant="secondary" onClick={downloadTemplate}><Download size={17} /> Baixar modelo</Button>
            </div>
            <Field label="Tipo">
              <select className={inputClass} value={type} onChange={(event) => { setType(event.target.value); setRows([]); setSheets({}); setSummary([]); }}>
                <option>Completo Arquidesk</option>
                <option>Projetos</option>
                <option>Vendas financeiras</option>
                <option>Pagamentos financeiros</option>
                <option>Metas dos projetistas</option>
              </select>
            </Field>
            <Field label="Arquivo CSV ou XLSX"><input className={inputClass} type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && parseFile(event.target.files[0])} /></Field>
            {summary.length ? (
              <div className="rounded-md border border-line bg-fog p-3 text-sm">
                {summary.map((item) => <p key={item.label}>{item.label}: <strong>{item.count}</strong> linha(s)</p>)}
                {summary.some((item) => item.label === "Funcionarios") ? <p className="mt-2 text-xs text-ink/60">Funcionarios importados por Excel criam perfis, mas senhas devem ser criadas pela tela Funcionarios.</p> : null}
              </div>
            ) : null}
            {errors.length ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}</div> : null}
            {summary.length ? <Button onClick={confirmImport} disabled={importing}><Upload size={17} /> {importing ? "Importando..." : `Confirmar importacao (${summary.reduce((sum, item) => sum + item.count, 0)})`}</Button> : null}
          </section>
        ) : null}
        <section className="grid gap-4 rounded-lg border border-line bg-white p-4">
          <h3 className="font-bold">Exportar</h3>
          <Field label="Dados"><select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}><option>Completo Arquidesk</option><option>Projeto</option><option>Negociacao</option><option>Conferencia</option><option>Montagem</option><option>Assistencia</option><option>Finalizados</option><option>Financeiro</option><option>Pagamentos</option><option>Metas</option><option>Historico de movimentacoes</option></select></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportData("csv")}><Download size={17} /> CSV</Button>
            <Button variant="secondary" onClick={() => exportData("xlsx")}><Download size={17} /> XLSX</Button>
            <Button variant="secondary" onClick={() => exportData("pdf")}><Download size={17} /> PDF</Button>
          </div>
        </section>
      </div>
      {rows.length ? (
        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line p-4 font-bold">Previa da importacao</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-fog"><tr>{Object.keys(rows[0]).map((key) => <th key={key} className="p-3">{key}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={index} className="border-t border-line">{Object.keys(rows[0]).map((key) => <td key={key} className="p-3">{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table></div>
        </section>
      ) : null}
    </section>
  );
}
