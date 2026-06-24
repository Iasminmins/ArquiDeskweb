alter table public.financial_sales
add column if not exists commission_percent numeric(6,3) not null default 0 check (commission_percent >= 0);
