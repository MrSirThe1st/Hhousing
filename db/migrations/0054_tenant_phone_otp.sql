-- Phone-normalized identity for WhatsApp/app login + OTP codes

alter table tenants
  add column if not exists phone_normalized text;

create index if not exists idx_tenants_phone_normalized
  on tenants(phone_normalized)
  where phone_normalized is not null;

-- Best-effort backfill for DRC-style numbers already stored on tenants
update tenants
set phone_normalized = case
  when regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g') ~ '^243[0-9]{8,12}$'
    then regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g')
  when regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g') ~ '^0[0-9]{8,10}$'
    then '243' || substr(regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g'), 2)
  when length(regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g')) = 9
    then '243' || regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g')
  when length(regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g')) between 10 and 15
    then regexp_replace(coalesce(whatsapp_number, phone, ''), '\D', '', 'g')
  else null
end
where phone_normalized is null
  and coalesce(whatsapp_number, phone) is not null;

create table tenant_login_otps (
  id                 text        primary key,
  organization_id    text        not null references organizations(id),
  tenant_id          text        not null references tenants(id),
  phone_normalized   text        not null,
  code_hash          text        not null,
  expires_at         timestamptz not null,
  consumed_at        timestamptz,
  attempt_count      integer     not null default 0,
  created_at         timestamptz not null default now(),
  constraint tenant_login_otps_attempt_count_check check (attempt_count >= 0)
);

create index idx_tenant_login_otps_phone_created
  on tenant_login_otps(phone_normalized, created_at desc);

create index idx_tenant_login_otps_tenant_id
  on tenant_login_otps(tenant_id);

alter table if exists public.tenant_login_otps enable row level security;

drop policy if exists "deny_all_tenant_login_otps" on public.tenant_login_otps;
create policy "deny_all_tenant_login_otps" on public.tenant_login_otps
  as restrictive for all to public
  using (false)
  with check (false);
