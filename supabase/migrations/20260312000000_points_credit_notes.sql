alter table public.loyalty_redemptions
  add column if not exists credit_note_id uuid references public.credit_notes(id) on delete restrict;

alter table public.loyalty_point_transactions
  add column if not exists credit_note_id uuid references public.credit_notes(id) on delete restrict;

alter table public.credit_notes
  add column if not exists loyalty_points_redeemed integer not null default 0,
  add column if not exists loyalty_credit_amount numeric(14, 2) not null default 0;

alter table public.loyalty_redemptions
  drop constraint if exists loyalty_redemptions_invoice_or_credit_note_check;
alter table public.loyalty_redemptions
  add constraint loyalty_redemptions_invoice_or_credit_note_check
  check (num_nonnulls(invoice_id, credit_note_id) <= 1);

alter table public.loyalty_point_transactions
  drop constraint if exists loyalty_point_transactions_invoice_or_credit_note_check;
alter table public.loyalty_point_transactions
  add constraint loyalty_point_transactions_invoice_or_credit_note_check
  check (num_nonnulls(invoice_id, credit_note_id) <= 1);

create index if not exists loyalty_redemptions_credit_note_idx
  on public.loyalty_redemptions(credit_note_id);
create index if not exists loyalty_point_transactions_credit_note_idx
  on public.loyalty_point_transactions(credit_note_id);
create unique index if not exists loyalty_credit_note_redemption_once_idx
  on public.loyalty_redemptions(credit_note_id)
  where credit_note_id is not null and status = 'completed';
create unique index if not exists loyalty_credit_note_reversal_once_idx
  on public.loyalty_point_transactions(redemption_id)
  where event_type = 'redemption_reversal';

