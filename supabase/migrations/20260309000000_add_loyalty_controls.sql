create table if not exists public.loyalty_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  kes_per_point numeric(14, 2) not null default 1.00,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint loyalty_settings_kes_per_point_check check (kes_per_point > 0)
);

alter table public.loyalty_point_transactions
  drop constraint if exists loyalty_point_transactions_event_type_check;
alter table public.loyalty_point_transactions
  add constraint loyalty_point_transactions_event_type_check check (
    event_type in ('invoice_award', 'invoice_reversal', 'credit_note_reversal', 'manual_adjustment', 'redemption', 'redemption_reversal')
  );
alter table public.loyalty_point_transactions
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists reason text,
  add column if not exists redemption_id uuid;

alter table public.invoices
  add column if not exists loyalty_credit_amount numeric(14, 2) not null default 0;

create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete restrict,
  points_redeemed integer not null,
  kes_value numeric(14, 2) not null,
  kes_per_point numeric(14, 2) not null,
  status text not null default 'completed',
  reason text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id),
  constraint loyalty_redemptions_points_check check (points_redeemed > 0),
  constraint loyalty_redemptions_value_check check (kes_value > 0),
  constraint loyalty_redemptions_rate_check check (kes_per_point > 0),
  constraint loyalty_redemptions_status_check check (status in ('completed', 'reversed'))
);

create index if not exists loyalty_redemptions_customer_idx on public.loyalty_redemptions(customer_id, created_at desc);
create index if not exists loyalty_redemptions_company_idx on public.loyalty_redemptions(company_id, created_at desc);
create index if not exists loyalty_redemptions_invoice_idx on public.loyalty_redemptions(invoice_id);

create or replace function public.loyalty_is_admin(p_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and company_id = p_company_id and role = 'admin'
  );
$$;

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_redemptions enable row level security;

drop policy if exists "Company users can read loyalty settings" on public.loyalty_settings;
create policy "Company users can read loyalty settings" on public.loyalty_settings for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
drop policy if exists "Admins can manage loyalty settings" on public.loyalty_settings;
create policy "Admins can manage loyalty settings" on public.loyalty_settings for all
  using (public.loyalty_is_admin(company_id)) with check (public.loyalty_is_admin(company_id));

drop policy if exists "Company users can read loyalty redemptions" on public.loyalty_redemptions;
create policy "Company users can read loyalty redemptions" on public.loyalty_redemptions for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));
drop policy if exists "Admins can manage loyalty redemptions" on public.loyalty_redemptions;
create policy "Admins can manage loyalty redemptions" on public.loyalty_redemptions for all
  using (public.loyalty_is_admin(company_id)) with check (public.loyalty_is_admin(company_id));

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
  if p_points = 0 or nullif(trim(p_reason), '') is null then raise exception 'Points and reason are required'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and company_id = p_company_id) then raise exception 'Customer does not belong to this company'; end if;
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
declare result public.loyalty_redemptions; v_rate numeric; v_value numeric; v_balance integer; v_invoice public.invoices;
begin
  if not public.loyalty_is_admin(p_company_id) then raise exception 'Only company administrators can redeem loyalty points'; end if;
  if p_points <= 0 or nullif(trim(p_reason), '') is null then raise exception 'Positive points and reason are required'; end if;
  if not exists (select 1 from public.customers where id = p_customer_id and company_id = p_company_id) then raise exception 'Customer does not belong to this company'; end if;
  select loyalty_customer_balance(p_customer_id) into v_balance;
  if v_balance < p_points then raise exception 'Insufficient points'; end if;
  if p_invoice_id is not null then
    select * into v_invoice from public.invoices where id = p_invoice_id and company_id = p_company_id and customer_id = p_customer_id for update;
    if not found or coalesce(v_invoice.balance_due, v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0)) <= 0 then raise exception 'Invoice is not eligible for redemption'; end if;
  end if;
  select coalesce(kes_per_point, 1) into v_rate from public.loyalty_settings where company_id = p_company_id;
  v_rate := coalesce(v_rate, 1);
  v_value := round(p_points * v_rate, 2);
  if p_invoice_id is not null and v_value > greatest(0, coalesce(v_invoice.balance_due, v_invoice.total_amount - coalesce(v_invoice.paid_amount, 0))) then raise exception 'Redemption value exceeds invoice balance'; end if;
  insert into public.loyalty_redemptions(company_id, customer_id, invoice_id, points_redeemed, kes_value, kes_per_point, reason, created_by)
  values (p_company_id, p_customer_id, p_invoice_id, p_points, v_value, v_rate, trim(p_reason), auth.uid()) returning * into result;
  insert into public.loyalty_point_transactions(company_id, customer_id, invoice_id, points_delta, event_type, calculation_kes, created_by, reason, redemption_id)
  values (p_company_id, p_customer_id, p_invoice_id, -p_points, 'redemption', v_value, auth.uid(), trim(p_reason), result.id);
  if p_invoice_id is not null then
    update public.invoices set loyalty_credit_amount = coalesce(loyalty_credit_amount, 0) + v_value,
      balance_due = greatest(0, total_amount - coalesce(paid_amount, 0) - coalesce(loyalty_credit_amount, 0) - v_value),
      status = case when total_amount - coalesce(paid_amount, 0) - coalesce(loyalty_credit_amount, 0) - v_value <= 0 then 'paid' else 'partial' end,
      updated_at = now() where id = p_invoice_id;
  end if;
  return result;
end;
$$;

revoke all on function public.loyalty_adjust_points(uuid, uuid, integer, text) from public;
revoke all on function public.loyalty_redeem_points(uuid, uuid, integer, uuid, text) from public;
grant execute on function public.loyalty_adjust_points(uuid, uuid, integer, text) to authenticated;
grant execute on function public.loyalty_redeem_points(uuid, uuid, integer, uuid, text) to authenticated;
