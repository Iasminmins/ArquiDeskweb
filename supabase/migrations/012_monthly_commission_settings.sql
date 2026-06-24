create table if not exists public.financial_commission_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  designer_id uuid references public.profiles(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2000),
  commission_percent numeric(6,3) not null default 0 check (commission_percent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_commission_settings_company_month_idx
on public.financial_commission_settings(company_id, month, year);

create unique index if not exists financial_commission_settings_company_month_unique
on public.financial_commission_settings(company_id, month, year)
where designer_id is null;

create unique index if not exists financial_commission_settings_designer_month_unique
on public.financial_commission_settings(company_id, designer_id, month, year)
where designer_id is not null;

drop trigger if exists touch_financial_commission_settings on public.financial_commission_settings;
create trigger touch_financial_commission_settings
before update on public.financial_commission_settings
for each row execute function public.touch_updated_at();

alter table public.financial_commission_settings enable row level security;

drop policy if exists commission_settings_select on public.financial_commission_settings;
create policy commission_settings_select on public.financial_commission_settings for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or (company_id = public.current_company_id() and public.current_role() = 'PROJETISTA' and designer_id = auth.uid())
);

drop policy if exists commission_settings_admin_write on public.financial_commission_settings;
create policy commission_settings_admin_write on public.financial_commission_settings for all using (
  company_id = public.current_company_id()
  and public.is_admin_empresa()
) with check (
  company_id = public.current_company_id()
  and public.is_admin_empresa()
);

drop policy if exists commission_settings_designer_insert on public.financial_commission_settings;
create policy commission_settings_designer_insert on public.financial_commission_settings for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);

drop policy if exists commission_settings_designer_update on public.financial_commission_settings;
create policy commission_settings_designer_update on public.financial_commission_settings for update using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
) with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);
