create table if not exists public.loyalty_point_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  points_delta integer not null,
  event_type text not null,
  calculation_kes numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint loyalty_point_transactions_event_type_check check (event_type in ('invoice_award', 'invoice_reversal', 'credit_note_reversal')),
  constraint loyalty_point_transactions_points_check check (points_delta <> 0)
);

alter table public.invoices
  add column if not exists earned_points integer not null default 0,
  add column if not exists total_points integer not null default 0;

create unique index if not exists loyalty_point_transactions_invoice_award_idx
  on public.loyalty_point_transactions(invoice_id)
  where event_type = 'invoice_award';
create index if not exists loyalty_point_transactions_customer_idx
  on public.loyalty_point_transactions(customer_id, created_at);
create index if not exists loyalty_point_transactions_invoice_idx
  on public.loyalty_point_transactions(invoice_id);

alter table public.loyalty_point_transactions enable row level security;

create policy "Company users can read loyalty point transactions"
  on public.loyalty_point_transactions for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Company users can manage loyalty point transactions"
  on public.loyalty_point_transactions for all
  using (company_id in (select company_id from public.profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));
