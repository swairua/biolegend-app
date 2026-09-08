begin;

-- Stop before changing constraints if existing data is inconsistent.
do $$
begin
  if exists (
    select 1
    from public.quotations
    group by company_id, quotation_number
    having count(*) > 1
  ) then
    raise exception 'Duplicate quotation numbers exist within a company; resolve them before running this migration';
  end if;

  if exists (
    select 1
    from public.invoices i
    left join public.quotations q on q.id = i.quotation_id
    where i.quotation_id is not null
      and (
        q.id is null
        or i.company_id is distinct from q.company_id
        or i.customer_id is distinct from q.customer_id
      )
  ) then
    raise exception 'Invoice-to-quotation mismatches exist; resolve them before running this migration';
  end if;
end;
$$;

create table if not exists public.quotation_number_counters (
  company_id uuid not null references public.companies(id) on delete cascade,
  quotation_year integer not null,
  last_number integer not null default 0,
  primary key (company_id, quotation_year),
  check (quotation_year between 2000 and 2100),
  check (last_number >= 0)
);

insert into public.quotation_number_counters (company_id, quotation_year, last_number)
select
  q.company_id,
  substring(q.quotation_number from '^QT-([0-9]{4})-')::integer,
  max(substring(q.quotation_number from '^QT-[0-9]{4}-([0-9]+)$')::integer)
from public.quotations q
where q.company_id is not null
  and q.quotation_number ~ '^QT-[0-9]{4}-[0-9]+$'
group by q.company_id, substring(q.quotation_number from '^QT-([0-9]{4})-')::integer
on conflict (company_id, quotation_year) do update
set last_number = greatest(
  public.quotation_number_counters.last_number,
  excluded.last_number
);

create or replace function public.next_quotation_number(p_company_id uuid)
returns varchar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from current_date)::integer;
  v_number integer;
begin
  if p_company_id is null then
    raise exception 'A company is required to generate a quotation number';
  end if;

  insert into public.quotation_number_counters (company_id, quotation_year, last_number)
  values (p_company_id, v_year, 1)
  on conflict (company_id, quotation_year) do update
    set last_number = public.quotation_number_counters.last_number + 1
  returning last_number into v_number;

  return format('QT-%s-%s', v_year, lpad(v_number::text, 4, '0'));
end;
$$;

create or replace function public.assign_quotation_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.quotation_number := public.next_quotation_number(new.company_id);
  return new;
end;
$$;

drop trigger if exists quotations_assign_quotation_number on public.quotations;
create trigger quotations_assign_quotation_number
before insert on public.quotations
for each row execute function public.assign_quotation_number();

alter table public.quotations
  drop constraint if exists quotations_quotation_number_key;
alter table public.quotations
  drop constraint if exists quotations_company_quotation_number_key;
alter table public.quotations
  add constraint quotations_company_quotation_number_key
  unique (company_id, quotation_number);

alter table public.invoices
  drop constraint if exists invoices_quotation_id_fkey;
alter table public.invoices
  add constraint invoices_quotation_id_fkey
  foreign key (quotation_id)
  references public.quotations(id)
  on delete set null;

create or replace function public.validate_invoice_quotation_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_customer_id uuid;
begin
  if new.quotation_id is null then
    return new;
  end if;

  select q.company_id, q.customer_id
    into v_company_id, v_customer_id
  from public.quotations q
  where q.id = new.quotation_id;

  if new.company_id is distinct from v_company_id
     or new.customer_id is distinct from v_customer_id then
    raise exception
      'Invoice does not match quotation % by company or customer',
      new.quotation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_validate_quotation_match on public.invoices;
create trigger invoices_validate_quotation_match
before insert or update of quotation_id, company_id, customer_id on public.invoices
for each row execute function public.validate_invoice_quotation_match();

commit;
