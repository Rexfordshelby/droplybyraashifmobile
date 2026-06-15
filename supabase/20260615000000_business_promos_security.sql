-- Droplix business/store system and stricter free-delivery security.
-- Safe to run after droplix_full_schema.sql and the 2026-06-08/09 migrations.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.normalize_phone_10(_phone text)
returns text
language sql
immutable
as $$
  with digits as (
    select regexp_replace(coalesce(_phone, ''), '\D', '', 'g') as value
  )
  select case
    when length(value) = 10 then value
    when length(value) > 10 then right(value, 10)
    else null
  end
  from digits;
$$;

create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  business_type text not null default 'store',
  gst_number text,
  address text,
  city text not null default 'Mumbai',
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended', 'rejected')),
  default_order_channel text not null default 'b2p' check (default_order_channel in ('b2p', 'b2b')),
  monthly_volume_estimate integer not null default 25 check (monthly_volume_estimate >= 0),
  notes text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid not null references public.business_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_account_id, user_id)
);

create table if not exists public.business_inquiries (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  business_type text not null default 'store',
  estimated_orders_per_month integer not null default 25 check (estimated_orders_per_month >= 0),
  message text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'converted', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  business_account_id uuid references public.business_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_delivery_batches (
  id uuid primary key default gen_random_uuid(),
  business_account_id uuid not null references public.business_accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  total_stops integer not null default 0 check (total_stops >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.free_delivery_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_phone text not null check (sender_phone ~ '^[0-9]{10}$'),
  order_id uuid unique,
  claimed_at timestamptz not null default now(),
  refunded_at timestamptz,
  refunded_by uuid references auth.users(id) on delete set null,
  refund_reason text,
  created_at timestamptz not null default now()
);

alter table public.free_delivery_claims drop constraint if exists free_delivery_claims_order_id_fkey;
alter table public.free_delivery_claims
  add constraint free_delivery_claims_order_id_fkey
  foreign key (order_id)
  references public.orders(id)
  on delete set null
  deferrable initially deferred;

alter table public.orders add column if not exists business_account_id uuid references public.business_accounts(id) on delete set null;
alter table public.orders add column if not exists business_batch_id uuid references public.business_delivery_batches(id) on delete set null;
alter table public.orders add column if not exists order_channel text not null default 'p2p';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_order_channel_valid') then
    alter table public.orders
      add constraint orders_order_channel_valid
      check (order_channel in ('p2p', 'b2p', 'b2b')) not valid;
  end if;
end $$;

create index if not exists idx_business_accounts_owner_status on public.business_accounts(owner_id, status);
create index if not exists idx_business_accounts_status_created on public.business_accounts(status, created_at desc);
create index if not exists idx_business_members_user_id on public.business_members(user_id);
create index if not exists idx_business_members_account_id on public.business_members(business_account_id);
create index if not exists idx_business_inquiries_status_created on public.business_inquiries(status, created_at desc);
create index if not exists idx_business_batches_account_status on public.business_delivery_batches(business_account_id, status);
create index if not exists idx_orders_business_account on public.orders(business_account_id, created_at desc);
create index if not exists idx_orders_business_batch on public.orders(business_batch_id);
create index if not exists idx_orders_order_channel on public.orders(order_channel, created_at desc);
create index if not exists idx_free_delivery_claims_user_active on public.free_delivery_claims(user_id) where refunded_at is null;
create index if not exists idx_free_delivery_claims_phone_active on public.free_delivery_claims(sender_phone) where refunded_at is null;
create index if not exists idx_free_delivery_claims_order_id on public.free_delivery_claims(order_id);

drop trigger if exists touch_business_accounts_updated_at on public.business_accounts;
create trigger touch_business_accounts_updated_at before update on public.business_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_business_inquiries_updated_at on public.business_inquiries;
create trigger touch_business_inquiries_updated_at before update on public.business_inquiries
for each row execute function public.touch_updated_at();

drop trigger if exists touch_business_batches_updated_at on public.business_delivery_batches;
create trigger touch_business_batches_updated_at before update on public.business_delivery_batches
for each row execute function public.touch_updated_at();

create or replace function public.is_business_member(_business_account_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_account_id = _business_account_id
      and bm.user_id = _user_id
  )
  or exists (
    select 1
    from public.business_accounts ba
    where ba.id = _business_account_id
      and ba.owner_id = _user_id
  );
$$;

create or replace function public.can_manage_business(_business_account_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin')
  or exists (
    select 1
    from public.business_accounts ba
    where ba.id = _business_account_id
      and ba.owner_id = _user_id
  )
  or exists (
    select 1
    from public.business_members bm
    where bm.business_account_id = _business_account_id
      and bm.user_id = _user_id
      and bm.role in ('owner', 'manager')
  );
$$;

create or replace function public.guard_business_account_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (
       old.status is distinct from new.status
       or old.approved_at is distinct from new.approved_at
       or old.approved_by is distinct from new.approved_by
       or old.suspended_at is distinct from new.suspended_at
       or old.suspended_by is distinct from new.suspended_by
     )
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can change business approval status';
  end if;

  if new.status = 'approved' and new.approved_at is null then
    new.approved_at = now();
    new.approved_by = coalesce(new.approved_by, auth.uid());
  end if;

  if new.status = 'suspended' and new.suspended_at is null then
    new.suspended_at = now();
    new.suspended_by = coalesce(new.suspended_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists guard_business_account_status on public.business_accounts;
create trigger guard_business_account_status before update on public.business_accounts
for each row execute function public.guard_business_account_status();

create or replace function public.get_free_delivery_eligibility(_sender_phone text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_phone text := public.normalize_phone_10(_sender_phone);
  account_used integer := 0;
  account_claims integer := 0;
  phone_claims integer := 0;
  account_remaining integer := 0;
  phone_remaining integer := 2;
begin
  if auth.uid() is null then
    return jsonb_build_object('eligible', false, 'remaining', 0, 'reason', 'Authentication required');
  end if;

  select coalesce(up.total_free_used, 0)
  into account_used
  from public.user_promos up
  where up.user_id = auth.uid();

  select count(*)::int
  into account_claims
  from public.free_delivery_claims
  where user_id = auth.uid()
    and refunded_at is null;

  account_used := greatest(coalesce(account_used, 0), coalesce(account_claims, 0));
  account_remaining := greatest(2 - account_used, 0);

  if normalized_phone is not null then
    select count(*)::int
    into phone_claims
    from public.free_delivery_claims
    where sender_phone = normalized_phone
      and refunded_at is null;

    phone_remaining := greatest(2 - coalesce(phone_claims, 0), 0);
  end if;

  return jsonb_build_object(
    'eligible', account_remaining > 0 and normalized_phone is not null and phone_remaining > 0,
    'remaining', case when normalized_phone is null then 0 else least(account_remaining, phone_remaining) end,
    'accountRemaining', account_remaining,
    'phoneRemaining', phone_remaining,
    'normalizedPhone', normalized_phone,
    'phoneRequired', normalized_phone is null,
    'reason', case
      when account_remaining <= 0 then 'Account free deliveries exhausted'
      when normalized_phone is null then 'Enter a valid sender phone to check free delivery'
      when phone_remaining <= 0 then 'This phone number has used all free deliveries'
      else null
    end
  );
end;
$$;

create or replace function public.consume_free_delivery(_user_id uuid, _sender_phone text, _order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := public.normalize_phone_10(_sender_phone);
  account_used integer := 0;
  account_claims integer := 0;
  phone_claims integer := 0;
begin
  if _user_id is null or _order_id is null then
    return false;
  end if;

  if normalized_phone is null then
    raise exception 'Valid sender phone required for free delivery';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('free-user-' || _user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('free-phone-' || normalized_phone, 0));

  insert into public.user_promos (user_id, free_deliveries_remaining, total_free_used)
  values (_user_id, 2, 0)
  on conflict (user_id) do nothing;

  select coalesce(total_free_used, 0)
  into account_used
  from public.user_promos
  where user_id = _user_id
  for update;

  select count(*)::int
  into account_claims
  from public.free_delivery_claims
  where user_id = _user_id
    and refunded_at is null;

  select count(*)::int
  into phone_claims
  from public.free_delivery_claims
  where sender_phone = normalized_phone
    and refunded_at is null;

  account_used := greatest(coalesce(account_used, 0), coalesce(account_claims, 0));

  if account_used >= 2 then
    raise exception 'No free deliveries remaining for this account';
  end if;

  if phone_claims >= 2 then
    raise exception 'No free deliveries remaining for this phone number';
  end if;

  insert into public.free_delivery_claims (user_id, sender_phone, order_id)
  values (_user_id, normalized_phone, _order_id)
  on conflict (order_id) do update
  set user_id = excluded.user_id,
      sender_phone = excluded.sender_phone,
      refunded_at = null,
      refunded_by = null,
      refund_reason = null;

  update public.user_promos
  set total_free_used = greatest(total_free_used, account_used + 1),
      free_deliveries_remaining = greatest(2 - greatest(total_free_used, account_used + 1), 0),
      updated_at = now()
  where user_id = _user_id;

  return true;
end;
$$;

create or replace function public.refund_free_delivery(_user_id uuid, _sender_phone text default null, _order_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_claim uuid;
begin
  select id
  into target_claim
  from public.free_delivery_claims
  where user_id = _user_id
    and refunded_at is null
    and (_order_id is null or order_id = _order_id)
  order by claimed_at desc
  limit 1
  for update;

  if target_claim is null then
    return;
  end if;

  update public.free_delivery_claims
  set refunded_at = now(),
      refunded_by = auth.uid(),
      refund_reason = case
        when _order_id is not null then 'cancelled_before_acceptance'
        else 'manual_refund'
      end
  where id = target_claim;

  update public.user_promos
  set free_deliveries_remaining = least(free_deliveries_remaining + 1, 2),
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
    if new.sender_id is null or not public.consume_free_delivery(new.sender_id, new.sender_phone, new.id) then
      raise exception 'No free deliveries remaining';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and new.status = 'cancelled'
     and new.is_promo_free
     and new.sender_id is not null then
    perform public.refund_free_delivery(new.sender_id, new.sender_phone, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_order_promos on public.orders;
create trigger enforce_order_promos before insert or update on public.orders
for each row execute function public.enforce_order_promos();

create or replace function public.apply_order_defaults_and_flow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business public.business_accounts%rowtype;
begin
  if tg_op = 'INSERT'
     and coalesce(new.status, 'pending') <> 'pending'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'New orders must start as pending';
  end if;

  new.protection_tier = coalesce(nullif(new.protection_tier, ''), 'basic');
  new.protection_fee = coalesce(new.protection_fee, 0);
  new.protection_coverage = coalesce(new.protection_coverage, 0);
  new.fare_locked = coalesce(new.fare_locked, true);
  new.delivery_priority = coalesce(nullif(new.delivery_priority, ''), 'standard');
  new.priority_fee = coalesce(new.priority_fee, 0);
  new.business_order = coalesce(new.business_order, false);
  new.multi_stop_count = greatest(coalesce(new.multi_stop_count, 1), 1);
  new.trusted_rider_required = coalesce(new.trusted_rider_required, false) or new.protection_tier = 'premium';
  new.support_channel = coalesce(nullif(new.support_channel, ''), 'whatsapp');
  new.order_channel = coalesce(nullif(new.order_channel, ''), case when new.business_order then 'b2p' else 'p2p' end);
  new.guarantee_credit_amount = coalesce(new.guarantee_credit_amount, case when new.delivery_priority = 'emergency' then 50 else 20 end);

  if new.delivery_priority = 'scheduled' and new.scheduled_for is null then
    raise exception 'Scheduled deliveries require a pickup slot';
  end if;

  if new.business_account_id is not null then
    select *
    into target_business
    from public.business_accounts
    where id = new.business_account_id;

    if not found then
      raise exception 'Business account not found';
    end if;

    if target_business.status <> 'approved' and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Business account must be approved before booking business orders';
    end if;

    if not public.is_business_member(new.business_account_id, auth.uid()) and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Only business members can create business orders';
    end if;

    new.business_order = true;
    new.business_name = coalesce(nullif(new.business_name, ''), target_business.name);
    new.order_channel = case when new.order_channel in ('b2p', 'b2b') then new.order_channel else 'b2p' end;
  elsif new.business_order and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Business orders require an approved business account';
  elsif new.business_order and new.order_channel = 'p2p' then
    new.order_channel = 'b2p';
  end if;

  new.fare_locked_amount = coalesce(nullif(new.fare_locked_amount, 0), new.price_offered + new.protection_fee + new.priority_fee);

  if new.is_promo_free then
    new.platform_paid_amount = coalesce(nullif(new.platform_paid_amount, 0), new.price_offered);
    new.sender_paid_amount = coalesce(nullif(new.sender_paid_amount, 0), new.protection_fee + new.priority_fee);
  else
    new.platform_paid_amount = 0;
    new.sender_paid_amount = coalesce(nullif(new.sender_paid_amount, 0), new.price_offered + new.protection_fee + new.priority_fee);
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

alter table public.business_accounts enable row level security;
alter table public.business_members enable row level security;
alter table public.business_inquiries enable row level security;
alter table public.business_delivery_batches enable row level security;
alter table public.free_delivery_claims enable row level security;

drop policy if exists "Business accounts member or admin select" on public.business_accounts;
create policy "Business accounts member or admin select"
on public.business_accounts for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or owner_id = auth.uid()
  or public.is_business_member(id, auth.uid())
);

drop policy if exists "Business accounts owner insert" on public.business_accounts;
create policy "Business accounts owner insert"
on public.business_accounts for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Business accounts manager update" on public.business_accounts;
create policy "Business accounts manager update"
on public.business_accounts for update
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.can_manage_business(id, auth.uid()))
with check (public.has_role(auth.uid(), 'admin') or public.can_manage_business(id, auth.uid()));

drop policy if exists "Business members member or admin select" on public.business_members;
create policy "Business members member or admin select"
on public.business_members for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.is_business_member(business_account_id, auth.uid()));

drop policy if exists "Business members manager insert" on public.business_members;
create policy "Business members manager insert"
on public.business_members for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or public.can_manage_business(business_account_id, auth.uid())
  or (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1
      from public.business_accounts ba
      where ba.id = business_account_id
        and ba.owner_id = auth.uid()
    )
  )
);

drop policy if exists "Business members manager update" on public.business_members;
create policy "Business members manager update"
on public.business_members for update
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.can_manage_business(business_account_id, auth.uid()))
with check (public.has_role(auth.uid(), 'admin') or public.can_manage_business(business_account_id, auth.uid()));

drop policy if exists "Business inquiries public insert" on public.business_inquiries;
create policy "Business inquiries public insert"
on public.business_inquiries for insert
with check (true);

drop policy if exists "Business inquiries related select" on public.business_inquiries;
create policy "Business inquiries related select"
on public.business_inquiries for select
using (public.has_role(auth.uid(), 'admin') or created_by = auth.uid());

drop policy if exists "Business inquiries admin update" on public.business_inquiries;
create policy "Business inquiries admin update"
on public.business_inquiries for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Business batches member select" on public.business_delivery_batches;
create policy "Business batches member select"
on public.business_delivery_batches for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.is_business_member(business_account_id, auth.uid()));

drop policy if exists "Business batches member insert" on public.business_delivery_batches;
create policy "Business batches member insert"
on public.business_delivery_batches for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') or public.is_business_member(business_account_id, auth.uid()));

drop policy if exists "Business batches manager update" on public.business_delivery_batches;
create policy "Business batches manager update"
on public.business_delivery_batches for update
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.can_manage_business(business_account_id, auth.uid()))
with check (public.has_role(auth.uid(), 'admin') or public.can_manage_business(business_account_id, auth.uid()));

