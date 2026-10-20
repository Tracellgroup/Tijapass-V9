-- TijaPass V4 production baseline schema for Supabase/PostgreSQL.
-- Run in a new Supabase project after review by the implementation developer.
-- Wallet transfers MUST be executed through a server-side/RPC function, never by direct client balance edits.

create extension if not exists pgcrypto;

create type public.app_role as enum ('tfl_admin','tfl_officer','customer','fi_admin','fi_credit','supplier_admin');
create type public.entity_type as enum ('tfl','customer','financial_institution','supplier');
create type public.record_status as enum ('active','pending','suspended','closed');
create type public.wallet_tx_status as enum ('pending','completed','reversed','failed');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  entity_type public.entity_type not null,
  legal_name text not null,
  registration_no text,
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  status public.record_status not null default 'active',
  unique(user_id, organization_id, role)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique not null references public.organizations(id),
  passport_no text unique not null,
  owner_name text not null,
  phone text not null,
  email text,
  date_of_birth date,
  nida_no text,
  gender text,
  sector text,
  business_address text,
  residential_address text,
  operating_months int not null default 0,
  profile_photo_path text,
  id_document_path text,
  business_assets numeric(18,2) not null default 0,
  inventory_value numeric(18,2) not null default 0,
  receivables numeric(18,2) not null default 0,
  payables numeric(18,2) not null default 0,
  training_status text,
  monitoring_score numeric(5,2) not null default 0,
  verification_status text not null default 'pending',
  assigned_tfl_officer uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.financial_institutions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique not null references public.organizations(id),
  institution_type text not null,
  is_tfl boolean not null default false,
  approved_partner boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique not null references public.organizations(id),
  category text,
  phone text,
  email text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  scope jsonb not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  ip_address inet,
  user_agent text
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique not null references public.organizations(id),
  currency char(3) not null default 'TZS',
  status public.record_status not null default 'active',
  available_balance numeric(18,2) not null default 0 check (available_balance >= 0),
  reserved_balance numeric(18,2) not null default 0 check (reserved_balance >= 0),
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  category text not null,
  source text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency char(3) not null default 'TZS',
  status public.wallet_tx_status not null default 'pending',
  customer_id uuid references public.customers(id),
  loan_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.wallet_transactions(id) on delete restrict,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  entry_type text not null check (entry_type in ('debit','credit')),
  amount numeric(18,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(transaction_id, wallet_id, entry_type)
);

