-- Droplix trust-first platform features.
-- Safe to run multiple times in Supabase SQL Editor.

create extension if not exists pgcrypto;

alter table public.orders add column if not exists pickup_proof_url text;
alter table public.orders add column if not exists transit_photo_url text;
alter table public.orders add column if not exists protection_tier text not null default 'basic';
alter table public.orders add column if not exists protection_fee numeric not null default 0;
alter table public.orders add column if not exists protection_coverage numeric not null default 0;
alter table public.orders add column if not exists fare_locked boolean not null default true;
alter table public.orders add column if not exists fare_locked_amount numeric not null default 0;
alter table public.orders add column if not exists delivery_priority text not null default 'standard';
alter table public.orders add column if not exists priority_fee numeric not null default 0;
alter table public.orders add column if not exists scheduled_for timestamptz;
alter table public.orders add column if not exists business_order boolean not null default false;
alter table public.orders add column if not exists business_name text;
alter table public.orders add column if not exists multi_stop_count integer not null default 1;
alter table public.orders add column if not exists trusted_rider_required boolean not null default false;
alter table public.orders add column if not exists support_channel text not null default 'whatsapp';
alter table public.orders add column if not exists estimated_eta_minutes integer;
alter table public.orders add column if not exists eta_confidence integer;
alter table public.orders add column if not exists guarantee_credit_amount numeric not null default 20;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_protection_tier_valid') then
    alter table public.orders
      add constraint orders_protection_tier_valid
      check (protection_tier in ('basic', 'protected', 'premium')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_delivery_priority_valid') then
    alter table public.orders
      add constraint orders_delivery_priority_valid
      check (delivery_priority in ('standard', 'scheduled', 'emergency')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_support_channel_valid') then
    alter table public.orders
      add constraint orders_support_channel_valid
      check (support_channel in ('whatsapp', 'call')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_multi_stop_count_valid') then
    alter table public.orders
      add constraint orders_multi_stop_count_valid
      check (multi_stop_count between 1 and 8) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_trust_amounts_non_negative') then
    alter table public.orders
      add constraint orders_trust_amounts_non_negative
      check (
        protection_fee >= 0
        and protection_coverage >= 0
        and fare_locked_amount >= 0
        and priority_fee >= 0
        and guarantee_credit_amount >= 0
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'orders_eta_confidence_valid') then
    alter table public.orders
      add constraint orders_eta_confidence_valid
      check (eta_confidence is null or eta_confidence between 0 and 100) not valid;
  end if;
end $$;

update public.orders
set protection_tier = coalesce(nullif(protection_tier, ''), 'basic'),
    protection_fee = coalesce(protection_fee, 0),
    protection_coverage = coalesce(protection_coverage, 0),
    fare_locked = coalesce(fare_locked, true),
    delivery_priority = coalesce(nullif(delivery_priority, ''), 'standard'),
    priority_fee = coalesce(priority_fee, 0),
    business_order = coalesce(business_order, false),
    multi_stop_count = greatest(coalesce(multi_stop_count, 1), 1),
    trusted_rider_required = coalesce(trusted_rider_required, false),
    support_channel = coalesce(nullif(support_channel, ''), 'whatsapp'),
    guarantee_credit_amount = coalesce(guarantee_credit_amount, 20),
    fare_locked_amount = case
      when coalesce(fare_locked_amount, 0) > 0 then fare_locked_amount
      else coalesce(sender_paid_amount, price_offered, 0) + coalesce(protection_fee, 0) + coalesce(priority_fee, 0)
    end;

create index if not exists idx_orders_trust_priority on public.orders(delivery_priority, trusted_rider_required, status);
create index if not exists idx_orders_scheduled_for on public.orders(scheduled_for) where scheduled_for is not null;
create index if not exists idx_orders_business_order on public.orders(business_order, created_at desc);
create index if not exists idx_orders_protection_tier on public.orders(protection_tier);

create table if not exists public.rider_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  parcel_arrived_safely boolean not null,
  was_on_time boolean not null,
  trust_again boolean not null,
  review_tags text[] not null default '{}'::text[],
  business_context text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, rider_id)
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  requester_id uuid references auth.users(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'call')),
  issue_type text not null default 'delivery_help',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rider_reviews enable row level security;
alter table public.favorite_riders enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "Rider reviews visible to authenticated" on public.rider_reviews;
create policy "Rider reviews visible to authenticated"
on public.rider_reviews for select
to authenticated
using (true);

drop policy if exists "Senders review delivered orders" on public.rider_reviews;
create policy "Senders review delivered orders"
on public.rider_reviews for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    where o.id = rider_reviews.order_id
      and o.sender_id = auth.uid()
      and o.rider_id = rider_reviews.rider_id
      and o.status = 'delivered'
  )
);

