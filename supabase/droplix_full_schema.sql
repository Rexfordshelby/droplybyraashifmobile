-- Droplix full Supabase schema
-- Run this once in the Supabase SQL editor for a fresh project.
--
-- IMPORTANT: hosted Supabase Auth settings are not controlled by SQL.
-- To make "Continue as Guest" work, enable this in the dashboard:
-- Authentication -> Sign In / Providers -> Anonymous sign-ins -> ON.
--
-- After running it, add one admin row manually:
-- insert into public.user_roles (user_id, role) values ('YOUR_AUTH_USER_ID', 'admin') on conflict do nothing;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'rider', 'sender');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending', 'accepted', 'picked', 'in_transit', 'delivered', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'rider_status') then
    create type public.rider_status as enum ('pending', 'approved', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_type') then
    create type public.vehicle_type as enum ('bike', 'scooter', 'car', 'bicycle');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  is_guest boolean default false,
  guest_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'sender',
  created_at timestamptz default now(),
  unique (user_id, role)
);

create table if not exists public.user_promos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_deliveries_remaining integer not null default 2 check (free_deliveries_remaining >= 0),
  total_free_used integer not null default 0 check (total_free_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  vehicle_photo_url text,
  license_photo_url text,
  status public.rider_status default 'approved',
  is_online boolean default false,
  current_latitude numeric,
  current_longitude numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  base_price numeric not null default 30 check (base_price >= 0),
  price_per_km numeric not null default 8 check (price_per_km >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (name, city)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  rider_id uuid references public.riders(id) on delete set null,
  pickup_address text not null,
  pickup_landmark text,
  drop_address text not null,
  drop_landmark text,
  item_description text not null,
  item_photo_url text,
  sender_phone text not null,
  receiver_phone text,
  price_offered numeric not null check (price_offered >= 0),
  suggested_price numeric check (suggested_price is null or suggested_price >= 0),
  distance_km numeric check (distance_km is null or distance_km >= 0),
  status public.order_status default 'pending',
  payment_method text default 'cash',
  delivery_proof_url text,
  delivery_otp text default lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
  delivery_otp_failed_count integer not null default 0,
  delivery_otp_locked_until timestamptz,
  picked_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  is_promo_free boolean not null default false,
  platform_paid_amount numeric not null default 0 check (platform_paid_amount >= 0),
  sender_paid_amount numeric not null default 0 check (sender_paid_amount >= 0),
  tracking_code text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tracking_code)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'order_update',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  token_hash text not null unique,
  token_type text not null check (token_type in ('pickup', 'delivery', 'receipt')),
  assigned_rider_id uuid references public.riders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  used_rider_id uuid references public.riders(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_guest boolean default false;
alter table public.profiles add column if not exists guest_expires_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.user_roles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_roles add column if not exists role public.app_role default 'sender';
alter table public.user_roles add column if not exists created_at timestamptz default now();

alter table public.user_promos add column if not exists free_deliveries_remaining integer default 2;
alter table public.user_promos add column if not exists total_free_used integer default 0;
alter table public.user_promos add column if not exists created_at timestamptz default now();
alter table public.user_promos add column if not exists updated_at timestamptz default now();

alter table public.riders add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.riders add column if not exists vehicle_type public.vehicle_type default 'bike';
alter table public.riders add column if not exists vehicle_photo_url text;
alter table public.riders add column if not exists license_photo_url text;
alter table public.riders add column if not exists status public.rider_status default 'approved';
alter table public.riders add column if not exists is_online boolean default false;
alter table public.riders add column if not exists current_latitude numeric;
alter table public.riders add column if not exists current_longitude numeric;
alter table public.riders add column if not exists created_at timestamptz default now();
alter table public.riders add column if not exists updated_at timestamptz default now();

alter table public.service_zones add column if not exists name text;
alter table public.service_zones add column if not exists city text;
alter table public.service_zones add column if not exists base_price numeric default 30;
alter table public.service_zones add column if not exists price_per_km numeric default 8;
alter table public.service_zones add column if not exists is_active boolean default true;
alter table public.service_zones add column if not exists created_at timestamptz default now();

alter table public.orders add column if not exists sender_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists rider_id uuid references public.riders(id) on delete set null;
alter table public.orders add column if not exists pickup_address text;
alter table public.orders add column if not exists pickup_landmark text;
alter table public.orders add column if not exists drop_address text;
alter table public.orders add column if not exists drop_landmark text;
alter table public.orders add column if not exists item_description text;
alter table public.orders add column if not exists item_photo_url text;
alter table public.orders add column if not exists sender_phone text;
alter table public.orders add column if not exists receiver_phone text;
alter table public.orders add column if not exists price_offered numeric default 0;
alter table public.orders add column if not exists suggested_price numeric;
alter table public.orders add column if not exists distance_km numeric;
alter table public.orders add column if not exists status public.order_status default 'pending';
alter table public.orders add column if not exists payment_method text default 'cash';
alter table public.orders add column if not exists delivery_proof_url text;
alter table public.orders add column if not exists delivery_otp text;
alter table public.orders add column if not exists delivery_otp_failed_count integer not null default 0;
alter table public.orders add column if not exists delivery_otp_locked_until timestamptz;
alter table public.orders add column if not exists picked_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists cancellation_reason text;
alter table public.orders add column if not exists is_promo_free boolean default false;
alter table public.orders add column if not exists platform_paid_amount numeric default 0;
alter table public.orders add column if not exists sender_paid_amount numeric default 0;
alter table public.orders add column if not exists tracking_code text default '';
alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();

alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists type text default 'order_update';
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists created_at timestamptz default now();

alter table public.audit_logs add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.audit_logs add column if not exists action text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id uuid;
alter table public.audit_logs add column if not exists metadata jsonb default '{}'::jsonb;
alter table public.audit_logs add column if not exists created_at timestamptz default now();

alter table public.order_qr_tokens add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.order_qr_tokens add column if not exists token_hash text;
alter table public.order_qr_tokens add column if not exists token_type text;
alter table public.order_qr_tokens add column if not exists assigned_rider_id uuid references public.riders(id) on delete set null;
alter table public.order_qr_tokens add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.order_qr_tokens add column if not exists used_by uuid references auth.users(id) on delete set null;
alter table public.order_qr_tokens add column if not exists used_rider_id uuid references public.riders(id) on delete set null;
alter table public.order_qr_tokens add column if not exists expires_at timestamptz;
alter table public.order_qr_tokens add column if not exists used_at timestamptz;
alter table public.order_qr_tokens add column if not exists revoked_at timestamptz;
alter table public.order_qr_tokens add column if not exists created_at timestamptz default now();

alter table public.profiles alter column is_guest set default false;
alter table public.user_roles alter column role set default 'sender';
alter table public.user_promos alter column free_deliveries_remaining set default 2;
alter table public.user_promos alter column total_free_used set default 0;
alter table public.riders alter column status set default 'approved';
alter table public.riders alter column is_online set default false;
alter table public.orders alter column status set default 'pending';
alter table public.orders alter column payment_method set default 'cash';
alter table public.orders alter column delivery_otp set default lpad((floor(random() * 9000) + 1000)::text, 4, '0');
alter table public.orders alter column delivery_otp_failed_count set default 0;
alter table public.orders alter column is_promo_free set default false;
alter table public.orders alter column platform_paid_amount set default 0;
alter table public.orders alter column sender_paid_amount set default 0;
alter table public.orders alter column tracking_code set default '';
alter table public.notifications alter column type set default 'order_update';
alter table public.notifications alter column is_read set default false;

update public.orders
set delivery_otp = lpad((floor(random() * 9000) + 1000)::text, 4, '0')
where delivery_otp is null or btrim(delivery_otp) = '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_sender_phone_digits') then
    alter table public.orders
      add constraint orders_sender_phone_digits
      check (sender_phone ~ '^[0-9]{10}$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_receiver_phone_digits') then
    alter table public.orders
      add constraint orders_receiver_phone_digits
      check (receiver_phone is null or receiver_phone = '' or receiver_phone ~ '^[0-9]{10}$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_tracking_code_format') then
    alter table public.orders
      add constraint orders_tracking_code_format
      check (tracking_code = '' or tracking_code ~ '^[A-Z2-9]{8}$') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'riders_online_requires_approval') then
    alter table public.riders
      add constraint riders_online_requires_approval
      check (is_online = false or status = 'approved') not valid;
  end if;