drop policy if exists "Free delivery claims own or admin select" on public.free_delivery_claims;
create policy "Free delivery claims own or admin select"
on public.free_delivery_claims for select
to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Free delivery claims admin update" on public.free_delivery_claims;
create policy "Free delivery claims admin update"
on public.free_delivery_claims for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Orders insert own" on public.orders;
create policy "Orders insert own"
on public.orders for insert
with check (
  sender_id = auth.uid()
  and (
    business_account_id is null
    or (
      public.is_business_member(business_account_id, auth.uid())
      and exists (
        select 1
        from public.business_accounts ba
        where ba.id = business_account_id
          and ba.status = 'approved'
      )
    )
  )
);

drop policy if exists "Orders select by relationship" on public.orders;
create policy "Orders select by relationship"
on public.orders for select
using (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
  or (status = 'pending' and public.current_rider_id() is not null)
  or (business_account_id is not null and public.is_business_member(business_account_id, auth.uid()))
);

drop policy if exists "Orders update by relationship" on public.orders;
create policy "Orders update by relationship"
on public.orders for update
using (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
  or (status = 'pending' and public.current_rider_id() is not null)
  or (business_account_id is not null and public.can_manage_business(business_account_id, auth.uid()))
)
with check (
  public.has_role(auth.uid(), 'admin')
  or sender_id = auth.uid()
  or rider_id = public.current_rider_id()
  or (business_account_id is not null and public.can_manage_business(business_account_id, auth.uid()))
);

