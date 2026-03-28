alter table listing_intents
  drop constraint if exists listing_intents_status_check;

alter table listing_intents
  add constraint listing_intents_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected'));

create index if not exists listing_intents_status_idx
  on listing_intents (status);
