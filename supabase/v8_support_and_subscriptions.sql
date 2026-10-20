-- TijaPass V8 developer reference migration, NOT run by the browser demonstration.
-- Requires schema.sql and reviewed role membership policies first.
-- Review, test and adapt for production before executing in a real user project.

create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_by uuid not null references auth.users(id),
 topic text not null,
 description text not null check (length(description) between 10 and 1200),
 status text not null default 'open' check (status in ('open','awaiting_tfl','awaiting_customer','resolved')),
 assigned_to uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists support_tickets_org_idx on public.support_tickets(organization_id,created_at desc);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 message text not null check (length(trim(message)) between 1 and 1200),
 created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id,created_at);
create table if not exists public.subscription_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 created_by uuid not null references auth.users(id),
 plan_code text not null check(plan_code in ('weekly','plus','pro','day')),
 displayed_price_tzs integer not null check(displayed_price_tzs >= 0),
 status text not null default 'requested' check(status in ('requested','reviewing','cancelled','fulfilled')),
 created_at timestamptz not null default now(),
 handled_by uuid references auth.users(id)
);
create index if not exists subscription_requests_org_idx on public.subscription_requests(organization_id,created_at desc);
create table if not exists public.support_contacts (
 id integer primary key default 1 check(id=1),
 whatsapp text,
 telephone text,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.subscription_requests enable row level security;
alter table public.support_contacts enable row level security;

create policy "support_tickets_read" on public.support_tickets for select to authenticated
 using (organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "support_tickets_new" on public.support_tickets for insert to authenticated
 with check (created_by=auth.uid() and organization_id in (select public.current_org_ids()));
create policy "support_tickets_tfl_update" on public.support_tickets for update to authenticated
 using (public.is_tfl_user()) with check (public.is_tfl_user());

create policy "support_messages_read" on public.support_messages for select to authenticated
 using (exists(select 1 from public.support_tickets t where t.id=ticket_id
 and (t.organization_id in (select public.current_org_ids()) or public.is_tfl_user())));
create policy "support_messages_new" on public.support_messages for insert to authenticated
 with check (author_id=auth.uid() and exists(select 1 from public.support_tickets t
 where t.id=ticket_id and (t.organization_id in (select public.current_org_ids()) or public.is_tfl_user())));

create policy "subscription_requests_read" on public.subscription_requests for select to authenticated
 using(organization_id in (select public.current_org_ids()) or public.is_tfl_user());
create policy "subscription_requests_new" on public.subscription_requests for insert to authenticated
 with check(created_by=auth.uid() and organization_id in (select public.current_org_ids()));
create policy "subscription_requests_tfl_update" on public.subscription_requests for update to authenticated
 using(public.is_tfl_user()) with check(public.is_tfl_user());

create policy "support_contacts_read" on public.support_contacts for select to authenticated using (true);
create policy "support_contacts_tfl_write" on public.support_contacts for all to authenticated
 using(public.is_tfl_user()) with check(public.is_tfl_user());

-- Backend requirements: spam/rate limits; server-only billing and payment webhooks;
-- identity/role access checks; staff assignment; support SLA/ticket audit; retention/privacy;
-- customer consent for AI processing; masked PII; human approval for financial changes.
-- Do not use website role picker for authorization or expose secrets in the Vite client.
