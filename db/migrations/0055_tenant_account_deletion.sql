-- Tenant account deletion: soft-delete grace period + tombstone hashes.
-- Identity lifecycle is separate from landlord lease/payment records.

alter table tenants
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'pending_deletion', 'deleted')),
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists email_hash text,
  add column if not exists phone_hash text,
  add column if not exists deletion_reminder_sent_at timestamptz;

create index if not exists idx_tenants_pending_deletion
  on tenants (deletion_requested_at)
  where account_status = 'pending_deletion';

create index if not exists idx_tenants_email_hash
  on tenants (email_hash)
  where email_hash is not null;

create index if not exists idx_tenants_phone_hash
  on tenants (phone_hash)
  where phone_hash is not null;
