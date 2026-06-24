alter table public.subscriptions
add column if not exists provider text,
add column if not exists external_customer_id text,
add column if not exists external_subscription_id text,
add column if not exists checkout_url text,
add column if not exists selected_plan_key text;
