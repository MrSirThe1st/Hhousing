create table owner_portal_accesses (
  id text primary key,
  owner_id text not null references owners(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  invited_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_id, user_id)
);

create index idx_owner_portal_accesses_user on owner_portal_accesses (user_id, status);
create index idx_owner_portal_accesses_owner on owner_portal_accesses (organization_id, owner_id, status);

create table owner_invitations (
  id text primary key,
  owner_id text not null references owners(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_owner_invitations_owner on owner_invitations (organization_id, owner_id, created_at desc);
create index idx_owner_invitations_email on owner_invitations (organization_id, lower(email));
