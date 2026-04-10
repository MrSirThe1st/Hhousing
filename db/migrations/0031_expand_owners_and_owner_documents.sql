alter table owners
  add column if not exists full_name text,
  add column if not exists address text,
  add column if not exists is_company boolean not null default false,
  add column if not exists company_name text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists phone_number text,
  add column if not exists profile_picture_url text;

update owners
set full_name = coalesce(nullif(trim(full_name), ''), name)
where full_name is null
   or char_length(trim(full_name)) = 0;

alter table owners
  alter column full_name set not null;

alter table owners
  drop constraint if exists owners_full_name_not_blank,
  add constraint owners_full_name_not_blank check (char_length(trim(full_name)) > 0),
  drop constraint if exists owners_company_name_required,
  add constraint owners_company_name_required check (
    is_company = false
    or (company_name is not null and char_length(trim(company_name)) > 0)
  );

update owners
set company_name = name
where owner_type = 'organization'
  and (company_name is null or char_length(trim(company_name)) = 0);

alter table documents
  drop constraint if exists documents_attachment_type_check,
  add constraint documents_attachment_type_check check (
    attachment_type in ('property', 'unit', 'tenant', 'lease', 'owner') or attachment_type is null
  );

create index if not exists idx_documents_owner_attachment
  on documents (organization_id, attachment_id)
  where attachment_type = 'owner' and attachment_id is not null;