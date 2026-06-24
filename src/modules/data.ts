import { supabase } from "../lib/supabase";
import type { ClientProject, FinancialSale, FlowHistory, Profile, Stage } from "../lib/types";

export const nextStage: Partial<Record<Stage, Stage>> = {
  PROJETO: "NEGOCIACAO",
  NEGOCIACAO: "CONFERENCIA",
  CONFERENCIA: "MONTAGEM",
  MONTAGEM: "ASSISTENCIA",
  ASSISTENCIA: "FINALIZADO",
};

export const stageTitle: Record<Stage, string> = {
  PROJETO: "Projeto",
  NEGOCIACAO: "Negociação",
  CONFERENCIA: "Conferência",
  MONTAGEM: "Montagem",
  ASSISTENCIA: "Assistência",
  FINALIZADO: "Finalizados",
};

export const stageSuccess: Partial<Record<Stage, string>> = {
  PROJETO: "Projeto enviado para Negociação com sucesso.",
  NEGOCIACAO: "Negociação enviada para Conferência com sucesso.",
  CONFERENCIA: "Conferência enviada para Montagem com sucesso.",
  MONTAGEM: "Montagem enviada para Assistência com sucesso.",
  ASSISTENCIA: "Assistência enviada para Finalizados com sucesso.",
};

export const statusByStage: Record<Stage, string[]> = {
  PROJETO: ["Sondagem", "Medição", "Projeto", "Pronto para apresentação"],
  NEGOCIACAO: ["Detalhamento de venda", "Proposta enviada", "Em negociação", "Aguardando retorno", "Fechado", "Perdido"],
  CONFERENCIA: ["Medição", "Conferência", "Detalhamento", "Ajuste pendente", "Liberado para fábrica"],
  MONTAGEM: ["Vistoria de montagem", "Agendada", "Início da montagem", "Em montagem", "Pendente", "Finalizada"],
  ASSISTENCIA: ["Aberta", "Em atendimento", "Aguardando peça"],
  FINALIZADO: ["Finalizado"],
};

export async function getDesigners(companyId: string) {
  return supabase
    .from("profiles")
    .select("id,name,email")
    .eq("company_id", companyId)
    .eq("role", "PROJETISTA")
    .eq("active", true)
    .order("name");
}

export function projectSelect() {
  return "*, designer:profiles!client_projects_designer_id_fkey(id,name,email)";
}

export async function getProjects(companyId: string, stage?: Stage, profile?: Profile) {
  let query = supabase.from("client_projects").select(projectSelect()).eq("company_id", companyId).order("updated_at", { ascending: false });
  if (stage) query = query.eq("current_stage", stage);
  if (profile?.role === "PROJETISTA") query = query.eq("designer_id", profile.id);
  return query.returns<ClientProject[]>();
}

export async function moveProject(project: ClientProject, toStage: Stage, userId: string, notes?: string) {
  const patch: Partial<ClientProject> = { current_stage: toStage };
  if (toStage === "FINALIZADO") patch.finished_at = new Date().toISOString();
  const { error } = await supabase.from("client_projects").update(patch).eq("id", project.id);
  if (error) throw error;
  const history = {
    company_id: project.company_id,
    client_project_id: project.id,
    from_stage: project.current_stage,
    to_stage: toStage,
    action: `Enviado para ${stageTitle[toStage]}`,
    user_id: userId,
    notes: notes || null,
  };
  const { error: historyError } = await supabase.from("flow_history").insert(history);
  if (historyError) throw historyError;
}

export async function getProjectHistory(projectId: string) {
  return supabase
    .from("flow_history")
    .select("*, user:profiles!flow_history_user_id_fkey(id,name)")
    .eq("client_project_id", projectId)
    .order("created_at", { ascending: false })
    .returns<FlowHistory[]>();
}

export async function getSales(companyId: string, profile?: Profile) {
  let query = supabase
    .from("financial_sales")
    .select("*, designer:profiles!financial_sales_designer_id_fkey(id,name,email), payments:financial_payments(*)")
    .eq("company_id", companyId)
    .order("sale_date", { ascending: false });
  if (profile?.role === "PROJETISTA") query = query.eq("designer_id", profile.id);
  return query.returns<FinancialSale[]>();
}
