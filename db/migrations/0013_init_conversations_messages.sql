-- Slice: Messaging (manager <-> tenant)
-- One conversation per tenant+unit within an organization.

create table conversations (
  id                    text primary key,
  organization_id       text not null references organizations(id) on delete cascade,
  tenant_id             text not null references tenants(id) on delete cascade,
  unit_id               text not null references units(id) on delete cascade,
  lease_id              text references leases(id) on delete set null,
  manager_last_read_at  timestamptz,
  updated_at            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (organization_id, tenant_id, unit_id)
);

create index idx_conversations_org_updated
  on conversations (organization_id, updated_at desc);

create index idx_conversations_org_property_lookup
  on conversations (organization_id, unit_id);

create table messages (
  id               text primary key,
  organization_id  text not null references organizations(id) on delete cascade,
  conversation_id  text not null references conversations(id) on delete cascade,
  sender_side      text not null check (sender_side in ('tenant', 'manager')),
  sender_user_id   text,
  body             text not null check (length(trim(body)) > 0),
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation_created
  on messages (conversation_id, created_at asc);

create index idx_messages_unread_lookup
  on messages (conversation_id, sender_side, created_at desc);
