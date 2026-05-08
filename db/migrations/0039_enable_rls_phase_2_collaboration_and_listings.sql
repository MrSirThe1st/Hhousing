-- Phase 2: collaboration/content + listing workflow tables

alter table if exists public.conversations enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.calendar_events enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.listing_applications enable row level security;