grant select, insert, update on public.business_accounts to authenticated;
grant select, insert, update on public.business_members to authenticated;
grant select, insert, update on public.business_delivery_batches to authenticated;
grant select, insert, update on public.business_inquiries to anon, authenticated;
grant select, update on public.free_delivery_claims to authenticated;

grant execute on function public.normalize_phone_10(text) to anon, authenticated;
grant execute on function public.get_free_delivery_eligibility(text) to authenticated;
grant execute on function public.is_business_member(uuid, uuid) to authenticated;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated;

grant select (
  business_account_id,
  business_batch_id,
  order_channel,
  pickup_proof_url,
  transit_photo_url,
  protection_tier,
  protection_fee,
  protection_coverage,
  fare_locked,
  fare_locked_amount,
  delivery_priority,
  priority_fee,
  scheduled_for,
  business_order,
  business_name,
  multi_stop_count,
  trusted_rider_required,
  support_channel,
  estimated_eta_minutes,
  eta_confidence,
  guarantee_credit_amount
) on public.orders to authenticated;

grant insert (
  business_account_id,
  business_batch_id,
  order_channel,
  pickup_proof_url,
  transit_photo_url,
  protection_tier,
  protection_fee,
  protection_coverage,
  fare_locked,
  fare_locked_amount,
  delivery_priority,
  priority_fee,
  scheduled_for,
  business_order,
  business_name,
  multi_stop_count,
  trusted_rider_required,
  support_channel,
  estimated_eta_minutes,
  eta_confidence,
  guarantee_credit_amount
) on public.orders to authenticated;

grant update (
  business_account_id,
  business_batch_id,
  order_channel,
  pickup_proof_url,
  transit_photo_url,
  protection_tier,
  protection_fee,
  protection_coverage,
  fare_locked,
  fare_locked_amount,
  delivery_priority,
  priority_fee,
  scheduled_for,
  business_order,
  business_name,
  multi_stop_count,
  trusted_rider_required,
  support_channel,
  estimated_eta_minutes,
  eta_confidence,
  guarantee_credit_amount
) on public.orders to authenticated;

insert into public.free_delivery_claims (user_id, sender_phone, order_id, claimed_at)
select o.sender_id,
       public.normalize_phone_10(o.sender_phone),
       o.id,
       coalesce(o.created_at, now())
from public.orders o
where o.is_promo_free = true
  and o.sender_id is not null
  and public.normalize_phone_10(o.sender_phone) is not null
on conflict (order_id) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_accounts'
    ) then
      alter publication supabase_realtime add table public.business_accounts;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_inquiries'
    ) then
      alter publication supabase_realtime add table public.business_inquiries;
    end if;
  end if;
end $$;
