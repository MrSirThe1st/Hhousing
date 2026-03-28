create table if not exists listing_intents (
  id text primary key,
  title text not null,
  purpose text not null check (purpose in ('rent', 'sale')),
  price_usd integer not null check (price_usd > 0),
  location text not null,
  status text not null check (status in ('draft')),
  created_by_user_id text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists listing_intents_created_by_user_id_idx
  on listing_intents (created_by_user_id);

create index if not exists listing_intents_created_at_idx
  on listing_intents (created_at desc);
