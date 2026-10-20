-- TijaPass V9 REFERENCE migration (not yet connected to V9 browser UI).
-- Apply to the reviewed base schema in a safe test project only, with developer supervision.
-- Production requires server-only offer/disburse RPCs and verified accounting snapshots.

create or replace function public.is_tfl_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.memberships m
 join public.organizations o on o.id=m.organization_id
 where m.user_id=auth.uid() and m.status='active'
 and o.entity_type='tfl' and m.role='tfl_admin');
$$;

create table if not exists public.external_customer_loans (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references public.customers(id),
 created_by uuid not null references auth.users(id),
 lender_name text not null check (length(btrim(lender_name))>0),
 external_reference text,
 balance numeric(18,2) not null check(balance>=0),
 installment numeric(18,2) not null check(installment>0),
 frequency text not null check(frequency in('Daily','Weekly','Monthly')),
 remaining_installments int not null check(remaining_installments between 1 and 1200),
 next_due_date date not null,
 evidence_note text,
 verification_status text not null default 'Customer declared'
   check(verification_status in('Customer declared','TFL reviewed','Disputed','Archived')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 revision int not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint external_balance_plausibility check(balance<=installment*remaining_installments)
);
create index if not exists idx_external_customer_loans_customer on public.external_customer_loans(customer_id,verification_status);

create table if not exists public.external_loan_revisions (
 id uuid primary key default gen_random_uuid(),
 external_loan_id uuid not null references public.external_customer_loans(id),
 actor_user_id uuid not null references auth.users(id),
 changed_at timestamptz not null default now(),
 previous_record jsonb not null,
 revised_record jsonb not null,
 reason text not null check(length(btrim(reason))>=10)
);

-- Immutable customer submissions: only a TFL admin may UPDATE, and the original
-- is always preserved by a trigger. No client DELETE path; use Archived status.
create or replace function public.v9_external_loan_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
   if not public.is_tfl_admin() then
     if new.created_by<>auth.uid() or new.verification_status<>'Customer declared'
       or new.reviewed_by is not null or new.reviewed_at is not null
     then raise exception 'Customers may submit only their own unverified declaration'; end if;
   end if;
   return new;
 end if;
 if tg_op='UPDATE' then
   if not public.is_tfl_admin() then raise exception 'Only TFL admin may revise or archive external loans'; end if;
   if old.id<>new.id or old.customer_id<>new.customer_id or old.created_by<>new.created_by
     then raise exception 'External loan ownership and identifier are immutable'; end if;
   if nullif(current_setting('app.external_loan_reason',true),'') is null or
      length(btrim(current_setting('app.external_loan_reason',true)))<10
     then raise exception 'Meaningful reviewer reason is required'; end if;
   new.updated_at=now(); new.revision=old.revision+1;
   new.reviewed_by=auth.uid();new.reviewed_at=now();
   insert into public.external_loan_revisions(external_loan_id,actor_user_id,previous_record,revised_record,reason)
     values(old.id,auth.uid(),to_jsonb(old),to_jsonb(new),current_setting('app.external_loan_reason',true));
   return new;
 end if;
 return null;
end;
$$;
drop trigger if exists v9_external_change on public.external_customer_loans;
create trigger v9_external_change before insert or update on public.external_customer_loans
for each row execute function public.v9_external_loan_change();

alter table public.external_customer_loans enable row level security;
alter table public.external_loan_revisions enable row level security;
create policy external_read on public.external_customer_loans for select to authenticated
 using(customer_id in(select public.current_customer_ids()) or public.is_tfl_admin());
create policy external_submit on public.external_customer_loans for insert to authenticated
 with check (customer_id in(select public.current_customer_ids()) and created_by=auth.uid() and verification_status='Customer declared');
create policy external_admin_update on public.external_customer_loans for update to authenticated
 using(public.is_tfl_admin()) with check(public.is_tfl_admin());
create policy revisions_read on public.external_loan_revisions for select to authenticated
 using(public.is_tfl_admin() or external_loan_id in(select id from public.external_customer_loans where customer_id in(select public.current_customer_ids())));
revoke delete on public.external_customer_loans from authenticated;
revoke insert,update,delete on public.external_loan_revisions from authenticated;

alter table public.finance_products add column if not exists installment_count int;
alter table public.loans add column if not exists installment_count int;
alter table public.loans add column if not exists underwriting_snapshot jsonb;
alter table public.loans add column if not exists eligibility_policy_version text default 'V9-2026-10';
alter table public.repayment_schedule add column if not exists paid_at timestamptz;

-- Critical implementer note: do not call a privileged update from an untrusted
-- client while setting 'app.external_loan_reason'. Provide server-side authenticated
-- admin-only RPC in one database transaction, with immutable actor and reason.
-- Separate wallet-level loan servicing, schedule allocations and accounting posting
-- must be atomic and idempotent. New V9 UI does not yet execute these SQL operations.
