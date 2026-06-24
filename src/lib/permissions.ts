import type { Role } from "./types";

export type NavKey =
  | "dashboard"
  | "schedule"
  | "projects"
  | "negotiations"
  | "conference"
  | "assembly"
  | "assistance"
  | "finished"
  | "finance"
  | "goals"
  | "my-goal"
  | "team-goals"
  | "import-export"
  | "my-exports"
  | "ops-exports"
  | "employees"
  | "company-settings"
  | "subscription"
  | "saas-dashboard"
  | "companies"
  | "plans"
  | "subscriptions"
  | "global-users"
  | "saas-settings";

export const roleNav: Record<Role, NavKey[]> = {
  ADMIN_EMPRESA: [
    "dashboard",
    "schedule",
    "projects",
    "negotiations",
    "conference",
    "assembly",
    "assistance",
    "finished",
    "finance",
    "goals",
    "import-export",
    "employees",
    "company-settings",
    "subscription",
  ],
  PROJETISTA: ["dashboard", "schedule", "projects", "negotiations", "conference", "assembly", "assistance", "finance", "my-goal", "my-exports"],
  CONFERENTE: ["dashboard", "schedule", "projects", "negotiations", "conference", "assembly", "assistance", "finished", "finance", "team-goals", "ops-exports"],
  SUPER_ADMIN: ["saas-dashboard", "companies", "plans", "subscriptions", "global-users", "saas-settings"],
};

export const labels: Record<NavKey, string> = {
  dashboard: "Dashboard",
  schedule: "Agendamentos",
  projects: "Projeto",
  negotiations: "Negociação",
  conference: "Conferência",
  assembly: "Montagem",
  assistance: "Assistência",
  finished: "Finalizados",
  finance: "Financeiro",
  goals: "Metas dos Projetistas",
  "my-goal": "Minha Meta",
  "team-goals": "Metas da Equipe",
  "import-export": "Importar / Exportar",
  "my-exports": "Minhas Exportações",
  "ops-exports": "Exportações Operacionais",
  employees: "Funcionários",
  "company-settings": "Configurações da Empresa",
  subscription: "Assinatura / Plano",
  "saas-dashboard": "Dashboard SaaS",
  companies: "Empresas",
  plans: "Planos",
  subscriptions: "Assinaturas",
  "global-users": "Usuários Globais",
  "saas-settings": "Configurações SaaS",
};

export function canAccess(role: Role, key: NavKey) {
  return roleNav[role].includes(key);
}