end $$;

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_riders_user_id on public.riders(user_id);
create index if not exists idx_riders_status_online on public.riders(status, is_online);
create index if not exists idx_orders_sender_id on public.orders(sender_id);
create index if not exists idx_orders_rider_id on public.orders(rider_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_tracking_code on public.orders((upper(tracking_code)));
create index if not exists idx_notifications_user_id on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_order_qr_tokens_order_type on public.order_qr_tokens(order_id, token_type);
create index if not exists idx_order_qr_tokens_assigned_rider on public.order_qr_tokens(assigned_rider_id);
create index if not exists idx_order_qr_tokens_expires_at on public.order_qr_tokens(expires_at);

-- Repair uniqueness expected by ON CONFLICT clauses when rerunning after a partial setup.
delete from public.user_roles a
using public.user_roles b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.role = b.role;

delete from public.user_promos a
using public.user_promos b
where a.ctid < b.ctid
  and a.user_id = b.user_id;

delete from public.service_zones a
using public.service_zones b
where a.ctid < b.ctid
  and a.name = b.name
  and a.city = b.city;

create unique index if not exists uq_profiles_id on public.profiles(id);
create unique index if not exists uq_user_roles_user_id_role on public.user_roles(user_id, role);
create unique index if not exists uq_user_promos_user_id on public.user_promos(user_id);
create unique index if not exists uq_riders_user_id on public.riders(user_id);
create unique index if not exists uq_service_zones_name_city on public.service_zones(name, city);
create unique index if not exists uq_order_qr_tokens_hash on public.order_qr_tokens(token_hash);
create unique index if not exists uq_order_qr_tokens_active
on public.order_qr_tokens(order_id, token_type)
where used_at is null and revoked_at is null;

-- Policy/trigger helper functions must exist before any trigger or RLS policy references them.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where auth.uid() is not null
      and _user_id = auth.uid()
      and user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.current_rider_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.riders
  where user_id = auth.uid()
    and status = 'approved'
  limit 1;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists update_user_promos_updated_at on public.user_promos;
drop trigger if exists touch_user_promos_updated_at on public.user_promos;
create trigger touch_user_promos_updated_at before update on public.user_promos
for each row execute function public.touch_updated_at();

drop trigger if exists update_riders_updated_at on public.riders;
drop trigger if exists touch_riders_updated_at on public.riders;
create trigger touch_riders_updated_at before update on public.riders
for each row execute function public.touch_updated_at();

drop trigger if exists update_orders_updated_at on public.orders;
drop trigger if exists touch_orders_updated_at on public.orders;
create trigger touch_orders_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

create or replace function public.apply_order_defaults_and_flow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     and coalesce(new.status, 'pending') <> 'pending'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'New orders must start as pending';
  end if;

  if new.is_promo_free then
    new.sender_paid_amount = 0;
    new.platform_paid_amount = coalesce(nullif(new.platform_paid_amount, 0), new.price_offered);
  else
    new.platform_paid_amount = 0;
    new.sender_paid_amount = coalesce(nullif(new.sender_paid_amount, 0), new.price_offered);
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status in ('delivered', 'cancelled') then
      raise exception 'Cannot change a completed or cancelled order';
    end if;

    if new.status = 'accepted' and old.status <> 'pending' then
      raise exception 'Orders can only be accepted from pending';
    elsif new.status = 'accepted'
      and new.sender_id = auth.uid()
      and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Riders cannot accept their own orders';
    elsif new.status = 'accepted'
      and not public.has_role(auth.uid(), 'admin')
      and new.rider_id is distinct from public.current_rider_id() then
      raise exception 'Only the approved current rider can accept this order';
    elsif new.status = 'picked' and old.status <> 'accepted' then
      raise exception 'Orders can only be picked after acceptance';
    elsif new.status = 'picked'
      and not public.has_role(auth.uid(), 'admin')
      and current_setting('droplix.pickup_qr_verified_order_id', true) is distinct from new.id::text then
      raise exception 'Pickup QR verification required';
    elsif new.status = 'in_transit' and old.status <> 'picked' then
      raise exception 'Orders can only move in transit after pickup';
    elsif new.status = 'delivered' and old.status <> 'in_transit' then
      raise exception 'Orders can only be delivered after reaching the drop point';
    elsif new.status = 'delivered'
      and not public.has_role(auth.uid(), 'admin')
      and current_setting('droplix.delivery_verified_order_id', true) is distinct from new.id::text then
      raise exception 'Delivery OTP or QR verification required';
    elsif new.status = 'pending' then
      raise exception 'Orders cannot move backwards to pending';
    end if;
  end if;

  if new.status in ('accepted', 'picked', 'in_transit', 'delivered') and new.rider_id is null then
    raise exception 'Assigned orders require a rider';
  end if;

  if tg_op = 'UPDATE'
     and new.rider_id is distinct from old.rider_id
     and not public.has_role(auth.uid(), 'admin')
     and not (
       old.status = 'pending'
       and new.status = 'accepted'
       and new.rider_id = public.current_rider_id()
     ) then
    raise exception 'Only the accepting rider or an admin can assign riders';
  end if;

  if new.status = 'picked' and new.picked_at is null then
    new.picked_at = now();
  elsif new.status = 'delivered' and new.delivered_at is null then
    new.delivered_at = now();
  elsif new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists apply_order_defaults_and_flow on public.orders;
create trigger apply_order_defaults_and_flow before insert or update on public.orders
for each row execute function public.apply_order_defaults_and_flow();

create or replace function public.audit_order_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'order_created',
      'order',
      new.id,
      jsonb_build_object('status', new.status, 'tracking_code', new.tracking_code)
    );
  elsif tg_op = 'UPDATE' and (
    old.status is distinct from new.status
    or old.rider_id is distinct from new.rider_id
    or old.cancellation_reason is distinct from new.cancellation_reason
  ) then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'order_updated',
      'order',
      new.id,
      jsonb_build_object(
        'from_status', old.status,
        'to_status', new.status,
        'old_rider_id', old.rider_id,
        'new_rider_id', new.rider_id,
        'cancellation_reason', new.cancellation_reason,
        'tracking_code', new.tracking_code
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_order_changes on public.orders;
create trigger audit_order_changes after insert or update on public.orders
for each row execute function public.audit_order_changes();

create or replace function public.protect_rider_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can change rider approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_rider_status on public.riders;
create trigger protect_rider_status before update on public.riders
for each row execute function public.protect_rider_status();

create or replace function public.enforce_rider_operational_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'approved' then
    new.is_online = false;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_rider_operational_rules on public.riders;
create trigger enforce_rider_operational_rules before insert or update on public.riders
for each row execute function public.enforce_rider_operational_rules();

create or replace function public.grant_rider_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.user_id, 'rider')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists grant_rider_role on public.riders;
create trigger grant_rider_role after insert on public.riders
for each row execute function public.grant_rider_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_guest, guest_expires_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', case when new.email is null then 'Guest User' else 'User' end),
    new.email is null,
    case when new.email is null then now() + interval '24 hours' else null end
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'sender')
  on conflict (user_id, role) do nothing;

  insert into public.user_promos (user_id, free_deliveries_remaining)
  values (new.id, 2)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.generate_tracking_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    select string_agg(substr(chars, (floor(random() * length(chars)) + 1)::int, 1), '')
    into code
    from generate_series(1, 8);

    exit when not exists (
      select 1 from public.orders where tracking_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.set_tracking_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tracking_code is null or btrim(new.tracking_code) = '' then
    new.tracking_code = public.generate_tracking_code();
  else
    new.tracking_code = upper(new.tracking_code);
  end if;

  return new;
end;
$$;

drop trigger if exists set_tracking_code_trigger on public.orders;
drop trigger if exists set_orders_tracking_code on public.orders;
create trigger set_orders_tracking_code before insert on public.orders
for each row execute function public.set_tracking_code();

do $$
declare
  existing_order record;
begin
  for existing_order in
    select id
    from public.orders
    where tracking_code is null or btrim(tracking_code) = ''
  loop
    update public.orders
    set tracking_code = public.generate_tracking_code()
    where id = existing_order.id;
  end loop;
end $$;

create unique index if not exists uq_orders_tracking_code
on public.orders(tracking_code)
where tracking_code is not null and btrim(tracking_code) <> '';

create or replace function public.consume_free_delivery(_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  did_consume boolean := false;
begin
  insert into public.user_promos (user_id, free_deliveries_remaining)
  values (_user_id, 2)
  on conflict (user_id) do nothing;

  update public.user_promos
  set free_deliveries_remaining = free_deliveries_remaining - 1,
      total_free_used = total_free_used + 1,
      updated_at = now()
  where user_id = _user_id
    and free_deliveries_remaining > 0
  returning true into did_consume;

  return coalesce(did_consume, false);
end;
$$;

create or replace function public.refund_free_delivery(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_promos
  set free_deliveries_remaining = free_deliveries_remaining + 1,
      total_free_used = greatest(total_free_used - 1, 0),
      updated_at = now()
  where user_id = _user_id;
end;
$$;

create or replace function public.enforce_order_promos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.is_promo_free then
    if new.sender_id is null or not public.consume_free_delivery(new.sender_id) then
      raise exception 'No free deliveries remaining';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status is distinct from 'cancelled'
     and new.status = 'cancelled'
     and new.is_promo_free
     and new.sender_id is not null then
    perform public.refund_free_delivery(new.sender_id);
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_order_promos on public.orders;
create trigger enforce_order_promos before insert or update on public.orders
for each row execute function public.enforce_order_promos();

create or replace function public.issue_order_qr_token(
  _order_id uuid,
  _token_type text default 'pickup',
  _ttl_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  raw_token text;
  hashed_token text;
  token_id uuid;
  expires_at_value timestamptz;
  ttl integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if _token_type not in ('pickup', 'delivery', 'receipt') then
    raise exception 'Unsupported QR token type';
  end if;

  select * into target_order
  from public.orders
  where id = _order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if _token_type = 'pickup' then
    if target_order.sender_id is distinct from auth.uid()
       and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Only the sender can issue the pickup QR';
    end if;
    if target_order.status <> 'accepted' then
      raise exception 'Pickup QR can only be issued after a rider accepts the order';
    end if;
    if target_order.rider_id is null then
      raise exception 'Pickup QR requires an assigned rider';
    end if;
  elsif _token_type = 'delivery' then
    if target_order.sender_id is distinct from auth.uid()
       and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Only the sender can issue a delivery QR';
    end if;
    if target_order.status <> 'in_transit' then
      raise exception 'Delivery QR can only be issued when the rider is at the drop point';
    end if;
  elsif target_order.sender_id is distinct from auth.uid()
        and target_order.rider_id is distinct from public.current_rider_id()
        and not public.has_role(auth.uid(), 'admin') then
    raise exception 'You do not have access to this receipt QR';
  end if;

  ttl := least(greatest(coalesce(_ttl_seconds, 900), 60), 3600);
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  hashed_token := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  expires_at_value := now() + make_interval(secs => ttl);

  update public.order_qr_tokens
  set revoked_at = now()
  where order_id = _order_id
    and token_type = _token_type
    and used_at is null
    and revoked_at is null;

  insert into public.order_qr_tokens (order_id, token_hash, token_type, assigned_rider_id, created_by, expires_at)
  values (
    _order_id,
    hashed_token,
    _token_type,
    case when _token_type in ('pickup', 'delivery') then target_order.rider_id else null end,
    auth.uid(),
    expires_at_value
  )
  returning id into token_id;

  return jsonb_build_object(
    'token', raw_token,
    'tokenId', token_id,
    'type', _token_type,
    'orderId', _order_id,
    'expiresAt', expires_at_value,
    'oneTime', true
  );
end;
$$;

create or replace function public.consume_order_qr_token(
  _token text,
  _token_type text default 'pickup',
  _order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  token_row public.order_qr_tokens%rowtype;
  target_order public.orders%rowtype;
  rider uuid;
  hashed_token text;
  next_status public.order_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if _token_type not in ('pickup', 'delivery') then
    raise exception 'This QR token cannot update an order';
  end if;

  rider := public.current_rider_id();
  if rider is null then
    raise exception 'Only approved riders can verify QR handoffs';
  end if;

  hashed_token := encode(extensions.digest(btrim(coalesce(_token, '')), 'sha256'), 'hex');

  select * into token_row
  from public.order_qr_tokens
  where token_hash = hashed_token
  for update;

  if not found then
    raise exception 'Invalid QR token';
  end if;

  if token_row.token_type <> _token_type then
    raise exception 'This QR is for a different handoff step';
  end if;
  if _order_id is not null and token_row.order_id <> _order_id then
    raise exception 'This QR is not for this order';
  end if;
  if token_row.revoked_at is not null then
    raise exception 'This QR was replaced by a newer code';
  end if;
  if token_row.used_at is not null then
    raise exception 'This QR has already been used';
  end if;
  if token_row.expires_at <= now() then
    raise exception 'This QR has expired. Ask the sender for a new QR';
  end if;
  if token_row.assigned_rider_id is distinct from rider then
    raise exception 'This QR is assigned to another rider';
  end if;

  select * into target_order
  from public.orders
  where id = token_row.order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if _token_type = 'pickup' then
    if target_order.status <> 'accepted' then
      raise exception 'Pickup is not waiting for QR verification';
    end if;
    next_status := 'picked';
    perform set_config('droplix.pickup_qr_verified_order_id', target_order.id::text, true);
  else
    if target_order.status <> 'in_transit' then
      raise exception 'Delivery is not waiting for receiver verification';
    end if;
    next_status := 'delivered';
    perform set_config('droplix.delivery_verified_order_id', target_order.id::text, true);
  end if;

  update public.order_qr_tokens
  set used_at = now(),
      used_by = auth.uid(),
      used_rider_id = rider
  where id = token_row.id;

  update public.orders
  set status = next_status
  where id = target_order.id;

  return jsonb_build_object('ok', true, 'orderId', target_order.id, 'status', next_status, 'usedAt', now());
end;
$$;

create or replace function public.verify_delivery_otp(_order_id uuid, _otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
  rider uuid;
  failed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  rider := public.current_rider_id();
  if rider is null then
    raise exception 'Only approved riders can verify delivery';
  end if;

  select * into target_order
  from public.orders
  where id = _order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.rider_id is distinct from rider then
    raise exception 'This delivery is assigned to another rider';
  end if;

  if target_order.status <> 'in_transit' then
    raise exception 'Delivery is not waiting for OTP verification';
  end if;

  if target_order.delivery_otp_locked_until is not null
     and target_order.delivery_otp_locked_until > now() then
    return jsonb_build_object('ok', false, 'message', 'Too many wrong OTP attempts. Try again after a few minutes.');
  end if;

  if target_order.delivery_otp is null or btrim(_otp) <> target_order.delivery_otp then
    failed_count := coalesce(target_order.delivery_otp_failed_count, 0) + 1;

    update public.orders
    set delivery_otp_failed_count = failed_count,
        delivery_otp_locked_until = case when failed_count >= 5 then now() + interval '10 minutes' else null end
    where id = target_order.id;

    return jsonb_build_object(
      'ok', false,
      'message', case
        when failed_count >= 5 then 'Too many wrong OTP attempts. Locked for 10 minutes.'
        else 'Delivery OTP does not match this order.'
      end
    );
  end if;

  perform set_config('droplix.delivery_verified_order_id', target_order.id::text, true);

  update public.orders
  set status = 'delivered',
      delivery_otp_failed_count = 0,
      delivery_otp_locked_until = null
  where id = target_order.id;

  return jsonb_build_object('ok', true, 'orderId', target_order.id, 'status', 'delivered', 'usedAt', now());
end;
$$;

create or replace function public.get_public_order(_code text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', o.id,
    'tracking_code', o.tracking_code,
    'status', o.status,
    'pickup_address', o.pickup_address,
    'pickup_landmark', o.pickup_landmark,
    'drop_address', o.drop_address,
    'drop_landmark', o.drop_landmark,
    'item_description', o.item_description,
    'item_photo_url', o.item_photo_url,
    'distance_km', o.distance_km,
    'price_offered', o.price_offered,
    'payment_method', o.payment_method,
    'is_promo_free', o.is_promo_free,
    'created_at', o.created_at,
    'picked_at', o.picked_at,
    'delivered_at', o.delivered_at,
    'cancelled_at', o.cancelled_at,
    'rider_name', p.full_name,
    'rider_vehicle', r.vehicle_type,
    'delivery_otp', case when o.status = 'in_transit' then o.delivery_otp else null end
  )
  from public.orders o
  left join public.riders r on r.id = o.rider_id
  left join public.profiles p on p.id = r.user_id
  where upper(o.tracking_code) = upper(_code)
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_promos enable row level security;
alter table public.riders enable row level security;
alter table public.service_zones enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.order_qr_tokens enable row level security;

drop policy if exists "Profiles select own or admin" on public.profiles;
create policy "Profiles select own or admin"
on public.profiles for select
using (
  id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or exists (
    select 1
    from public.riders r
    join public.orders o on o.rider_id = r.id
    where r.user_id = profiles.id
      and (o.sender_id = auth.uid() or o.rider_id = public.current_rider_id())
  )
);

drop policy if exists "Profiles insert own" on public.profiles;
create policy "Profiles insert own"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Profiles update own or admin" on public.profiles;
create policy "Profiles update own or admin"
on public.profiles for update
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "User roles select own or admin" on public.user_roles;
create policy "User roles select own or admin"
on public.user_roles for select
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "User roles insert own sender or admin" on public.user_roles;
create policy "User roles insert own sender or admin"
on public.user_roles for insert
with check (
  public.has_role(auth.uid(), 'admin')
  or (user_id = auth.uid() and role in ('sender', 'rider'))
);

drop policy if exists "User roles admin update" on public.user_roles;
create policy "User roles admin update"
on public.user_roles for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "User promos select own or admin" on public.user_promos;
create policy "User promos select own or admin"
on public.user_promos for select
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "User promos insert own" on public.user_promos;
create policy "User promos insert own"
on public.user_promos for insert
with check (user_id = auth.uid());

drop policy if exists "Riders select authenticated" on public.riders;
create policy "Riders select authenticated"
on public.riders for select
to authenticated
using (true);

drop policy if exists "Riders insert own" on public.riders;
create policy "Riders insert own"
on public.riders for insert
with check (user_id = auth.uid());

drop policy if exists "Riders update own or admin" on public.riders;
create policy "Riders update own or admin"
on public.riders for update
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Active service zones public select" on public.service_zones;
create policy "Active service zones public select"
on public.service_zones for select
using (is_active = true);

drop policy if exists "Service zones admin select" on public.service_zones;
create policy "Service zones admin select"
on public.service_zones for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Service zones admin insert" on public.service_zones;
create policy "Service zones admin insert"
on public.service_zones for insert
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Service zones admin update" on public.service_zones;
create policy "Service zones admin update"
on public.service_zones for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Orders select by relationship" on public.orders;
create policy "Orders select by relationship"
on public.orders for select
using (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
  or (status = 'pending' and public.current_rider_id() is not null)
);

drop policy if exists "Orders insert own" on public.orders;
create policy "Orders insert own"
on public.orders for insert
with check (sender_id = auth.uid());

drop policy if exists "Orders update by relationship" on public.orders;
create policy "Orders update by relationship"
on public.orders for update
using (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
  or (status = 'pending' and public.current_rider_id() is not null)
)
with check (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
);

drop policy if exists "Notifications select own" on public.notifications;
create policy "Notifications select own"
on public.notifications for select
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Notifications insert related" on public.notifications;
create policy "Notifications insert related"
on public.notifications for insert
with check (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.sender_id = auth.uid() or o.rider_id = public.current_rider_id())
  )
);

drop policy if exists "Notifications update own" on public.notifications;
create policy "Notifications update own"
on public.notifications for update
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Audit logs admin select" on public.audit_logs;
create policy "Audit logs admin select"
on public.audit_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Audit logs insert own" on public.audit_logs;
create policy "Audit logs insert own"
on public.audit_logs for insert
to authenticated
with check (actor_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Order QR tokens select related" on public.order_qr_tokens;
create policy "Order QR tokens select related"
on public.order_qr_tokens for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or created_by = auth.uid()
  or assigned_rider_id = public.current_rider_id()
);

insert into public.service_zones (name, city, base_price, price_per_km, is_active)
values
  ('South Mumbai', 'Mumbai', 30, 8, true),
  ('Western Suburbs', 'Mumbai', 30, 8, true),
  ('Central Suburbs', 'Mumbai', 30, 8, true),
  ('Eastern Suburbs', 'Mumbai', 30, 8, true),
  ('Navi Mumbai & Thane', 'Mumbai', 40, 10, true)
on conflict (name, city) do update
set base_price = excluded.base_price,
    price_per_km = excluded.price_per_km,
    is_active = excluded.is_active;

insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Order photos public read" on storage.objects;
create policy "Order photos public read"
on storage.objects for select
using (bucket_id = 'order-photos');

drop policy if exists "Order photos owner upload" on storage.objects;
create policy "Order photos owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Order photos owner update" on storage.objects;
create policy "Order photos owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'order-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_promos'
    ) then
      alter publication supabase_realtime add table public.user_promos;
    end if;
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant usage on type public.app_role to authenticated;
grant usage on type public.order_status to authenticated;
grant usage on type public.rider_status to authenticated;
grant usage on type public.vehicle_type to authenticated;
grant select on public.service_zones to anon, authenticated;
grant select, insert, update on
  public.profiles,
  public.user_roles,
  public.user_promos,
  public.riders,
  public.service_zones,
  public.notifications
to authenticated;
revoke select, insert, update on public.orders from authenticated;
grant select (
  id,
  sender_id,
  rider_id,
  pickup_address,
  pickup_landmark,
  drop_address,
  drop_landmark,
  item_description,
  item_photo_url,
  sender_phone,
  receiver_phone,
  price_offered,
  suggested_price,
  distance_km,
  status,
  payment_method,
  delivery_proof_url,
  picked_at,
  delivered_at,
  cancelled_at,
  cancellation_reason,
  created_at,
  updated_at,
  is_promo_free,
  platform_paid_amount,
  sender_paid_amount,
  tracking_code
) on public.orders to authenticated;
grant insert (
  sender_id,
  pickup_address,
  pickup_landmark,
  drop_address,
  drop_landmark,
  item_description,
  item_photo_url,
  sender_phone,
  receiver_phone,
  price_offered,
  suggested_price,
  distance_km,
  payment_method,
  is_promo_free,
  platform_paid_amount,
  sender_paid_amount,
  tracking_code
) on public.orders to authenticated;
grant update (
  rider_id,
  status,
  delivery_proof_url,
  item_photo_url,
  cancellation_reason
) on public.orders to authenticated;
grant select on public.order_qr_tokens to authenticated;
grant execute on function public.get_public_order(text) to anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;
revoke all on function public.current_rider_id() from public, anon;
grant execute on function public.current_rider_id() to anon, authenticated;
revoke all on function public.generate_tracking_code() from public, anon, authenticated;
revoke all on function public.consume_free_delivery(uuid) from public, anon, authenticated;
revoke all on function public.refund_free_delivery(uuid) from public, anon, authenticated;
revoke all on function public.issue_order_qr_token(uuid, text, integer) from public, anon;
revoke all on function public.consume_order_qr_token(text, text, uuid) from public, anon;
revoke all on function public.verify_delivery_otp(uuid, text) from public, anon;
grant execute on function public.issue_order_qr_token(uuid, text, integer) to authenticated;
grant execute on function public.consume_order_qr_token(text, text, uuid) to authenticated;
grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;

do $$
declare
  -- Optional bootstrap admin for fresh projects.
  bootstrap_admin_email constant text := 'raashifshaikh70@gmail.com';
  bootstrap_admin_id uuid;
begin
  select id
  into bootstrap_admin_id
  from auth.users
  where lower(email) = lower(bootstrap_admin_email)
  limit 1;

  if bootstrap_admin_id is null then
    raise notice 'Admin bootstrap skipped: % does not exist in auth.users yet.', bootstrap_admin_email;
    return;
  end if;

  insert into public.profiles (id, email, full_name, is_guest)
  values (bootstrap_admin_id, bootstrap_admin_email, 'Admin', false)
  on conflict (id) do update
  set email = excluded.email,
      is_guest = false,
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values
    (bootstrap_admin_id, 'sender'),
    (bootstrap_admin_id, 'admin')
  on conflict (user_id, role) do nothing;

  insert into public.user_promos (user_id, free_deliveries_remaining)
  values (bootstrap_admin_id, 2)
  on conflict (user_id) do nothing;
end $$;
