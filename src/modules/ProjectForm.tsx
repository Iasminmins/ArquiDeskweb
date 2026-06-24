import { useEffect, useState } from "react";
import type { AppContext } from "../App";
import type { ClientProject, Profile, Stage } from "../lib/types";
import { supabase } from "../lib/supabase";
import { Button, Field, inputClass } from "../components/ui";
import { getDesigners, statusByStage } from "./data";

type FormState = {
  client_name: string;
  client_address: string;
  client_phone: string;
  project_name: string;
  designer_id: string;
  project_status: string;
  entry_date: string;
  presentation_date: string;
  negotiation_status: string;
  new_proposal_value: string;
  closed_value: string;
  closing_date: string;
  conference_status: string;
  sent_to_factory_date: string;
  billing_date: string;
  assembly_status: string;
  assembly_started_date: string;
  assembly_finished_date: string;
  assistance_status: string;
  assistance_date: string;
  order_date: string;
  notes: string;
};

function initial(project?: ClientProject, stage?: Stage, profile?: Profile): FormState {
  return {
    client_name: project?.client_name || "",
    client_address: project?.client_address || "",
    client_phone: project?.client_phone || "",
    project_name: project?.project_name || "",
    designer_id: project?.designer_id || (profile?.role === "PROJETISTA" ? profile.id : ""),
    project_status: project?.project_status || (stage === "PROJETO" ? "Sondagem" : ""),
    entry_date: project?.entry_date || new Date().toISOString().slice(0, 10),
    presentation_date: project?.presentation_date || "",
    negotiation_status: project?.negotiation_status || "Detalhamento de venda",
    new_proposal_value: String(project?.new_proposal_value || ""),
    closed_value: String(project?.closed_value || ""),
    closing_date: project?.closing_date || "",
    conference_status: project?.conference_status || "Medição",
    sent_to_factory_date: project?.sent_to_factory_date || "",
    billing_date: project?.billing_date || "",
    assembly_status: project?.assembly_status || "Vistoria de montagem",
    assembly_started_date: project?.assembly_started_date || "",
    assembly_finished_date: project?.assembly_finished_date || "",
    assistance_status: project?.assistance_status || "Aberta",
    assistance_date: project?.assistance_date || "",
    order_date: project?.order_date || "",
    notes: project?.notes || "",
  };
}

