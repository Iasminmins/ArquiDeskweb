export type Role = "SUPER_ADMIN" | "ADMIN_EMPRESA" | "PROJETISTA" | "CONFERENTE";
export type Stage = "PROJETO" | "NEGOCIACAO" | "CONFERENCIA" | "MONTAGEM" | "ASSISTENCIA" | "FINALIZADO";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "BLOCKED";

export type Company = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  cover_image_url: string | null;
};

export type Profile = {
  id: string;
  company_id: string | null;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type ClientProject = {
  id: string;
  company_id: string;
  designer_id: string | null;
  client_name: string;
  client_address: string | null;
  client_phone: string;
  project_name: string;
  current_stage: Stage;
  project_status: string | null;
  entry_date: string | null;
  presentation_date: string | null;
  negotiation_status: string | null;
  new_proposal_value: number | null;
  closed_value: number | null;
  closing_date: string | null;
  conference_status: string | null;
  sent_to_factory_date: string | null;
  billing_date: string | null;
  assembly_status: string | null;
  assembly_finished_date: string | null;
  assistance_status: string | null;
  order_date: string | null;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  designer?: Pick<Profile, "id" | "name" | "email"> | null;
};

export type FinancialSale = {
  id: string;
  company_id: string;
  client_project_id: string | null;
  designer_id: string | null;
  client_name: string;
  project_name: string;
  sold_value: number;
  payment_method: string;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  designer?: Pick<Profile, "id" | "name" | "email"> | null;
  payments?: FinancialPayment[];
};

export type FinancialPayment = {
  id: string;
  company_id: string;
  financial_sale_id: string;
  payment_number: number;
  amount: number;
  payment_date: string;
  created_at: string;
  updated_at: string;
};

export type DesignerGoal = {
  id: string;
  company_id: string;
  designer_id: string;
  month: number;
  year: number;
  goal_amount: number;
  designer?: Pick<Profile, "id" | "name" | "email"> | null;
};

export type FlowHistory = {
  id: string;
  company_id: string;
  client_project_id: string;
  from_stage: Stage | null;
  to_stage: Stage;
  action: string;
  user_id: string | null;
  notes: string | null;
  created_at: string;
  user?: Pick<Profile, "id" | "name"> | null;
};

export type Subscription = {
  id: string;
  company_id: string;
  plan: "ESSENCIAL" | "PROFISSIONAL" | "PREMIUM";
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
};
