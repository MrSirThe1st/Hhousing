alter table leases
  add column move_in_mode text not null default 'standard'
    check (move_in_mode in ('standard', 'existing_tenant')),
  add column deposit_settled_externally boolean not null default false,
  add column deposit_settled_note text;

create index idx_leases_move_in_mode on leases(move_in_mode);
