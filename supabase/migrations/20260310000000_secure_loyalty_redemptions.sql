-- Keep loyalty transaction history immutable from the client and move mutations behind RPCs.
drop policy if exists "Company users can manage loyalty point transactions" on public.loyalty_point_transactions;
drop policy if exists "Company users can read loyalty point transactions" on public.loyalty_point_transactions;
create policy "Company users can read loyalty point transactions"
  on public.loyalty_point_transactions for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create or replace function public.loyalty_refresh_customer_snapshots(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  invoice_row record;
  invoice_points integer;
  running_points integer := 0;
begin
  for invoice_row in
    select id
    from public.invoices
    where customer_id = p_customer_id
    order by invoice_date, created_at, id
  loop
    select coalesce(sum(points_delta), 0)::integer into invoice_points
    from public.loyalty_point_transactions
    where invoice_id = invoice_row.id and event_type = 'invoice_award';

    running_points := running_points + invoice_points;
    update public.invoices
    set earned_points = invoice_points, total_points = running_points
    where id = invoice_row.id;
  end loop;
end;
$$;

create or replace function public.loyalty_sync_invoice_points(
  p_invoice_id uuid, p_company_id uuid, p_customer_id uuid, p_total_kes numeric
)
returns void language plpgsql security definer set search_path = public as $$
declare
  invoice_row public.invoices;
  earned integer := greatest(0, floor(coalesce(p_total_kes, 0) / 100));
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and company_id = p_company_id) then
    raise exception 'Company access is required';
  end if;
  select * into invoice_row from public.invoices
  where id = p_invoice_id and company_id = p_company_id and customer_id = p_customer_id for update;
  if not found then raise exception 'Invoice does not belong to this company and customer'; end if;

  delete from public.loyalty_point_transactions
  where invoice_id = p_invoice_id and event_type = 'invoice_award';
  if earned > 0 then
    insert into public.loyalty_point_transactions
      (company_id, customer_id, invoice_id, points_delta, event_type, calculation_kes, created_by, reason)
    values
      (p_company_id, p_customer_id, p_invoice_id, earned, 'invoice_award', coalesce(p_total_kes, 0), auth.uid(), 'Invoice award');
  end if;
  perform public.loyalty_refresh_customer_snapshots(p_customer_id);
end;
$$;

create or replace function public.loyalty_customer_balance(p_customer_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(points_delta), 0)::integer
  from public.loyalty_point_transactions
  where customer_id = p_customer_id
    and company_id in (select company_id from public.profiles where id = auth.uid());
$$;

create or replace function public.loyalty_adjust_points(
  p_company_id uuid, p_customer_id uuid, p_points integer, p_reason text
)
returns public.loyalty_point_transactions language plpgsql security definer set search_path = public as $$
declare result public.loyalty_point_transactions;
begin
  if not public.loyalty_is_admin(p_company_id) then raise exception 'Only company administrators can adjust loyalty points'; end if;
  if p_points is null or p_points = 0 or nullif(trim(p_reason), '') is null then raise exception 'Points and reason are required'; end if;
  perform 1 from public.customers where id = p_customer_id and company_id = p_company_id for update;
  if not found then raise exception 'Customer does not belong to this company'; end if;
  if p_points < 0 and public.loyalty_customer_balance(p_customer_id) + p_points < 0 then raise exception 'Insufficient points'; end if;
  insert into public.loyalty_point_transactions(company_id, customer_id, points_delta, event_type, created_by, reason)
  values (p_company_id, p_customer_id, p_points, 'manual_adjustment', auth.uid(), trim(p_reason)) returning * into result;
  return result;
end;
$$;

create or replace function public.loyalty_redeem_points(
  p_company_id uuid, p_customer_id uuid, p_points integer, p_invoice_id uuid default null, p_reason text default 'Points redeemed'
)
returns public.loyalty_redemptions language plpgsql security definer set search_path = public as $$
declare
  result public.loyalty_redemptions;
  v_rate numeric;
  v_value numeric;
  v_balance integer;
  v_invoice public.invoices;
  v_balance_due numeric;
begin
  if not public.loyalty_is_admin(p_company_id) then raise exception 'Only company administrators can redeem loyalty points'; end if;
  if p_points is null or p_points <= 0 or p_points <> trunc(p_points) or nullif(trim(p_reason), '') is null then raise exception 'Positive whole points and reason are required'; end if;
  perform 1 from public.customers where id = p_customer_id and company_id = p_company_id for update;
  if not found then raise exception 'Customer does not belong to this company'; end if;
  select coalesce(sum(points_delta), 0)::integer into v_balance
  from public.loyalty_point_transactions where customer_id = p_customer_id and company_id = p_company_id;
  if v_balance < p_points then raise exception 'Insufficient points'; end if;

  if p_invoice_id is not null then
    select * into v_invoice from public.invoices
    where id = p_invoice_id and company_id = p_company_id and customer_id = p_customer_id for update;
    if not found then raise exception 'Invoice is not eligible for redemption'; end if;
    v_balance_due := greatest(0, coalesce(v_invoice.balance_due, v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0)));
    if v_balance_due <= 0 then raise exception 'Invoice is not eligible for redemption'; end if;
  end if;

  select coalesce(kes_per_point, 1) into v_rate from public.loyalty_settings where company_id = p_company_id;
  v_rate := coalesce(v_rate, 1);
  v_value := round(p_points * v_rate, 2);
  if p_invoice_id is not null and v_value > v_balance_due then raise exception 'Redemption value exceeds invoice balance'; end if;

  insert into public.loyalty_redemptions(company_id, customer_id, invoice_id, points_redeemed, kes_value, kes_per_point, reason, created_by)
  values (p_company_id, p_customer_id, p_invoice_id, p_points, v_value, v_rate, trim(p_reason), auth.uid()) returning * into result;
  insert into public.loyalty_point_transactions(company_id, customer_id, invoice_id, points_delta, event_type, calculation_kes, created_by, reason, redemption_id)
  values (p_company_id, p_customer_id, p_invoice_id, -p_points, 'redemption', v_value, auth.uid(), trim(p_reason), result.id);
  if p_invoice_id is not null then
    update public.invoices
    set loyalty_credit_amount = coalesce(loyalty_credit_amount, 0) + v_value,
        balance_due = greatest(0, total_amount - coalesce(paid_amount, 0) - coalesce(loyalty_credit_amount, 0) - v_value),
        status = case when total_amount - coalesce(paid_amount, 0) - coalesce(loyalty_credit_amount, 0) - v_value <= 0 then 'paid' else 'partial' end,
        updated_at = now()
    where id = p_invoice_id;
  end if;
  return result;
