alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.client_projects enable row level security;
alter table public.financial_sales enable row level security;
alter table public.financial_payments enable row level security;
alter table public.financial_commission_settings enable row level security;
alter table public.designer_goals enable row level security;
alter table public.flow_history enable row level security;
alter table public.subscriptions enable row level security;
alter table public.import_batches enable row level security;
alter table public.export_logs enable row level security;

create or replace function public.current_profile()
returns public.profiles language sql security definer stable set search_path = public as $$
  select * from public.profiles where id = auth.uid() and active = true limit 1
$$;

create or replace function public.current_role()
returns public.user_role language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1
$$;

create or replace function public.current_company_id()
returns uuid language sql security definer stable set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active = true limit 1
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'SUPER_ADMIN' from public.profiles where id = auth.uid() and active = true), false)
$$;

create or replace function public.is_admin_empresa()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'ADMIN_EMPRESA' from public.profiles where id = auth.uid() and active = true), false)
$$;

create policy companies_select on public.companies for select using (public.is_super_admin() or id = public.current_company_id());
create policy companies_update on public.companies for update using (id = public.current_company_id() and public.is_admin_empresa()) with check (id = public.current_company_id() and public.is_admin_empresa());

create policy profiles_select on public.profiles for select using (
  public.is_super_admin()
  or company_id = public.current_company_id()
  or id = auth.uid()
);
create policy profiles_insert_admin on public.profiles for insert with check (company_id = public.current_company_id() and public.is_admin_empresa());
create policy profiles_update_admin on public.profiles for update using (company_id = public.current_company_id() and public.is_admin_empresa()) with check (company_id = public.current_company_id() and public.is_admin_empresa());
create policy profiles_delete_admin on public.profiles for delete using (company_id = public.current_company_id() and public.is_admin_empresa());

create policy projects_select on public.client_projects for select using (
  public.is_super_admin()
  or (
    company_id = public.current_company_id()
    and (
      public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE')
      or designer_id = auth.uid()
    )
  )
);
create policy projects_insert on public.client_projects for insert with check (
  company_id = public.current_company_id()
  and public.current_role() in ('ADMIN_EMPRESA', 'PROJETISTA')
  and (public.current_role() = 'ADMIN_EMPRESA' or designer_id = auth.uid())
);
create policy projects_update on public.client_projects for update using (
  company_id = public.current_company_id()
  and (
    public.current_role() = 'ADMIN_EMPRESA'
    or designer_id = auth.uid()
    or (public.current_role() = 'CONFERENTE' and current_stage in ('CONFERENCIA', 'MONTAGEM', 'ASSISTENCIA'))
  )
) with check (company_id = public.current_company_id());
create policy projects_delete on public.client_projects for delete using (
  company_id = public.current_company_id()
  and (
    public.current_role() = 'ADMIN_EMPRESA'
    or designer_id = auth.uid()
  )
);

create policy sales_select on public.financial_sales for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or (company_id = public.current_company_id() and public.current_role() = 'PROJETISTA' and designer_id = auth.uid())
);
create policy sales_admin_write on public.financial_sales for all using (company_id = public.current_company_id() and public.is_admin_empresa()) with check (company_id = public.current_company_id() and public.is_admin_empresa());
create policy sales_designer_insert on public.financial_sales for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);
create policy sales_designer_update on public.financial_sales for update using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
) with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);

create policy payments_select on public.financial_payments for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);
create policy payments_admin_write on public.financial_payments for all using (company_id = public.current_company_id() and public.is_admin_empresa()) with check (company_id = public.current_company_id() and public.is_admin_empresa());
create policy payments_designer_insert on public.financial_payments for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);
create policy payments_designer_update on public.financial_payments for update using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
) with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);
create policy payments_designer_delete on public.financial_payments for delete using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);

create policy commission_settings_select on public.financial_commission_settings for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or (company_id = public.current_company_id() and public.current_role() = 'PROJETISTA' and designer_id = auth.uid())
);
create policy commission_settings_admin_write on public.financial_commission_settings for all using (
  company_id = public.current_company_id()
  and public.is_admin_empresa()
) with check (
  company_id = public.current_company_id()
  and public.is_admin_empresa()
);
create policy commission_settings_designer_insert on public.financial_commission_settings for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);
create policy commission_settings_designer_update on public.financial_commission_settings for update using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
) with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);

create policy goals_select on public.designer_goals for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or (company_id = public.current_company_id() and designer_id = auth.uid())
);
create policy goals_admin_write on public.designer_goals for all using (company_id = public.current_company_id() and public.is_admin_empresa()) with check (company_id = public.current_company_id() and public.is_admin_empresa());

create policy history_select on public.flow_history for select using (
  public.is_super_admin()
  or company_id = public.current_company_id()
);
create policy history_insert on public.flow_history for insert with check (company_id = public.current_company_id());

create policy subscriptions_select on public.subscriptions for select using (public.is_super_admin() or company_id = public.current_company_id());
create policy subscriptions_super_admin on public.subscriptions for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy imports_select on public.import_batches for select using (public.is_super_admin() or company_id = public.current_company_id());
create policy imports_insert on public.import_batches for insert with check (company_id = public.current_company_id() and public.is_admin_empresa());

create policy exports_select on public.export_logs for select using (public.is_super_admin() or company_id = public.current_company_id());
create policy exports_insert on public.export_logs for insert with check (company_id = public.current_company_id());
