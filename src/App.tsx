import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Company, Profile, Subscription } from "./lib/types";
import type { NavKey } from "./lib/permissions";
import { canAccess } from "./lib/permissions";
import { AuthPage } from "./components/AuthPage";
import { Layout } from "./components/Layout";
import { Toasts, type ToastMessage } from "./components/Toast";
import { Dashboard } from "./modules/Dashboard";
import { SchedulePage } from "./modules/SchedulePage";
import { StagePage } from "./modules/StagePage";
import { FinancePage } from "./modules/FinancePage";
import { GoalsPage } from "./modules/GoalsPage";
import { ImportExportPage } from "./modules/ImportExportPage";
import { CompanySettings } from "./modules/CompanySettings";
import { EmployeesPage } from "./modules/EmployeesPage";
import { SubscriptionPage } from "./modules/SubscriptionPage";
import { SuperAdminPage } from "./modules/SuperAdminPage";

export type AppContext = {
  profile: Profile;
  company: Company | null;
  subscription: Subscription | null;
  toast: (type: "success" | "error", text: string) => void;
  refreshShell: () => Promise<void>;
};

const stageByNav: Partial<Record<NavKey, "PROJETO" | "NEGOCIACAO" | "CONFERENCIA" | "MONTAGEM" | "ASSISTENCIA" | "FINALIZADO">> = {
  projects: "PROJETO",
  negotiations: "NEGOCIACAO",
  conference: "CONFERENCIA",
  assembly: "MONTAGEM",
  assistance: "ASSISTENCIA",
  finished: "FINALIZADO",
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [active, setActive] = useState<NavKey>("dashboard");
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (type: "success" | "error", text: string) => {
    const id = Date.now();
    setToasts((items) => [...items, { id, type, text }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  };

  async function loadShell(userId?: string) {
    const id = userId || session?.user.id;
    if (!id) return;
    let { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    const currentSession = session || (await supabase.auth.getSession()).data.session;
    const metadata = currentSession?.user.user_metadata;
    if (error && metadata?.company_name) {
      const { error: onboardingError } = await supabase.rpc("create_company_for_current_user", {
        company_name: metadata.company_name,
        full_name: metadata.name || currentSession?.user.email || "",
      });
      if (!onboardingError) {
        const retry = await supabase.from("profiles").select("*").eq("id", id).single();
        profileData = retry.data;
        error = retry.error;
      }
    }
    if (error || !profileData?.active) {
      toast("error", "Perfil não encontrado ou usuário inativo.");
      setProfile(null);
      return;
    }
    setProfile(profileData);
    if (profileData.company_id) {
      const [{ data: companyData }, { data: subscriptionData }] = await Promise.all([
        supabase.from("companies").select("*").eq("id", profileData.company_id).single(),
        supabase.from("subscriptions").select("*").eq("company_id", profileData.company_id).maybeSingle(),
      ]);
      setCompany(companyData);
      setSubscription(subscriptionData);
    }
    if (!canAccess(profileData.role, active)) setActive(profileData.role === "SUPER_ADMIN" ? "saas-dashboard" : "dashboard");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) loadShell(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) loadShell(nextSession.user.id);
      else {
        setProfile(null);
        setCompany(null);
        setSubscription(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const ctx = useMemo<AppContext | null>(
    () => (profile ? { profile, company, subscription, toast, refreshShell: () => loadShell() } : null),
    [profile, company, subscription],
  );

  if (loading) return <div className="grid min-h-screen place-items-center bg-fog text-ink">Carregando Arquidesk...</div>;
  if (!session || !ctx) return <><AuthPage onToast={toast} onAuthReady={() => loadShell()} /><Toasts messages={toasts} /></>;

  const blocked = subscription?.status === "CANCELED" || subscription?.status === "BLOCKED";
  const protectedBySubscription = !["subscription", "company-settings"].includes(active);

  function renderPage() {
    if (!ctx) return null;
    if (blocked && protectedBySubscription && ctx.profile.role !== "SUPER_ADMIN") return <SubscriptionPage ctx={ctx} blocked />;
    if (stageByNav[active]) return <StagePage ctx={ctx} stage={stageByNav[active]!} />;
    if (active === "dashboard") return <Dashboard ctx={ctx} />;
    if (active === "schedule") return <SchedulePage ctx={ctx} />;
    if (active === "finance") return <FinancePage ctx={ctx} />;
    if (active === "goals" || active === "my-goal" || active === "team-goals") return <GoalsPage ctx={ctx} mode={active} />;
    if (active === "import-export" || active === "my-exports" || active === "ops-exports") return <ImportExportPage ctx={ctx} mode={active} />;
    if (active === "employees") return <EmployeesPage ctx={ctx} />;
    if (active === "company-settings") return <CompanySettings ctx={ctx} />;
    if (active === "subscription") return <SubscriptionPage ctx={ctx} />;
    return <SuperAdminPage ctx={ctx} active={active} />;
  }

  return (
    <>
      <Layout ctx={ctx} active={active} onNavigate={setActive}>
        {renderPage()}
      </Layout>
      <Toasts messages={toasts} />
    </>
  );
}