end;
$$;

create or replace function public.loyalty_reverse_redemption(p_redemption_id uuid)
returns public.loyalty_redemptions language plpgsql security definer set search_path = public as $$
declare
  redemption public.loyalty_redemptions;
  invoice_row public.invoices;
begin
  select * into redemption from public.loyalty_redemptions where id = p_redemption_id for update;
  if not found then raise exception 'Redemption not found'; end if;
  if not public.loyalty_is_admin(redemption.company_id) then raise exception 'Only company administrators can reverse loyalty redemptions'; end if;
  if redemption.status = 'reversed' then return redemption; end if;
  perform 1 from public.customers where id = redemption.customer_id for update;
  if redemption.invoice_id is not null then
    select * into invoice_row from public.invoices where id = redemption.invoice_id for update;
  end if;
  insert into public.loyalty_point_transactions(company_id, customer_id, invoice_id, points_delta, event_type, calculation_kes, created_by, reason, redemption_id)
  values (redemption.company_id, redemption.customer_id, redemption.invoice_id, redemption.points_redeemed, 'redemption_reversal', redemption.kes_value, auth.uid(), 'Redemption reversed', redemption.id);
  update public.loyalty_redemptions set status = 'reversed', reversed_at = now(), reversed_by = auth.uid() where id = redemption.id returning * into redemption;
  if invoice_row.id is not null then
    update public.invoices
    set loyalty_credit_amount = greatest(0, coalesce(loyalty_credit_amount, 0) - redemption.kes_value),
        balance_due = greatest(0, total_amount - coalesce(paid_amount, 0) - greatest(0, coalesce(loyalty_credit_amount, 0) - redemption.kes_value)),
        status = case when total_amount - coalesce(paid_amount, 0) - greatest(0, coalesce(loyalty_credit_amount, 0) - redemption.kes_value) <= 0 then 'paid' else 'partial' end,
        updated_at = now()
    where id = invoice_row.id;
  end if;
  return redemption;
end;
$$;

create or replace function public.loyalty_reverse_invoice_redemptions(p_invoice_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  redemption record;
  reversed_count integer := 0;
begin
  for redemption in
    select id from public.loyalty_redemptions
    where invoice_id = p_invoice_id and status = 'completed'
    order by created_at
    for update
  loop
    perform public.loyalty_reverse_redemption(redemption.id);
    reversed_count := reversed_count + 1;
  end loop;
  return reversed_count;
end;
$$;

create or replace function public.loyalty_remove_invoice_points(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  invoice_row public.invoices;
  redemption public.loyalty_redemptions;
begin
  select * into invoice_row from public.invoices where id = p_invoice_id for update;
  if not found or not exists (select 1 from public.profiles where id = auth.uid() and company_id = invoice_row.company_id) then raise exception 'Invoice access is required'; end if;
  for redemption in select * from public.loyalty_redemptions where invoice_id = p_invoice_id and status = 'completed' order by created_at for update loop
    perform public.loyalty_reverse_redemption(redemption.id);
  end loop;
  delete from public.loyalty_point_transactions where invoice_id = p_invoice_id and event_type = 'invoice_award';
  update public.loyalty_redemptions set invoice_id = null where invoice_id = p_invoice_id;
  perform public.loyalty_refresh_customer_snapshots(invoice_row.customer_id);
end;
$$;

revoke all on function public.loyalty_sync_invoice_points(uuid, uuid, uuid, numeric) from public;
revoke all on function public.loyalty_adjust_points(uuid, uuid, integer, text) from public;
revoke all on function public.loyalty_redeem_points(uuid, uuid, integer, uuid, text) from public;
revoke all on function public.loyalty_reverse_redemption(uuid) from public;
revoke all on function public.loyalty_reverse_invoice_redemptions(uuid) from public;
revoke all on function public.loyalty_remove_invoice_points(uuid) from public;
grant execute on function public.loyalty_sync_invoice_points(uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.loyalty_adjust_points(uuid, uuid, integer, text) to authenticated;
grant execute on function public.loyalty_redeem_points(uuid, uuid, integer, uuid, text) to authenticated;
grant execute on function public.loyalty_reverse_redemption(uuid) to authenticated;
grant execute on function public.loyalty_reverse_invoice_redemptions(uuid) to authenticated;
grant execute on function public.loyalty_remove_invoice_points(uuid) to authenticated;