export function ProjectForm({
  ctx,
  stage,
  project,
  onDone,
}: {
  ctx: AppContext;
  stage: Stage;
  project?: ClientProject;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial(project, stage, ctx.profile));
  const [designers, setDesigners] = useState<Pick<Profile, "id" | "name" | "email">[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ctx.profile.company_id) getDesigners(ctx.profile.company_id).then(({ data }) => setDesigners(data || []));
  }, [ctx.profile.company_id]);

  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ctx.profile.company_id) return;
    setSaving(true);
    const payload = {
      company_id: ctx.profile.company_id,
      designer_id: form.designer_id || null,
      client_name: form.client_name.trim(),
      client_address: form.client_address || null,
      client_phone: form.client_phone.trim(),
      project_name: form.project_name.trim(),
      current_stage: project?.current_stage || stage,
      project_status: form.project_status || null,
      entry_date: form.entry_date || null,
      presentation_date: form.presentation_date || null,
      negotiation_status: form.negotiation_status || null,
      new_proposal_value: form.new_proposal_value ? Number(form.new_proposal_value) : null,
      closed_value: form.closed_value ? Number(form.closed_value) : null,
      closing_date: form.closing_date || null,
      conference_status: form.conference_status || null,
      sent_to_factory_date: form.sent_to_factory_date || null,
      billing_date: form.billing_date || null,
      assembly_status: form.assembly_status || null,
      assembly_started_date: form.assembly_started_date || null,
      assembly_finished_date: form.assembly_finished_date || null,
      assistance_status: form.assistance_status || null,
      assistance_date: form.assistance_date || null,
      order_date: form.order_date || null,
      notes: form.notes || null,
    };
    const query = project
      ? supabase.from("client_projects").update(payload).eq("id", project.id).select("id").single()
      : supabase.from("client_projects").insert(payload).select("id").single();
    const { data, error } = await query;
    setSaving(false);
    if (error) return ctx.toast("error", error.message);
    if (!project) {
      await supabase.from("flow_history").insert({
        company_id: ctx.profile.company_id,
        client_project_id: data.id,
        to_stage: stage,
        action: `Criado em ${stage === "ASSISTENCIA" ? "Assistência" : "Projeto"}`,
        user_id: ctx.profile.id,
      }).then(() => undefined);
    }
    ctx.toast("success", project ? "Projeto atualizado com sucesso." : stage === "ASSISTENCIA" ? "Assistência criada com sucesso." : "Projeto criado com sucesso.");
    onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome do cliente"><input className={inputClass} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} required /></Field>
        <Field label="Telefone"><input className={inputClass} value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} required /></Field>
        <Field label="Endereço"><input className={inputClass} value={form.client_address} onChange={(e) => set("client_address", e.target.value)} /></Field>
        <Field label="Nome do projeto"><input className={inputClass} value={form.project_name} onChange={(e) => set("project_name", e.target.value)} required /></Field>
        <Field label="Projetista responsável">
          <select className={inputClass} value={form.designer_id} onChange={(e) => set("designer_id", e.target.value)} required disabled={ctx.profile.role === "PROJETISTA"}>
            <option value="">Selecione</option>
            {designers.map((designer) => <option key={designer.id} value={designer.id}>{designer.name}</option>)}
          </select>
        </Field>
        {stage === "PROJETO" ? (
          <>
            <Field label="Status"><select className={inputClass} value={form.project_status} onChange={(e) => set("project_status", e.target.value)}>{statusByStage.PROJETO.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Data de entrada"><input className={inputClass} type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} /></Field>
            <Field label="Data de apresentação"><input className={inputClass} type="date" value={form.presentation_date} onChange={(e) => set("presentation_date", e.target.value)} /></Field>
          </>
        ) : null}
        {stage === "NEGOCIACAO" ? (
          <>
            <Field label="Status"><select className={inputClass} value={form.negotiation_status} onChange={(e) => set("negotiation_status", e.target.value)}>{statusByStage.NEGOCIACAO.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Valor da nova proposta"><input className={inputClass} type="number" min="0" step="0.01" value={form.new_proposal_value} onChange={(e) => set("new_proposal_value", e.target.value)} /></Field>
            <Field label="Valor fechado"><input className={inputClass} type="number" min="0" step="0.01" value={form.closed_value} onChange={(e) => set("closed_value", e.target.value)} /></Field>
            <Field label="Data de fechamento"><input className={inputClass} type="date" value={form.closing_date} onChange={(e) => set("closing_date", e.target.value)} /></Field>
          </>
        ) : null}
        {stage === "CONFERENCIA" ? (
          <>
            <Field label="Status"><select className={inputClass} value={form.conference_status} onChange={(e) => set("conference_status", e.target.value)}>{statusByStage.CONFERENCIA.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Data de envio para fábrica"><input className={inputClass} type="date" value={form.sent_to_factory_date} onChange={(e) => set("sent_to_factory_date", e.target.value)} /></Field>
            <Field label="Data de faturamento"><input className={inputClass} type="date" value={form.billing_date} onChange={(e) => set("billing_date", e.target.value)} /></Field>
          </>
        ) : null}
        {stage === "MONTAGEM" ? (
          <>
            <Field label="Status"><select className={inputClass} value={form.assembly_status} onChange={(e) => set("assembly_status", e.target.value)}>{statusByStage.MONTAGEM.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Data de início da montagem"><input className={inputClass} type="date" value={form.assembly_started_date} onChange={(e) => set("assembly_started_date", e.target.value)} /></Field>
            <Field label="Data de finalização da montagem"><input className={inputClass} type="date" value={form.assembly_finished_date} onChange={(e) => set("assembly_finished_date", e.target.value)} /></Field>
          </>
        ) : null}
        {stage === "ASSISTENCIA" ? (
          <>
            <Field label="Status"><select className={inputClass} value={form.assistance_status} onChange={(e) => set("assistance_status", e.target.value)}>{statusByStage.ASSISTENCIA.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Data da assistência"><input className={inputClass} type="date" value={form.assistance_date} onChange={(e) => set("assistance_date", e.target.value)} /></Field>
            <Field label="Data do pedido"><input className={inputClass} type="date" value={form.order_date} onChange={(e) => set("order_date", e.target.value)} /></Field>
          </>
        ) : null}
      </div>
      <Field label="Observações"><textarea className={`${inputClass} min-h-24`} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="flex justify-end">
        <Button disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
