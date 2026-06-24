create or replace function public.create_company_for_current_user(company_name text, full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  user_email text := auth.email();
  created_company_id uuid;
  profile_row public.profiles;
begin
  if user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select * into profile_row
  from public.profiles
  where id = user_id
  limit 1;

  if found then
    return profile_row;
  end if;

  if nullif(trim(company_name), '') is null then
    raise exception 'Informe o nome da empresa.';
  end if;

  insert into public.companies (name, email, primary_color, secondary_color)
  values (trim(company_name), user_email, '#15201d', '#b8664b')
  returning id into created_company_id;

  insert into public.profiles (id, company_id, name, email, role, active)
  values (
    user_id,
    created_company_id,
    coalesce(nullif(trim(full_name), ''), user_email),
    user_email,
    'ADMIN_EMPRESA',
    true
  )
  returning * into profile_row;

  insert into public.subscriptions (
    company_id,
    plan,
    status,
    current_period_start,
    current_period_end,
    trial_ends_at
  )
  values (
    created_company_id,
    'PROFISSIONAL',
    'TRIAL',
    current_date,
    current_date + 14,
    current_date + 14
  );

  return profile_row;
end;
$$;

revoke all on function public.create_company_for_current_user(text, text) from public;
grant execute on function public.create_company_for_current_user(text, text) to authenticated;
