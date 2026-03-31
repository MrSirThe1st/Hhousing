-- Slice 3: Maintenance workflow depth
-- Adds assignee and note fields plus explicit timeline events.

alter table maintenance_requests
  add column assigned_to_name text,
  add column internal_notes text,
  add column resolution_notes text,
  add column updated_at timestamptz not null default now();

create table maintenance_request_events (
  id                     text primary key,
  organization_id        text not null references organizations(id),
  maintenance_request_id text not null references maintenance_requests(id) on delete cascade,
  event_type             text not null
                         check (event_type in (
                           'created',
                           'status_changed',
                           'assigned',
                           'internal_note_updated',
                           'resolution_note_updated'
                         )),
  status_from            text,
  status_to              text,
  assigned_to_name       text,
  note                   text,
  created_at             timestamptz not null default now()
);

create index idx_maintenance_events_org_id
  on maintenance_request_events(organization_id);

create index idx_maintenance_events_request_id
  on maintenance_request_events(maintenance_request_id, created_at asc);
