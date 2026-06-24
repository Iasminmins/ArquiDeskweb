insert into storage.buckets (id, name, public)
values
  ('company-assets', 'company-assets', true),
  ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy company_assets_select on storage.objects
for select using (bucket_id = 'company-assets');

create policy company_assets_admin_write on storage.objects
for all using (
  bucket_id = 'company-assets'
  and split_part(name, '/', 1)::uuid = public.current_company_id()
  and public.is_admin_empresa()
) with check (
  bucket_id = 'company-assets'
  and split_part(name, '/', 1)::uuid = public.current_company_id()
  and public.is_admin_empresa()
);

create policy project_files_company_select on storage.objects
for select using (
  bucket_id = 'project-files'
  and split_part(name, '/', 1)::uuid = public.current_company_id()
);

create policy project_files_company_write on storage.objects
for all using (
  bucket_id = 'project-files'
  and split_part(name, '/', 1)::uuid = public.current_company_id()
  and public.current_role() in ('ADMIN_EMPRESA', 'PROJETISTA', 'CONFERENTE')
) with check (
  bucket_id = 'project-files'
  and split_part(name, '/', 1)::uuid = public.current_company_id()
  and public.current_role() in ('ADMIN_EMPRESA', 'PROJETISTA', 'CONFERENTE')
);
