import { Clock, Download, History, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { Button, EmptyState, Modal } from "../components/ui";
import { formatDate, formatMoney, toCsv, downloadText } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { ClientProject, FlowHistory, Stage } from "../lib/types";
import { getProjectHistory, getProjects, moveProject, nextStage, stageSuccess, stageTitle, statusByStage } from "./data";
import { ProjectForm } from "./ProjectForm";

const advanceLabel: Partial<Record<Stage, string>> = {
  PROJETO: "Enviar para Negociação",
  NEGOCIACAO: "Enviar para Conferência",
  CONFERENCIA: "Enviar para Montagem",
  MONTAGEM: "Enviar para Assistência",
  ASSISTENCIA: "Enviar para Finalizados",
};

export function StagePage({ ctx, stage }: { ctx: AppContext; stage: Stage }) {
  const [items, setItems] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientProject | "new" | null>(null);
  const [history, setHistory] = useState<{ project: ClientProject; rows: FlowHistory[] } | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    if (!ctx.profile.company_id) return;
    setLoading(true);
    const { data, error } = await getProjects(ctx.profile.company_id, stage, ctx.profile);
    setLoading(false);
    if (error) ctx.toast("error", error.message);
    else setItems(data || []);
  }

  useEffect(() => {
    load();
  }, [stage, ctx.profile.company_id, ctx.profile.id]);

  const rows = useMemo(() => {
    const term = filter.toLowerCase();
    return items.filter((item) => `${item.client_name} ${item.project_name} ${item.designer?.name || ""}`.toLowerCase().includes(term));
  }, [items, filter]);
  const canEditStage = ctx.profile.role !== "CONFERENTE" || ["CONFERENCIA", "MONTAGEM", "ASSISTENCIA"].includes(stage);
  const canDeleteProject = ctx.profile.role === "ADMIN_EMPRESA" || ctx.profile.role === "PROJETISTA";

  async function advance(project: ClientProject) {
    const to = nextStage[project.current_stage];
    if (!to) return;
    if (project.current_stage === "PROJETO" && (!project.client_name || !project.client_phone || !project.project_name || !project.designer_id)) {
      return ctx.toast("error", "Preencha cliente, telefone, projeto e projetista responsável.");
    }
    if (project.current_stage === "NEGOCIACAO" && (!project.closed_value || !project.closing_date)) {
      return ctx.toast("error", "Informe valor fechado e data de fechamento.");
    }
    try {
      await moveProject(project, to, ctx.profile.id);
      ctx.toast("success", stageSuccess[project.current_stage] || "Movimentação concluída com sucesso.");
      load();
    } catch (error) {
      ctx.toast("error", error instanceof Error ? error.message : "Erro ao mover projeto.");
    }
  }

  async function openHistory(project: ClientProject) {
    const { data, error } = await getProjectHistory(project.id);
    if (error) return ctx.toast("error", error.message);
    setHistory({ project, rows: data || [] });
  }

  async function deleteProject(project: ClientProject) {
    if (!window.confirm(`Excluir o projeto "${project.project_name}" de ${project.client_name}?`)) return;
    const { error } = await supabase.from("client_projects").delete().eq("id", project.id);
    if (error) return ctx.toast("error", error.message);
    ctx.toast("success", "Projeto excluido com sucesso.");
    load();
  }

  function statusFieldFor(project: ClientProject) {
    if (project.current_stage === "PROJETO") return "project_status";
    if (project.current_stage === "NEGOCIACAO") return "negotiation_status";
    if (project.current_stage === "CONFERENCIA") return "conference_status";
    if (project.current_stage === "MONTAGEM") return "assembly_status";
    if (project.current_stage === "ASSISTENCIA") return "assistance_status";
    return null;
  }

  function displayStatus(project: ClientProject) {
    if (project.current_stage === "PROJETO") return project.project_status || "Sondagem";
    if (project.current_stage === "NEGOCIACAO") return project.negotiation_status || "Detalhamento de venda";
    if (project.current_stage === "CONFERENCIA") return project.conference_status || "Medição";
    if (project.current_stage === "MONTAGEM") return project.assembly_status || "Vistoria de montagem";
    if (project.current_stage === "ASSISTENCIA") return project.assistance_status || "Aberta";
    return "Finalizado";
  }

  function dateRows(project: ClientProject): Array<[string, string | null | undefined]> {
    if (project.current_stage === "PROJETO") {
      return [
        ["Entrada", project.entry_date],
        ["Apresentação", project.presentation_date],
      ];
    }
    if (project.current_stage === "NEGOCIACAO") {
      return [
        ["Entrada", project.entry_date],
        ["Apresentação", project.presentation_date],
        ["Fechamento", project.closing_date],
      ];
    }
    if (project.current_stage === "CONFERENCIA") {
      return [
        ["Envio fábrica", project.sent_to_factory_date],
        ["Faturamento", project.billing_date],
      ];
    }
    if (project.current_stage === "MONTAGEM") {
      return [
        ["Início montagem", project.assembly_started_date],
        ["Fim montagem", project.assembly_finished_date],
      ];
    }
    if (project.current_stage === "ASSISTENCIA") {
      return [
        ["Pedido", project.order_date],
        ["Assistência", project.assistance_date],
      ];
    }
    return [["Finalizado", project.finished_at]];
  }

  async function updateInlineStatus(project: ClientProject, status: string) {
    const field = statusFieldFor(project);
    if (!field) return;
    const { error } = await supabase.from("client_projects").update({ [field]: status }).eq("id", project.id);
    if (error) return ctx.toast("error", error.message);
    setItems((current) => current.map((item) => item.id === project.id ? { ...item, [field]: status } : item));
    ctx.toast("success", "Status atualizado com sucesso.");
  }

  function exportRows() {
    const csv = toCsv(rows.map((item) => ({
      cliente: item.client_name,
      telefone: item.client_phone,
      projeto: item.project_name,
      projetista: item.designer?.name || "",
      etapa: stageTitle[item.current_stage],
      valor_fechado: item.closed_value || "",
      data_fechamento: item.closing_date || "",
      finalizado_em: item.finished_at || "",
    })));
    downloadText(`arquidesk-${stage.toLowerCase()}.csv`, csv);
    ctx.toast("success", "Exportação gerada com sucesso.");
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input className="min-h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-moss md:max-w-sm" placeholder="Filtrar por cliente, projeto ou projetista" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="flex gap-2 md:ml-auto">
          <Button variant="secondary" onClick={exportRows}><Download size={17} /> Exportar</Button>
          {stage === "PROJETO" && ctx.profile.role !== "CONFERENTE" ? <Button onClick={() => setEditing("new")}><Plus size={17} /> Criar projeto</Button> : null}
        </div>
      </div>

      {loading ? <div className="rounded-lg bg-white p-6">Carregando...</div> : null}
      {!loading && rows.length === 0 ? <EmptyState title={`Nenhum registro em ${stageTitle[stage]}.`} /> : null}
      {rows.length ? (
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-fog text-xs uppercase text-ink/60">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Projeto</th>
                  <th className="p-3">Projetista</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Datas</th>
                  <th className="p-3">Valor fechado</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-line align-top">
                    <td className="p-3">
                      <strong>{item.client_name}</strong>
                      <span className="block text-xs text-ink/55">{item.client_phone}</span>
                    </td>
                    <td className="p-3">{item.project_name}</td>
                    <td className="p-3">{item.designer?.name || "-"}</td>
                    <td className="p-3">
                      {canEditStage && statusFieldFor(item) ? (
                        <select className="min-h-10 w-full min-w-44 rounded-md border border-line bg-white px-2 text-sm outline-none focus:border-moss" value={displayStatus(item)} onChange={(event) => updateInlineStatus(item, event.target.value)}>
                          {statusByStage[item.current_stage].map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      ) : displayStatus(item)}
                    </td>
                    <td className="p-3 text-xs text-ink/65">
                      {dateRows(item).map(([label, value]) => (
                        <span key={label} className="block">{label}: {formatDate(value)}</span>
                      ))}
                    </td>
                    <td className="p-3">{formatMoney(item.closed_value)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {canEditStage ? <Button variant="secondary" title="Editar" onClick={() => setEditing(item)}><Pencil size={16} /></Button> : null}
                        <Button variant="secondary" title="Histórico" onClick={() => openHistory(item)}><History size={16} /></Button>
                        {canDeleteProject ? <Button variant="danger" title="Excluir" onClick={() => deleteProject(item)}><Trash2 size={16} /></Button> : null}
                        {advanceLabel[stage] && ctx.profile.role !== "CONFERENTE" ? <Button onClick={() => advance(item)}><Send size={16} /> {advanceLabel[stage]}</Button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {editing ? (
        <Modal title={editing === "new" ? "Criar projeto" : `Editar ${stageTitle[stage]}`} onClose={() => setEditing(null)}>
          <ProjectForm ctx={ctx} stage={stage} project={editing === "new" ? undefined : editing} onDone={() => { setEditing(null); load(); }} />
        </Modal>
      ) : null}

      {history ? (
        <Modal title={`Histórico - ${history.project.project_name}`} onClose={() => setHistory(null)} width="max-w-2xl">
          <div className="grid gap-3">
            {history.rows.map((row) => (
              <article key={row.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center gap-2 text-sm font-bold"><Clock size={16} /> {row.action}</div>
                <p className="mt-1 text-sm text-ink/65">
                  {new Date(row.created_at).toLocaleString("pt-BR")} · {row.user?.name || "Sistema"} · {row.from_stage ? stageTitle[row.from_stage] : "Origem"} → {stageTitle[row.to_stage]}
                </p>
                {row.notes ? <p className="mt-2 text-sm">{row.notes}</p> : null}
              </article>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
