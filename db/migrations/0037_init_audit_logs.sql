create table if not exists audit_logs (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  actor_member_id text references organization_memberships(id) on delete set null,
  action_key text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_org_created_at
  on audit_logs (organization_id, created_at desc);

create index if not exists idx_audit_logs_org_action_created_at
  on audit_logs (organization_id, action_key, created_at desc);

create index if not exists idx_audit_logs_actor_member_created_at
  on audit_logs (actor_member_id, created_at desc);