alter table public.client_projects
add column if not exists assembly_started_date date;
