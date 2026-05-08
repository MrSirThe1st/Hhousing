-- Phase 1: support + invite/access tables
-- Safe first wave with lower operational blast radius.

alter table if exists public.audit_logs enable row level security;
alter table if exists public.email_templates enable row level security;
alter table if exists public.invoice_email_jobs enable row level security;
alter table if exists public.maintenance_request_events enable row level security;
alter table if exists public.team_functions enable row level security;
alter table if exists public.member_functions enable row level security;
alter table if exists public.tenant_invitations enable row level security;
alter table if exists public.team_member_invitations enable row level security;
alter table if exists public.owner_invitations enable row level security;
alter table if exists public.owner_portal_accesses enable row level security;
