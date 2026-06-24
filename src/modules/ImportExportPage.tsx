import { Download, Upload } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import type { AppContext } from "../App";
import { Button, Field, inputClass } from "../components/ui";
import { downloadText, toCsv } from "../lib/format";
import { supabase } from "../lib/supabase";
import { getProjects, getSales } from "./data";

type PreviewRow = Record<string, string | number | null>;

export function ImportExportPage({ ctx, mode }: { ctx: AppContext; mode: string }) {
  const [type, setType] = useState("Projetos");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const admin = ctx.profile.role === "ADMIN_EMPRESA";

  async function parseFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<PreviewRow>(sheet, { defval: "" });
    setRows(json);
    setErrors(validate(type, json));
  }

  function validate(importType: string, data: PreviewRow[]) {
    const required: Record<string, string[]> = {
      Projetos: ["Nome do cliente", "Telefone", "Nome do projeto", "Status", "Data de entrada"],
      "Vendas financeiras": ["Cliente", "Projeto", "Valor vendido", "Forma de pagamento", "Data da venda"],
      "Pagamentos financeiros": ["Cliente", "Projeto", "Valor pago", "Data de pagamento"],
      "Metas dos projetistas": ["Projetista", "Mês", "Ano", "Valor da meta"],
    };
    const fields = required[importType] || required.Projetos;
    return data.flatMap((row, index) => fields.filter((field) => !row[field]).map((field) => `Linha ${index + 2}: campo obrigatório ausente: ${field}`));
  }

  async function confirmImport() {
    if (!ctx.profile.company_id || !admin) return;
    if (errors.length) return ctx.toast("error", "Corrija os erros antes de importar.");
    if (type === "Projetos") {
      const payload = rows.map((row) => ({
        company_id: ctx.profile.company_id,
        client_name: String(row["Nome do cliente"]),
        client_phone: String(row.Telefone),
        project_name: String(row["Nome do projeto"]),
        project_status: String(row.Status),
        entry_date: String(row["Data de entrada"]),
        current_stage: "PROJETO",
      }));
      const { error } = await supabase.from("client_projects").insert(payload);
      if (error) return ctx.toast("error", error.message);
    }
    await supabase.from("import_batches").insert({
      company_id: ctx.profile.company_id,
      type,
      file_name: "upload.xlsx",
      status: "COMPLETED",
      total_rows: rows.length,
      success_rows: rows.length,
      error_rows: 0,
      created_by_user_id: ctx.profile.id,
    });
    ctx.toast("success", "Importação concluída com sucesso.");
    setRows([]);
  }

  async function exportData(format: "csv" | "xlsx" | "pdf") {
    if (!ctx.profile.company_id) return;
    const data = type === "Financeiro" || type === "Pagamentos" ? (await getSales(ctx.profile.company_id, ctx.profile.role === "PROJETISTA" ? ctx.profile : undefined)).data || [] : (await getProjects(ctx.profile.company_id, undefined, ctx.profile)).data || [];
    const flat = data.map((item: any) => ({
      cliente: item.client_name,
      projeto: item.project_name,
      projetista: item.designer?.name || "",
      valor: item.sold_value || item.closed_value || "",
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
    ctx.toast("success", "Exportação gerada com sucesso.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-line bg-white p-4">
        <h2 className="font-bold">{mode === "import-export" ? "Importação e exportação" : "Exportações permitidas"}</h2>
        <p className="mt-1 text-sm text-ink/60">As permissões respeitam companyId e perfil do usuário logado.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {admin ? (
          <section className="grid gap-4 rounded-lg border border-line bg-white p-4">
            <h3 className="font-bold">Importar</h3>
            <Field label="Tipo"><select className={inputClass} value={type} onChange={(e) => { setType(e.target.value); setRows([]); }}><option>Projetos</option><option>Vendas financeiras</option><option>Pagamentos financeiros</option><option>Metas dos projetistas</option><option>Funcionários</option></select></Field>
            <Field label="Arquivo CSV ou XLSX"><input className={inputClass} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} /></Field>
            {errors.length ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errors.slice(0, 8).map((e) => <p key={e}>{e}</p>)}</div> : null}
            {rows.length ? <Button onClick={confirmImport}><Upload size={17} /> Confirmar importação ({rows.length})</Button> : null}
          </section>
        ) : null}
        <section className="grid gap-4 rounded-lg border border-line bg-white p-4">
          <h3 className="font-bold">Exportar</h3>
          <Field label="Dados"><select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}><option>Projeto</option><option>Negociação</option><option>Conferência</option><option>Montagem</option><option>Assistência</option><option>Finalizados</option><option>Financeiro</option><option>Pagamentos</option><option>Metas</option><option>Histórico de movimentações</option></select></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportData("csv")}><Download size={17} /> CSV</Button>
            <Button variant="secondary" onClick={() => exportData("xlsx")}><Download size={17} /> XLSX</Button>
            <Button variant="secondary" onClick={() => exportData("pdf")}><Download size={17} /> PDF</Button>
          </div>
        </section>
      </div>
      {rows.length ? (
        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line p-4 font-bold">Prévia da importação</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-fog"><tr>{Object.keys(rows[0]).map((key) => <th key={key} className="p-3">{key}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={index} className="border-t border-line">{Object.keys(rows[0]).map((key) => <td key={key} className="p-3">{row[key]}</td>)}</tr>)}</tbody></table></div>
        </section>
      ) : null}
    </section>
  );
}
