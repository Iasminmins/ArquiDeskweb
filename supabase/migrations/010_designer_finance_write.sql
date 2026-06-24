drop policy if exists sales_designer_insert on public.financial_sales;
create policy sales_designer_insert on public.financial_sales for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);

drop policy if exists sales_designer_update on public.financial_sales;
create policy sales_designer_update on public.financial_sales for update using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
) with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and designer_id = auth.uid()
);

drop policy if exists payments_designer_insert on public.financial_payments;
create policy payments_designer_insert on public.financial_payments for insert with check (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);

drop policy if exists payments_designer_update on public.financial_payments;
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

drop policy if exists payments_designer_delete on public.financial_payments;
create policy payments_designer_delete on public.financial_payments for delete using (
  company_id = public.current_company_id()
  and public.current_role() = 'PROJETISTA'
  and exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);
