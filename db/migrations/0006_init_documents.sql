-- Slice 5: Documents
-- Files attached to properties, units, tenants, or leases
-- Stored in Supabase Storage with metadata tracked here

create table documents (
  id              text        primary key,
  organization_id text        not null references organizations(id),
  file_name       text        not null,
  file_url        text        not null,
  file_size       bigint      not null,
  mime_type       text        not null,
  document_type   text        not null
                              check (document_type in ('lease_agreement','receipt','notice','id','contract','other')),
  attachment_type text        not null
                              check (attachment_type in ('property','unit','tenant','lease')),
  attachment_id   text        not null,
  uploaded_by     text        not null,
  created_at      timestamptz not null default now()
);

create index idx_documents_organization_id on documents(organization_id);
create index idx_documents_attachment      on documents(attachment_type, attachment_id);
create index idx_documents_document_type   on documents(document_type);
