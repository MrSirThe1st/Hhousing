create table team_member_invitations (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('property_manager')),
  can_own_properties boolean not null default false,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by_user_id text not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_team_member_invitations_org on team_member_invitations(organization_id);
create index idx_team_member_invitations_email on team_member_invitations(organization_id, lower(email));
create index idx_team_member_invitations_active on team_member_invitations(organization_id, revoked_at, used_at, expires_at);