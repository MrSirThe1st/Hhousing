create table if not exists organization_memberships (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('tenant', 'landlord', 'property_manager', 'platform_admin')),
  status text not null default 'active' check (status in ('active', 'invited', 'inactive')),
  can_own_properties boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_organization_memberships_user_status
  on organization_memberships (user_id, status, created_at desc);

create index if not exists idx_organization_memberships_org_role
  on organization_memberships (organization_id, role, created_at desc);