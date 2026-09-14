create or replace function public.record_payment_with_loyalty(
  p_company_id uuid,
  p_customer_id uuid,
  p_invoice_id uuid,
  p_payment_number varchar(50),
  p_payment_date date,
  p_amount numeric(15,2),
  p_payment_method payment_method,
  p_reference_number varchar(100),
  p_notes text,
  p_points_to_redeem integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_company uuid;
  v_is_admin boolean;
  v_invoice record;
  v_available_points integer;
  v_kes_per_point numeric(14,4);
  v_loyalty_value numeric(14,2);
  v_payment_id uuid;
  v_redemption_id uuid;
  v_new_paid numeric(15,2);
  v_new_loyalty_credit numeric(15,2);
  v_new_balance numeric(15,2);
  v_new_status document_status;
begin
  select company_id, role = 'admin'
    into v_profile_company, v_is_admin
    from public.profiles
   where id = auth.uid();

  if v_profile_company is distinct from p_company_id or not coalesce(v_is_admin, false) then
    raise exception 'Only company administrators can apply loyalty points';
  end if;

  if p_points_to_redeem <= 0 or p_points_to_redeem <> trunc(p_points_to_redeem) then
    raise exception 'Points to redeem must be a positive whole number';
  end if;

  if p_amount <= 0 then
    raise exception 'A positive payment is required when applying loyalty points';
  end if;

  perform 1 from public.customers
   where id = p_customer_id and company_id = p_company_id
   for update;
  if not found then
    raise exception 'Customer not found or does not belong to this company';
  end if;

  select id, customer_id, total_amount, paid_amount, balance_due,
         coalesce(loyalty_credit_amount, 0) as loyalty_credit_amount,
         status
    into v_invoice
    from public.invoices
   where id = p_invoice_id
     and company_id = p_company_id
     and customer_id = p_customer_id
   for update;
  if not found then
    raise exception 'Invoice not found or does not belong to this customer';
  end if;

  if v_invoice.status in ('draft', 'cancelled') then
    raise exception 'Loyalty points cannot be applied to this invoice';
  end if;

  if p_amount + (p_points_to_redeem * coalesce((select kes_per_point from public.loyalty_settings where company_id = p_company_id), 1)) > greatest(v_invoice.balance_due, 0) + 0.01 then
    raise exception 'Payment and loyalty points exceed the invoice balance';
  end if;

  select coalesce(sum(points_delta), 0)::integer
    into v_available_points
    from public.loyalty_point_transactions
   where company_id = p_company_id and customer_id = p_customer_id;
  if p_points_to_redeem > v_available_points then
    raise exception 'Insufficient loyalty points';
  end if;

  select coalesce(kes_per_point, 1)
    into v_kes_per_point
    from public.loyalty_settings
   where company_id = p_company_id;
  v_kes_per_point := coalesce(v_kes_per_point, 1);
  v_loyalty_value := round(p_points_to_redeem * v_kes_per_point, 2);

  insert into public.payments (
    company_id, customer_id, payment_number, payment_date, amount,
    payment_method, reference_number, notes
  ) values (
    p_company_id, p_customer_id, p_payment_number, p_payment_date, p_amount,
    p_payment_method, p_reference_number, p_notes
  ) returning id into v_payment_id;

  insert into public.payment_allocations (payment_id, invoice_id, amount_allocated)
  values (v_payment_id, p_invoice_id, p_amount);

  insert into public.loyalty_redemptions (
    company_id, customer_id, invoice_id, points_redeemed,
    kes_value, kes_per_point, status, reason
  ) values (
    p_company_id, p_customer_id, p_invoice_id, p_points_to_redeem,
    v_loyalty_value, v_kes_per_point, 'completed', 'Applied with payment ' || p_payment_number
  ) returning id into v_redemption_id;

  insert into public.loyalty_point_transactions (
    company_id, customer_id, invoice_id, redemption_id,
    points_delta, event_type, calculation_kes
  ) values (
    p_company_id, p_customer_id, p_invoice_id, v_redemption_id,
    -p_points_to_redeem, 'redemption', v_loyalty_value
  );

  v_new_paid := coalesce(v_invoice.paid_amount, 0) + p_amount;
  v_new_loyalty_credit := coalesce(v_invoice.loyalty_credit_amount, 0) + v_loyalty_value;
  v_new_balance := greatest(0, v_invoice.total_amount - v_new_paid - v_new_loyalty_credit);
  v_new_status := case
    when v_new_balance <= 0 then 'paid'::document_status
    when v_new_paid > 0 or v_new_loyalty_credit > 0 then 'partial'::document_status
    else v_invoice.status
  end;

  update public.invoices
     set paid_amount = v_new_paid,
         loyalty_credit_amount = v_new_loyalty_credit,
         balance_due = v_new_balance,
         status = v_new_status,
         updated_at = now()
   where id = p_invoice_id;

  return json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'redemption_id', v_redemption_id,
    'invoice_id', p_invoice_id,
    'points_redeemed', p_points_to_redeem,
    'loyalty_value', v_loyalty_value,
    'new_paid_amount', v_new_paid,
    'new_loyalty_credit_amount', v_new_loyalty_credit,
    'new_balance_due', v_new_balance,
    'invoice_status', v_new_status
  );
end;
$$;

grant execute on function public.record_payment_with_loyalty(uuid, uuid, uuid, varchar, date, numeric, payment_method, varchar, text, integer) to authenticated;

create index if not exists loyalty_redemptions_customer_created_idx
  on public.loyalty_redemptions(customer_id, created_at);

create index if not exists loyalty_point_transactions_redemption_idx
  on public.loyalty_point_transactions(redemption_id);
