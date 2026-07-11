-- WhatsApp tenant contact fields and outbound message tracking

alter table tenants
  add column whatsapp_number text,
  add column whatsapp_opt_in boolean not null default false;

create table whatsapp_messages (
  id                  text          primary key,
  organization_id     text          not null references organizations(id),
  tenant_id           text          references tenants(id),
  template_name       text          not null,
  phone_number        text          not null,
  status              text          not null default 'pending'
                      check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_message_id text,
  error_message       text,
  metadata            jsonb,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

create index idx_whatsapp_messages_organization_id on whatsapp_messages(organization_id);
create index idx_whatsapp_messages_tenant_id on whatsapp_messages(tenant_id);
create index idx_whatsapp_messages_status on whatsapp_messages(status);
create index idx_whatsapp_messages_created_at on whatsapp_messages(created_at desc);
create index idx_whatsapp_messages_external_message_id on whatsapp_messages(external_message_id)
  where external_message_id is not null;

alter table if exists public.whatsapp_messages enable row level security;

drop policy if exists "deny_all_whatsapp_messages" on public.whatsapp_messages;
create policy "deny_all_whatsapp_messages" on public.whatsapp_messages
  as restrictive for all to public
  using (false)
  with check (false);
