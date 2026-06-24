export type PlanId = "start" | "professional" | "business";
export type SubscriptionPlanKey = PlanId | "START" | "PROFESSIONAL" | "BUSINESS" | "ESSENCIAL" | "PROFISSIONAL" | "PREMIUM";

export const includedFeatures = [
  "Gestão completa de projetos",
  "Fluxo de etapas da operação",
  "Dashboard gerencial",
  "Financeiro",
  "Metas de projetistas",
  "Controle de comissões",
  "Agenda",
  "Permissões por função",
  "Importação e exportação",
  "Identidade visual da empresa",
];

export const plans = [
  {
    id: "start",
    legacyPlan: "ESSENCIAL",
    name: "Start",
    price: 149,
    priceLabel: "R$ 149/mês",
    users: "Até 3 usuários",
    userLimit: 3,
    description: "Para empresas pequenas que querem sair das planilhas e organizar a operação.",
    highlighted: false,
    badge: undefined,
  },
  {
    id: "professional",
    legacyPlan: "PROFISSIONAL",
    name: "Profissional",
    price: 297,
    priceLabel: "R$ 297/mês",
    users: "Até 8 usuários",
    userLimit: 8,
    description: "Para empresas que precisam controlar projetos, financeiro, metas e equipe.",
    highlighted: true,
    badge: "Mais escolhido",
  },
  {
    id: "business",
    legacyPlan: "PREMIUM",
    name: "Business",
    price: 497,
    priceLabel: "R$ 497/mês",
    users: "Até 15 usuários",
    userLimit: 15,
    description: "Para operações maiores que precisam de mais usuários, controle e suporte.",
    highlighted: false,
    badge: undefined,
  },
] as const;

export function planById(planId: PlanId) {
  return plans.find((plan) => plan.id === planId) || plans[1];
}

export function normalizePlan(plan?: SubscriptionPlanKey | string | null): PlanId {
  if (plan === "start" || plan === "START" || plan === "ESSENCIAL") return "start";
  if (plan === "business" || plan === "BUSINESS" || plan === "PREMIUM") return "business";
  return "professional";
}

export function planLabel(plan?: SubscriptionPlanKey | string | null) {
  return planById(normalizePlan(plan)).name;
}

export function planUserLimit(plan?: SubscriptionPlanKey | string | null) {
  return planById(normalizePlan(plan)).userLimit;
}
