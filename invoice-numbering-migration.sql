begin;

create table if not exists public.invoice_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_year integer not null,
  last_number integer not null default 0,
  primary key (company_id, invoice_year),
  check (invoice_year between 2000 and 2100),
  check (last_number >= 0)
);

insert into public.invoice_number_counters (company_id, invoice_year, last_number)
select
  i.company_id,
  substring(i.invoice_number from '^INV-([0-9]{4})-')::integer,
  max(substring(i.invoice_number from '^INV-[0-9]{4}-([0-9]+)$')::integer)
from public.invoices i
where i.invoice_number ~ '^INV-[0-9]{4}-[0-9]+$'
group by i.company_id, substring(i.invoice_number from '^INV-([0-9]{4})-')::integer
on conflict (company_id, invoice_year) do update
set last_number = greatest(public.invoice_number_counters.last_number, excluded.last_number);

create or replace function public.next_invoice_number(p_company_id uuid)
returns varchar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_number integer;
begin
  insert into public.invoice_number_counters (company_id, invoice_year, last_number)
  values (p_company_id, v_year, 1)
  on conflict (company_id, invoice_year) do update
    set last_number = public.invoice_number_counters.last_number + 1
  returning last_number into v_number;

  return format('INV-%s-%s', v_year, lpad(v_number::text, 4, '0'));
end;
$$;

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.invoice_number := public.next_invoice_number(new.company_id);
  return new;
end;
$$;

drop trigger if exists invoices_assign_invoice_number on public.invoices;
create trigger invoices_assign_invoice_number
before insert on public.invoices
for each row execute function public.assign_invoice_number();

alter table public.invoices drop constraint if exists invoices_invoice_number_key;
alter table public.invoices add constraint invoices_company_invoice_number_key
  unique (company_id, invoice_number);

commit;
