drop policy if exists imports_insert on public.import_batches;
create policy imports_insert on public.import_batches for insert with check (
  company_id = public.current_company_id()
  and public.current_role() in ('ADMIN_EMPRESA', 'PROJETISTA')
);
