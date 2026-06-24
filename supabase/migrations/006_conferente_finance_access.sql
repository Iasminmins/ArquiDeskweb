drop policy if exists sales_select on public.financial_sales;
create policy sales_select on public.financial_sales for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or (company_id = public.current_company_id() and public.current_role() = 'PROJETISTA' and designer_id = auth.uid())
);

drop policy if exists payments_select on public.financial_payments;
create policy payments_select on public.financial_payments for select using (
  public.is_super_admin()
  or (company_id = public.current_company_id() and public.current_role() in ('ADMIN_EMPRESA', 'CONFERENTE'))
  or exists (
    select 1 from public.financial_sales s
    where s.id = financial_sale_id and s.company_id = public.current_company_id() and s.designer_id = auth.uid()
  )
);
