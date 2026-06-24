import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { AppContext } from "../App";
import { Button, Field, inputClass } from "../components/ui";
import { createAuthOnlyClient, supabase } from "../lib/supabase";
import type { Profile, Role } from "../lib/types";

export function EmployeesPage({ ctx }: { ctx: AppContext }) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PROJETISTA");
  const [creating, setCreating] = useState(false);

  async function load() {
    if (!ctx.profile.company_id) return;
    const { data } = await supabase.from("profiles").select("*").eq("company_id", ctx.profile.company_id).order("name").returns<Profile[]>();
    setEmployees(data || []);
  }

  useEffect(() => {
    load();
  }, [ctx.profile.company_id]);

  if (ctx.profile.role !== "ADMIN_EMPRESA") {
    return <div className="rounded-lg border border-line bg-white p-6">Acesso restrito ao ADMIN_EMPRESA.</div>;
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!ctx.profile.company_id) return;
    setCreating(true);

    const cleanEmail = email.trim();
    const authClient = createAuthOnlyClient();
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name,
          company_id: ctx.profile.company_id,
          role,
        },
      },
    });

    if (authError || !authData.user?.id) {
      setCreating(false);
      return ctx.toast("error", authError?.message || "Nao foi possivel criar o login do funcionario.");
    }

    const { error } = await supabase.from("profiles").insert({
      id: authData.user.id,
      company_id: ctx.profile.company_id,
      name,
      email: cleanEmail,
      role,
      active: true,
    });

    setCreating(false);

    if (error) return ctx.toast("error", error.message);

    ctx.toast("success", "Funcionario criado com login e senha.");
    setName("");
    setEmail("");
    setPassword("");
    setRole("PROJETISTA");
    load();
  }

  async function toggle(employee: Profile) {
    const { error } = await supabase.from("profiles").update({ active: !employee.active }).eq("id", employee.id);
    if (error) return ctx.toast("error", error.message);
    load();
  }

  async function deleteEmployee(employee: Profile) {
    if (employee.id === ctx.profile.id) {
      return ctx.toast("error", "Voce nao pode excluir seu proprio usuario logado.");
    }
    if (!window.confirm(`Excluir o funcionario ${employee.name}?`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", employee.id);
    if (error) return ctx.toast("error", error.message);
    ctx.toast("success", "Funcionario excluido com sucesso.");
    load();
  }

  return (
    <section className="grid gap-5">
      <form onSubmit={create} className="grid gap-3 rounded-lg border border-line bg-white p-4 xl:grid-cols-[1fr_1fr_180px_180px_auto] xl:items-end">
        <Field label="Nome">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="E-mail">
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Senha">
          <input className={inputClass} type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <Field label="Permissao">
          <select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="PROJETISTA">Projetista</option>
            <option value="CONFERENTE">Conferente</option>
            <option value="ADMIN_EMPRESA">Admin empresa</option>
          </select>
        </Field>
        <Button disabled={creating}>{creating ? "Criando..." : "Criar"}</Button>
      </form>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-fog text-xs uppercase text-ink/60">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t border-line">
                <td className="p-3">{employee.name}</td>
                <td className="p-3">{employee.email}</td>
                <td className="p-3">{employee.role}</td>
                <td className="p-3">{employee.active ? "Ativo" : "Inativo"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => toggle(employee)}>
                      {employee.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="danger" title="Excluir" onClick={() => deleteEmployee(employee)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