create or replace function public.loyalty_create_credit_note_with_points(
  p_company_id uuid,
  p_customer_id uuid,
  p_credit_note_number text,
  p_credit_note_date date,
  p_reason text,
  p_notes text default null,
  p_requested_points integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_rate numeric(14,2);
  v_balance integer;
  v_value numeric(14,2);
  v_credit_note public.credit_notes;
  v_redemption public.loyalty_redemptions;
begin
  if not public.loyalty_is_admin(p_company_id) then
    raise exception 'Only company administrators can create points-funded credit notes';
  end if;
  if p_requested_points is null or p_requested_points <= 0 or p_requested_points <> trunc(p_requested_points) then
    raise exception 'Points must be a positive whole number';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'A reason is required';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id and company_id = p_company_id
  for update;
  if not found then raise exception 'Customer does not belong to this company'; end if;

  select coalesce(sum(points_delta), 0)::integer into v_balance
  from public.loyalty_point_transactions
  where company_id = p_company_id and customer_id = p_customer_id;
  if v_balance < p_requested_points then raise exception 'Insufficient points'; end if;

  select coalesce(kes_per_point, 1) into v_rate
  from public.loyalty_settings where company_id = p_company_id;
  v_rate := coalesce(v_rate, 1);
  v_value := round(p_requested_points * v_rate, 2);
  if v_value <= 0 then raise exception 'Credit note value must be greater than zero'; end if;

  insert into public.credit_notes (
    company_id, customer_id, credit_note_number, credit_note_date, status,
    reason, subtotal, tax_amount, total_amount, applied_amount, balance,
    affects_inventory, notes, currency_code, exchange_rate, fx_date,
    loyalty_points_redeemed, loyalty_credit_amount
  ) values (
    p_company_id, p_customer_id, p_credit_note_number, p_credit_note_date, 'sent',
    v_value, 0, v_value, 0, v_value, false, p_notes, 'KES', 1, p_credit_note_date,
    p_requested_points, v_value
  ) returning * into v_credit_note;

  insert into public.loyalty_redemptions (
    company_id, customer_id, credit_note_id, points_redeemed, kes_value,
    kes_per_point, status, reason, created_by
  ) values (
    p_company_id, p_customer_id, v_credit_note.id, p_requested_points, v_value,
    v_rate, 'completed', trim(p_reason), auth.uid()
  ) returning * into v_redemption;

  insert into public.loyalty_point_transactions (
    company_id, customer_id, credit_note_id, redemption_id, points_delta,
    event_type, calculation_kes, created_by, reason
  ) values (
    p_company_id, p_customer_id, v_credit_note.id, v_redemption.id, -p_requested_points,
    'redemption', v_value, auth.uid(), trim(p_reason)
  );

  return json_build_object(
    'credit_note_id', v_credit_note.id,
    'redemption_id', v_redemption.id,
    'requested_points', p_requested_points,
    'points_redeemed', p_requested_points,
    'kes_value', v_value,
    'remaining_points', v_balance - p_requested_points
  );
end;
$$;

create or replace function public.reverse_credit_note(
  p_credit_note_id uuid,
  p_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_note record;
  v_redemption record;
  v_allocation record;
  v_movement record;
begin
  select * into v_credit_note from public.credit_notes where id = p_credit_note_id for update;
  if not found then return json_build_object('success', false, 'error', 'Credit note not found'); end if;
  if not public.loyalty_is_admin(v_credit_note.company_id) then
    return json_build_object('success', false, 'error', 'Only company administrators can reverse credit notes');
  end if;
  if v_credit_note.status = 'cancelled' then
    return json_build_object('success', false, 'error', 'Credit note is already cancelled');
  end if;

  for v_allocation in select * from public.credit_note_allocations where credit_note_id = p_credit_note_id for update loop
    update public.invoices
    set paid_amount = greatest(0, coalesce(paid_amount, 0) - v_allocation.allocated_amount),
        balance_due = coalesce(balance_due, 0) + v_allocation.allocated_amount,
        updated_at = now()
    where id = v_allocation.invoice_id;
    delete from public.credit_note_allocations where id = v_allocation.id;
  end loop;

  for v_movement in select * from public.stock_movements where reference_type = 'CREDIT_NOTE' and reference_id = p_credit_note_id loop
    insert into public.stock_movements (company_id, product_id, movement_type, quantity, reference_type, reference_id, notes)
    values (v_movement.company_id, v_movement.product_id,
      case when v_movement.movement_type = 'IN' then 'OUT' else 'IN' end,
      abs(v_movement.quantity), 'CREDIT_NOTE_REVERSAL', p_credit_note_id,
      'Reversal of ' || v_movement.notes);
    if v_movement.movement_type = 'IN' then
      update public.products set stock_quantity = greatest(0, coalesce(stock_quantity, 0) - abs(v_movement.quantity)) where id = v_movement.product_id;
    else
      update public.products set stock_quantity = coalesce(stock_quantity, 0) + abs(v_movement.quantity) where id = v_movement.product_id;
    end if;
  end loop;

  for v_redemption in
    select * from public.loyalty_redemptions
    where credit_note_id = p_credit_note_id and status = 'completed'
    for update
  loop
    insert into public.loyalty_point_transactions (
      company_id, customer_id, credit_note_id, redemption_id, points_delta,
      event_type, calculation_kes, created_by, reason
    ) values (
      v_redemption.company_id, v_redemption.customer_id, v_redemption.credit_note_id,
      v_redemption.id, v_redemption.points_redeemed, 'redemption_reversal',
      v_redemption.kes_value, auth.uid(), coalesce(p_reason, 'Credit note reversed')
    ) on conflict (redemption_id) where event_type = 'redemption_reversal' do nothing;

    update public.loyalty_redemptions
    set status = 'reversed', reversed_at = now(), reversed_by = auth.uid()
    where id = v_redemption.id;
  end loop;

  update public.credit_notes
  set status = 'cancelled', applied_amount = 0, balance = total_amount,
      loyalty_points_redeemed = 0, loyalty_credit_amount = 0,
      notes = case when p_reason is not null then 'Reversed - ' || p_reason else 'Reversed' end,
      updated_at = now()
  where id = p_credit_note_id;

  return json_build_object('success', true, 'credit_note_number', v_credit_note.credit_note_number, 'message', 'Credit note reversed successfully');
exception when others then
  return json_build_object('success', false, 'error', 'Error during reversal: ' || sqlerrm);
end;
$$;

grant execute on function public.loyalty_create_credit_note_with_points(uuid, uuid, text, date, text, text, integer) to authenticated;
grant execute on function public.reverse_credit_note(uuid, text) to authenticated;