drop policy if exists "Favorite riders own select" on public.favorite_riders;
create policy "Favorite riders own select"
on public.favorite_riders for select
to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Favorite riders own write" on public.favorite_riders;
create policy "Favorite riders own write"
on public.favorite_riders for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Support requests own or admin select" on public.support_requests;
create policy "Support requests own or admin select"
on public.support_requests for select
to authenticated
using (requester_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Support requests own insert" on public.support_requests;
create policy "Support requests own insert"
on public.support_requests for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists "Support requests admin update" on public.support_requests;
create policy "Support requests admin update"
on public.support_requests for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

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
  new.guarantee_credit_amount = coalesce(new.guarantee_credit_amount, case when new.delivery_priority = 'emergency' then 50 else 20 end);

  if new.delivery_priority = 'scheduled' and new.scheduled_for is null then
    raise exception 'Scheduled deliveries require a pickup slot';
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

create or replace function public.get_rider_trust_profile(_rider_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with order_stats as (
    select
      count(*) filter (where status = 'delivered')::int as completed_deliveries,
      count(*) filter (where status = 'cancelled')::int as cancellations,
      count(*)::int as handled,
      count(*) filter (
        where status = 'delivered'
          and delivered_at is not null
          and created_at is not null
          and delivered_at <= created_at + make_interval(mins => coalesce(estimated_eta_minutes, 90) + 30)
      )::int as on_time_deliveries,
      count(distinct sender_id) filter (where status = 'delivered' and sender_id is not null)::int as unique_senders,
      greatest(
        count(*) filter (where status = 'delivered')
        - count(distinct sender_id) filter (where status = 'delivered' and sender_id is not null),
        0
      )::int as repeat_orders
    from public.orders
    where rider_id = _rider_id
  ),
  review_stats as (
    select
      count(*)::int as reviews,
      count(*) filter (where parcel_arrived_safely is false)::int as damage_incidents,
      count(*) filter (where trust_again)::int as trust_again_count,
      coalesce(
        array_agg(distinct tag) filter (where tag is not null),
        array[]::text[]
      ) as tags
    from public.rider_reviews rr
    left join lateral unnest(rr.review_tags) as tag on true
    where rr.rider_id = _rider_id
  ),
  scored as (
    select
      os.completed_deliveries,
      case when os.handled > 0 then round((os.cancellations::numeric / os.handled::numeric) * 100, 1) else 0 end as cancellation_rate,
      case when os.completed_deliveries > 0 then round((os.on_time_deliveries::numeric / os.completed_deliveries::numeric) * 100, 0) else 0 end as on_time_rate,
      rs.damage_incidents,
      case
        when rs.reviews > 0 then round((rs.trust_again_count::numeric / rs.reviews::numeric) * 100, 0)
        when os.completed_deliveries > 0 then least(95, 35 + os.repeat_orders * 5)
        else 0
      end as repeat_customer_rate,
      rs.tags
    from order_stats os
    cross join review_stats rs
  )
  select jsonb_build_object(
    'completed_deliveries', completed_deliveries,
    'rating', case when completed_deliveries > 0 then 4.8 else 0 end,
    'on_time_rate', on_time_rate,
    'cancellation_rate', cancellation_rate,
    'damage_incidents', damage_incidents,
    'repeat_customer_rate', repeat_customer_rate,
    'trust_score', case
      when completed_deliveries = 0 then 0
      else greatest(0, least(100, round((on_time_rate + (100 - cancellation_rate) + repeat_customer_rate) / 3, 0)))
    end,
    'trust_tier', case
      when completed_deliveries >= 500 and cancellation_rate <= 1 then 'gold'
      when completed_deliveries >= 100 and cancellation_rate <= 3 then 'silver'
      else 'standard'
    end,
    'review_tags', case
      when array_length(tags, 1) is not null then to_jsonb(tags[1:4])
      else '["Professional","Careful handoff","Good communication"]'::jsonb
    end
  )
  from scored;
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
    'transit_photo_url', o.transit_photo_url,
    'delivery_proof_url', o.delivery_proof_url,
    'distance_km', o.distance_km,
    'price_offered', o.price_offered,
    'fare_locked_amount', o.fare_locked_amount,
    'protection_tier', o.protection_tier,
    'protection_coverage', o.protection_coverage,
    'protection_fee', o.protection_fee,
    'delivery_priority', o.delivery_priority,
    'priority_fee', o.priority_fee,
    'scheduled_for', o.scheduled_for,
    'trusted_rider_required', o.trusted_rider_required,
    'support_channel', o.support_channel,
    'estimated_eta_minutes', o.estimated_eta_minutes,
    'eta_confidence', o.eta_confidence,
    'guarantee_credit_amount', o.guarantee_credit_amount,
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

grant select, insert, update on public.rider_reviews to authenticated;
grant select, insert, update, delete on public.favorite_riders to authenticated;
grant select, insert, update on public.support_requests to authenticated;
grant execute on function public.get_rider_trust_profile(uuid) to authenticated;
grant execute on function public.get_public_order(text) to anon, authenticated;

