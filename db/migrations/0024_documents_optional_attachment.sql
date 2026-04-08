alter table documents
  alter column attachment_type drop not null,
  alter column attachment_id drop not null,
  drop constraint if exists documents_attachment_type_check,
  add constraint documents_attachment_type_check check (
    attachment_type in ('property','unit','tenant','lease') or attachment_type is null
  ),
  add constraint documents_attachment_pair_check check (
    (attachment_type is null and attachment_id is null)
    or (attachment_type is not null and attachment_id is not null)
  );

drop index if exists idx_documents_attachment;
create index idx_documents_attachment on documents(attachment_type, attachment_id) where attachment_type is not null and attachment_id is not null;