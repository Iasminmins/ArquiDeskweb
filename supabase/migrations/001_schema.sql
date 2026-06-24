create extension if not exists pgcrypto;

create type public.user_role as enum ('SUPER_ADMIN', 'ADMIN_EMPRESA', 'PROJETISTA', 'CONFERENTE');
create type public.project_stage as enum ('PROJETO', 'NEGOCIACAO', 'CONFERENCIA', 'MONTAGEM', 'ASSISTENCIA', 'FINALIZADO');
create type public.subscription_plan as enum ('ESSENCIAL', 'PROFISSIONAL', 'PREMIUM');
create type public.subscription_status as enum ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'BLOCKED');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  email text,
  phone text,
  address text,
  logo_url text,
  primary_color text default '#15201d',
  secondary_color text default '#b8664b',
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  designer_id uuid,
  client_name text not null,
  client_address text,
  client_phone text not null,
  project_name text not null,
  current_stage public.project_stage not null default 'PROJETO',
  project_status text,
  entry_date date,
  presentation_date date,
  negotiation_status text,
  new_proposal_value numeric(14,2),
  closed_value numeric(14,2),
  closing_date date,
  conference_status text,
  sent_to_factory_date date,
  billing_date date,
  assembly_status text,
  assembly_started_date date,
  assembly_finished_date date,
  assistance_status text,
  assistance_date date,
  order_date date,
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_projects_designer_id_fkey foreign key (designer_id) references public.profiles(id) on delete set null
);

create table public.financial_sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_project_id uuid references public.client_projects(id) on delete set null,
  designer_id uuid,
  client_name text not null,
  project_name text not null,
  sold_value numeric(14,2) not null check (sold_value >= 0),
  commission_percent numeric(6,3) not null default 0 check (commission_percent >= 0),
  payment_method text not null,
  sale_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_sales_designer_id_fkey foreign key (designer_id) references public.profiles(id) on delete set null
);

create table public.financial_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  financial_sale_id uuid not null references public.financial_sales(id) on delete cascade,
  payment_number integer not null check (payment_number > 0),
  amount numeric(14,2) not null check (amount >= 0),
  payment_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (financial_sale_id, payment_number)
);

create table public.designer_goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  designer_id uuid not null,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2020),
  goal_amount numeric(14,2) not null check (goal_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, designer_id, month, year),
  constraint designer_goals_designer_id_fkey foreign key (designer_id) references public.profiles(id) on delete cascade
);

create table public.flow_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_project_id uuid not null references public.client_projects(id) on delete cascade,
  from_stage public.project_stage,
  to_stage public.project_stage not null,
  action text not null,
  user_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint flow_history_user_id_fkey foreign key (user_id) references public.profiles(id) on delete set null
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  plan public.subscription_plan not null default 'PROFISSIONAL',
  status public.subscription_status not null default 'TRIAL',
  current_period_start date,
  current_period_end date,
  trial_ends_at date,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  file_name text not null,
  status text not null,
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.export_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null,
  format text not null,
  filters jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.profiles(company_id, role);
create index on public.client_projects(company_id, current_stage);
create index on public.client_projects(company_id, designer_id);
create index on public.financial_sales(company_id, sale_date);
create index on public.financial_payments(company_id, payment_date);
create index on public.designer_goals(company_id, month, year);
create index on public.flow_history(company_id, client_project_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_companies before update on public.companies for each row execute function public.touch_updated_at();
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_client_projects before update on public.client_projects for each row execute function public.touch_updated_at();
create trigger touch_financial_sales before update on public.financial_sales for each row execute function public.touch_updated_at();
create trigger touch_financial_payments before update on public.financial_payments for each row execute function public.touch_updated_at();
create trigger touch_designer_goals before update on public.designer_goals for each row execute function public.touch_updated_at();
