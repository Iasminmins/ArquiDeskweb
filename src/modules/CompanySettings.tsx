import { useState } from "react";
import type { AppContext } from "../App";
import { Button, Field, inputClass } from "../components/ui";
import { supabase } from "../lib/supabase";

export function CompanySettings({ ctx }: { ctx: AppContext }) {
  const company = ctx.company;
  const [form, setForm] = useState({
    name: company?.name || "",
    document: company?.document || "",
    email: company?.email || "",
    phone: company?.phone || "",
    address: company?.address || "",
    primary_color: company?.primary_color || "#15201d",
    secondary_color: company?.secondary_color || "#b8664b",
    logo_url: company?.logo_url || "",
    cover_image_url: company?.cover_image_url || "",
  });

  if (ctx.profile.role !== "ADMIN_EMPRESA") return <div className="rounded-lg border border-line bg-white p-6">Acesso restrito ao ADMIN_EMPRESA.</div>;

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function uploadAsset(file: File, kind: "logo" | "cover") {
    if (!company) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${company.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) return ctx.toast("error", error.message);
    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    set(kind === "logo" ? "logo_url" : "cover_image_url", data.publicUrl);
    ctx.toast("success", "Arquivo enviado com sucesso.");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!company) return;
    const { error } = await supabase.from("companies").update(form).eq("id", company.id);
    if (error) return ctx.toast("error", error.message);
    await ctx.refreshShell();
    ctx.toast("success", "Configurações da empresa atualizadas com sucesso.");
  }

  return (
    <form onSubmit={save} className="grid gap-5 rounded-lg border border-line bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da empresa"><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <Field label="CNPJ"><input className={inputClass} value={form.document} onChange={(e) => set("document", e.target.value)} /></Field>
        <Field label="E-mail"><input className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Telefone"><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Logo URL"><input className={inputClass} value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} /></Field>
        <Field label="Enviar logo"><input className={inputClass} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "logo")} /></Field>
        <Field label="Imagem de capa URL"><input className={inputClass} value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} /></Field>
        <Field label="Enviar capa"><input className={inputClass} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], "cover")} /></Field>
        <Field label="Cor principal"><input className={inputClass} type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} /></Field>
        <Field label="Cor secundária"><input className={inputClass} type="color" value={form.secondary_color} onChange={(e) => set("secondary_color", e.target.value)} /></Field>
      </div>
      <Field label="Endereço"><textarea className={`${inputClass} min-h-20`} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
      <div className="flex justify-end"><Button>Salvar configurações</Button></div>
    </form>
  );
}
