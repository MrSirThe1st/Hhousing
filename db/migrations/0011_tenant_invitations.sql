create table tenant_invitations (
  id                text primary key,
  tenant_id         text not null references tenants(id) on delete cascade,
  organization_id   text not null references organizations(id) on delete cascade,
  email             text not null,
  token_hash        text not null unique,
  expires_at        timestamptz not null,
  used_at           timestamptz,
  revoked_at        timestamptz,
  created_by_user_id text not null,
  created_at        timestamptz not null default now(),
  constraint tenant_invitations_email_not_blank check (length(trim(email)) > 0),
  constraint tenant_invitations_expiry_after_creation check (expires_at > created_at)
);

create index idx_tenant_invitations_tenant_id on tenant_invitations(tenant_id);
create index idx_tenant_invitations_org_id on tenant_invitations(organization_id);
create index idx_tenant_invitations_token_hash on tenant_invitations(token_hash);

create unique index idx_tenant_invitations_one_active_per_tenant
  on tenant_invitations(tenant_id)
  where used_at is null and revoked_at is null;