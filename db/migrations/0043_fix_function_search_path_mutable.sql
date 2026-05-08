-- Fix mutable search_path warnings by pinning function resolution to public schema.
-- No logic changes; function bodies are preserved.

create or replace function public.validate_member_function_org()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if not exists (
    select 1 from organization_memberships om
    where om.id = new.member_id and om.organization_id = new.organization_id
  ) then
    raise exception 'member_id must belong to the specified organization';
  end if;

  if not exists (
    select 1 from team_functions tf
    where tf.id = new.function_id and tf.organization_id = new.organization_id
  ) then
    raise exception 'function_id must belong to the specified organization';
  end if;

  return new;
end;
$function$;

create or replace function public.enforce_single_unit_property_capacity()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  target_property_type text;
  existing_unit_id text;
begin
  select property_type
  into target_property_type
  from properties
  where id = new.property_id;

  if target_property_type = 'single_unit' then
    select id
    into existing_unit_id
    from units
    where property_id = new.property_id
      and id <> new.id
    limit 1;

    if existing_unit_id is not null then
      raise exception 'SINGLE_UNIT_PROPERTY_ALREADY_HAS_UNIT'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.validate_finance_ledger_entry()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  category_policy finance_ledger_categories%rowtype;
begin
  select *
  into category_policy
  from finance_ledger_categories
  where category_code = new.category_code
    and active = true;

  if not found then
    raise exception 'finance ledger category % is not active or does not exist', new.category_code;
  end if;

  if not (new.entry_type = any(category_policy.allowed_entry_types)) then
    raise exception 'entry_type % is not allowed for category %', new.entry_type, new.category_code;
  end if;

  if not (new.account_code = any(category_policy.allowed_account_codes)) then
    raise exception 'account_code % is not allowed for category %', new.account_code, new.category_code;
  end if;

  if category_policy.is_deposit_category and (new.entry_type <> 'liability_movement' or new.account_code <> 'deposit_liability') then
    raise exception 'deposit categories must post only as liability_movement to deposit_liability';
  end if;

  if new.entry_type = 'charge' then
    new.direction := 'debit';
  elsif new.entry_type = 'payment' then
    new.direction := 'credit';
  elsif category_policy.direction_policy = 'debit' then
    new.direction := 'debit';
  elsif category_policy.direction_policy = 'credit' then
    new.direction := 'credit';
  elsif category_policy.direction_policy = 'caller_supplied' then
    if not category_policy.allow_manual_direction then
      raise exception 'manual direction is not allowed for category %', new.category_code;
    end if;

    if new.direction not in ('debit', 'credit') then
      raise exception 'direction must be supplied for category %', new.category_code;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.validate_move_out_child_org()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if not exists (
    select 1
    from move_outs mo
    where mo.id = new.move_out_id
      and mo.organization_id = new.organization_id
  ) then
    raise exception 'move_out child record must use the same organization_id as its move_out parent';
  end if;

  return new;
end;
$function$;

create or replace function public.validate_move_out_snapshot_immutability()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if old.status = 'closed' and (
    new.organization_id is distinct from old.organization_id
    or new.lease_id is distinct from old.lease_id
    or new.move_out_date is distinct from old.move_out_date
    or new.reason is distinct from old.reason
    or new.status is distinct from old.status
    or new.closure_ledger_event_id is distinct from old.closure_ledger_event_id
    or new.finalized_statement_snapshot is distinct from old.finalized_statement_snapshot
    or new.finalized_statement_hash is distinct from old.finalized_statement_hash
    or new.confirmed_at is distinct from old.confirmed_at
    or new.closed_at is distinct from old.closed_at
  ) then
    raise exception 'closed move_out snapshots are immutable; reopen via a dedicated workflow instead';
  end if;

  return new;
end;
$function$;