create table public.external_channels (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  channel_type text not null check (channel_type in ('bank','mobile_money')),
  provider text not null,
  external_account_ref text not null,
  verified boolean not null default false,
  status public.record_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.business_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  transaction_date date not null,
  category text not null,
  counterparty text,
  amount numeric(18,2) not null check (amount > 0),
  direction text not null check (direction in ('income','expense')),
  source text not null,
  source_reference text,
  verification_status text not null default 'verified',
  evidence_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.finance_products (
  id uuid primary key default gen_random_uuid(),
  fi_id uuid not null references public.financial_institutions(id) on delete cascade,
  name text not null,
  annual_rate numeric(8,4) not null check (annual_rate >= 0),
  processing_fee_pct numeric(8,4) not null default 0,
  fixed_fee numeric(18,2) not null default 0,
  min_amount numeric(18,2) not null,
  max_amount numeric(18,2) not null,
  tenor_months int not null check (tenor_months > 0),
  repayment_frequency text not null default 'monthly',
  supplier_direct_default boolean not null default true,
  customer_wallet_exception_allowed boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  fi_id uuid not null references public.financial_institutions(id),
  product_id uuid references public.finance_products(id),
  supplier_id uuid references public.suppliers(id),
  purpose text not null,
  requested_amount numeric(18,2) not null,
  approved_amount numeric(18,2),
  annual_rate numeric(8,4),
  processing_fee numeric(18,2) not null default 0,
  total_interest numeric(18,2) not null default 0,
  total_repayment numeric(18,2) not null default 0,
  outstanding_principal numeric(18,2) not null default 0,
  tenor_months int,
  status text not null default 'submitted',
  disbursement_route text not null default 'supplier' check (disbursement_route in ('supplier','customer')),
  customer_route_exception_approved boolean not null default false,
  standing_instruction boolean not null default true,
  collection_service boolean not null default false,
  accepted_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions add constraint wallet_transactions_loan_fk foreign key (loan_id) references public.loans(id);

create table public.repayment_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_no int not null,
  due_date date not null,
  opening_principal numeric(18,2) not null,
  principal_due numeric(18,2) not null,
  interest_due numeric(18,2) not null,
  fee_due numeric(18,2) not null default 0,
  amount_due numeric(18,2) not null,
  amount_paid numeric(18,2) not null default 0,
  status text not null default 'upcoming',
  unique(loan_id, installment_no)
);

create table public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  supplier_id uuid not null references public.suppliers(id),
  loan_id uuid references public.loans(id),
  description text not null,
  item_type text not null default 'asset_equipment' check (item_type in ('asset_equipment','inventory_stock')),
  amount numeric(18,2) not null,
  valid_until date,
  status text not null default 'issued',
  document_path text,
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.supplier_quotes(id),
  customer_id uuid not null references public.customers(id),
  supplier_id uuid not null references public.suppliers(id),
  loan_id uuid references public.loans(id),
  item_type text not null default 'asset_equipment' check (item_type in ('asset_equipment','inventory_stock')),
  amount numeric(18,2) not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id),
  customer_id uuid not null references public.customers(id),
  supplier_id uuid not null references public.suppliers(id),
  loan_id uuid references public.loans(id),
  item_type text not null default 'asset_equipment' check (item_type in ('asset_equipment','inventory_stock')),
  amount numeric(18,2) not null,
  payment_status text not null default 'issued',
  delivery_status text not null default 'pending',
  invoice_path text,
  issued_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.fi_access_grants (
  id uuid primary key default gen_random_uuid(),
  fi_id uuid not null references public.financial_institutions(id),
  customer_id uuid not null references public.customers(id),
  consent_id uuid references public.consents(id),
  fee_transaction_id uuid references public.wallet_transactions(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  fee_code text unique not null,
  description text not null,
  fixed_amount numeric(18,2) not null default 0,
  percentage numeric(8,4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  user_id uuid references auth.users(id),
  severity text not null default 'info',
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id),
  action text not null,
  subject_type text,
  subject_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helper security functions
create or replace function public.current_org_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.memberships where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_tfl_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = auth.uid() and m.status='active' and o.entity_type='tfl'
      and m.role in ('tfl_admin','tfl_officer')
  );
$$;

-- Atomic wallet transfer. In production call this only from trusted server/Edge Function or tightly controlled RPC permissions.
create or replace function public.post_wallet_transfer(
  p_from_wallet uuid,
  p_to_wallet uuid,
  p_amount numeric,
  p_category text,
  p_reference text,
  p_source text default 'TijaPass wallet',
  p_customer uuid default null,
  p_loan uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx uuid;
  v_from public.wallets%rowtype;
  v_to public.wallets%rowtype;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_from_wallet = p_to_wallet then raise exception 'Source and destination wallets must differ'; end if;

  select * into v_from from public.wallets where id=p_from_wallet for update;
  select * into v_to from public.wallets where id=p_to_wallet for update;
  if v_from.id is null or v_to.id is null then raise exception 'Wallet not found'; end if;
  if v_from.status <> 'active' or v_to.status <> 'active' then raise exception 'Wallet is not active'; end if;
  if (v_from.available_balance - v_from.reserved_balance) < p_amount then raise exception 'Insufficient available balance'; end if;

  insert into public.wallet_transactions(reference,category,source,amount,status,customer_id,loan_id,metadata,created_by,completed_at)
  values(p_reference,p_category,p_source,p_amount,'completed',p_customer,p_loan,p_metadata,auth.uid(),now()) returning id into v_tx;

  insert into public.wallet_entries(transaction_id,wallet_id,entry_type,amount) values
    (v_tx,p_from_wallet,'debit',p_amount),
    (v_tx,p_to_wallet,'credit',p_amount);

  update public.wallets set available_balance=available_balance-p_amount, version=version+1, updated_at=now() where id=p_from_wallet;
  update public.wallets set available_balance=available_balance+p_amount, version=version+1, updated_at=now() where id=p_to_wallet;

  insert into public.audit_logs(actor_user_id,action,subject_type,subject_id,payload)
  values(auth.uid(),'wallet_transfer_completed','wallet_transaction',v_tx::text,jsonb_build_object('from',p_from_wallet,'to',p_to_wallet,'amount',p_amount,'reference',p_reference));
  return v_tx;
end;
$$;

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;
alter table public.financial_institutions enable row level security;
alter table public.suppliers enable row level security;
alter table public.consents enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.external_channels enable row level security;
alter table public.business_transactions enable row level security;
alter table public.finance_products enable row level security;
alter table public.loans enable row level security;
alter table public.repayment_schedule enable row level security;
alter table public.supplier_quotes enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.fi_access_grants enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Baseline policies. Extend these during implementation for field-level/data-scope rules.
create policy "profiles-own" on public.profiles for select using (user_id=auth.uid() or public.is_tfl_user());
create policy "memberships-own-or-tfl" on public.memberships for select using (user_id=auth.uid() or public.is_tfl_user());
create policy "organizations-member-or-tfl" on public.organizations for select using (id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "customers-own-or-tfl" on public.customers for select using (organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "wallets-own-or-tfl" on public.wallets for select using (organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "channels-own-or-tfl" on public.external_channels for select using (wallet_id in (select id from public.wallets where organization_id in (select public.current_org_ids())) or public.is_tfl_user());
create policy "business-tx-own-or-tfl" on public.business_transactions for select using (customer_id in (select id from public.customers where organization_id in (select public.current_org_ids())) or public.is_tfl_user());
create policy "products-authenticated" on public.finance_products for select to authenticated using (status='active' or public.is_tfl_user());
create policy "notifications-own-or-org" on public.notifications for select using (user_id=auth.uid() or organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "audit-tfl" on public.audit_logs for select using (public.is_tfl_user());

-- Do not grant direct UPDATE on wallet balances to client roles.
revoke update (available_balance,reserved_balance,version) on public.wallets from authenticated;

-- Additional ownership helpers and read policies.
create or replace function public.current_customer_ids()
returns setof uuid language sql stable security definer set search_path=public as $$
  select c.id from public.customers c
  where c.organization_id in (select public.current_org_ids());
$$;
create or replace function public.current_fi_ids()
returns setof uuid language sql stable security definer set search_path=public as $$
  select f.id from public.financial_institutions f
  where f.organization_id in (select public.current_org_ids());
$$;
create or replace function public.current_supplier_ids()
returns setof uuid language sql stable security definer set search_path=public as $$
  select s.id from public.suppliers s
  where s.organization_id in (select public.current_org_ids());
$$;

create policy "fi-own-or-tfl" on public.financial_institutions for select using (organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "supplier-own-or-tfl" on public.suppliers for select using (organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "consent-customer-or-tfl" on public.consents for select using (customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "loan-parties-or-tfl" on public.loans for select using (
  customer_id in (select public.current_customer_ids())
  or fi_id in (select public.current_fi_ids())
  or supplier_id in (select public.current_supplier_ids())
  or public.is_tfl_user()
);
create policy "schedule-via-loan" on public.repayment_schedule for select using (
  loan_id in (select id from public.loans where customer_id in (select public.current_customer_ids()) or fi_id in (select public.current_fi_ids()) or public.is_tfl_user())
);
create policy "quote-parties-or-tfl" on public.supplier_quotes for select using (customer_id in (select public.current_customer_ids()) or supplier_id in (select public.current_supplier_ids()) or public.is_tfl_user());
create policy "order-parties-or-tfl" on public.purchase_orders for select using (customer_id in (select public.current_customer_ids()) or supplier_id in (select public.current_supplier_ids()) or public.is_tfl_user());
create policy "invoice-parties-or-tfl" on public.supplier_invoices for select using (customer_id in (select public.current_customer_ids()) or supplier_id in (select public.current_supplier_ids()) or public.is_tfl_user());
create policy "access-grant-parties-or-tfl" on public.fi_access_grants for select using (fi_id in (select public.current_fi_ids()) or customer_id in (select public.current_customer_ids()) or public.is_tfl_user());
create policy "wallet-tx-via-entry" on public.wallet_transactions for select using (
  id in (select e.transaction_id from public.wallet_entries e join public.wallets w on w.id=e.wallet_id where w.organization_id in (select public.current_org_ids()))
  or public.is_tfl_user()
);
create policy "wallet-entry-own-or-tfl" on public.wallet_entries for select using (
  wallet_id in (select id from public.wallets where organization_id in (select public.current_org_ids()))
  or public.is_tfl_user()
);

-- Critical: clients must not call the balance-changing RPC directly.
revoke all on function public.post_wallet_transfer(uuid,uuid,numeric,text,text,text,uuid,uuid,jsonb) from public;
revoke all on function public.post_wallet_transfer(uuid,uuid,numeric,text,text,text,uuid,uuid,jsonb) from anon;
revoke all on function public.post_wallet_transfer(uuid,uuid,numeric,text,text,text,uuid,uuid,jsonb) from authenticated;
grant execute on function public.post_wallet_transfer(uuid,uuid,numeric,text,text,text,uuid,uuid,jsonb) to service_role;
