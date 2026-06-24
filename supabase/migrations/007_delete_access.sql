alter table public.client_projects drop constraint if exists client_projects_designer_id_fkey;
alter table public.client_projects
  add constraint client_projects_designer_id_fkey
  foreign key (designer_id) references public.profiles(id) on delete set null;

alter table public.financial_sales drop constraint if exists financial_sales_designer_id_fkey;
alter table public.financial_sales
  add constraint financial_sales_designer_id_fkey
  foreign key (designer_id) references public.profiles(id) on delete set null;

alter table public.designer_goals drop constraint if exists designer_goals_designer_id_fkey;
alter table public.designer_goals
  add constraint designer_goals_designer_id_fkey
  foreign key (designer_id) references public.profiles(id) on delete cascade;

alter table public.flow_history drop constraint if exists flow_history_user_id_fkey;
alter table public.flow_history
  add constraint flow_history_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles for delete using (
  company_id = public.current_company_id()
  and public.is_admin_empresa()
);

drop policy if exists projects_delete on public.client_projects;
create policy projects_delete on public.client_projects for delete using (
  company_id = public.current_company_id()
  and (
    public.current_role() = 'ADMIN_EMPRESA'
    or designer_id = auth.uid()
  )
);
