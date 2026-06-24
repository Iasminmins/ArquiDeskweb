import { useEffect, useState } from "react";
import type { AppContext } from "../App";
import { StatCard } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Company, Subscription } from "../lib/types";

export function SuperAdminPage({ ctx }: { ctx: AppContext; active: string }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  useEffect(() => {
    if (ctx.profile.role !== "SUPER_ADMIN") return;
    supabase.from("companies").select("*").then(({ data }) => setCompanies(data || []));
    supabase.from("subscriptions").select("*").then(({ data }) => setSubs(data || []));
  }, [ctx.profile.role]);
  if (ctx.profile.role !== "SUPER_ADMIN") return null;
  return (
    <section className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Empresas cadastradas" value={companies.length} />
        <StatCard label="Assinaturas ativas" value={subs.filter((s) => s.status === "ACTIVE").length} />
        <StatCard label="Bloqueadas" value={subs.filter((s) => ["BLOCKED", "CANCELED"].includes(s.status)).length} />
      </div>
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-fog text-xs uppercase text-ink/60"><tr><th className="p-3">Empresa</th><th className="p-3">E-mail</th><th className="p-3">Plano</th><th className="p-3">Status</th></tr></thead><tbody>{companies.map((company) => { const sub = subs.find((s) => s.company_id === company.id); return <tr key={company.id} className="border-t border-line"><td className="p-3">{company.name}</td><td className="p-3">{company.email}</td><td className="p-3">{sub?.plan || "-"}</td><td className="p-3">{sub?.status || "-"}</td></tr>; })}</tbody></table>
      </section>
    </section>
  );
}
