-- Secure Droplix handoffs with one-time QR tokens and server-side verification.
-- Run this in Supabase SQL Editor after the base schema.

create extension if not exists pgcrypto;

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

alter table public.orders add column if not exists delivery_otp_failed_count integer not null default 0;
alter table public.orders add column if not exists delivery_otp_locked_until timestamptz;

create index if not exists idx_order_qr_tokens_order_type on public.order_qr_tokens(order_id, token_type);
create index if not exists idx_order_qr_tokens_assigned_rider on public.order_qr_tokens(assigned_rider_id);
create index if not exists idx_order_qr_tokens_expires_at on public.order_qr_tokens(expires_at);
create unique index if not exists uq_order_qr_tokens_active
on public.order_qr_tokens(order_id, token_type)
where used_at is null and revoked_at is null;

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

  select *
  into target_order
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
  raw_token := encode(gen_random_bytes(32), 'hex');
  hashed_token := encode(digest(raw_token, 'sha256'), 'hex');
  expires_at_value := now() + make_interval(secs => ttl);

  update public.order_qr_tokens
  set revoked_at = now()
  where order_id = _order_id
    and token_type = _token_type
    and used_at is null
    and revoked_at is null;

  insert into public.order_qr_tokens (
    order_id,
    token_hash,
    token_type,
    assigned_rider_id,
    created_by,
    expires_at
  )
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

  hashed_token := encode(digest(btrim(coalesce(_token, '')), 'sha256'), 'hex');

  select *
  into token_row
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

  select *
  into target_order
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

  return jsonb_build_object(
    'ok', true,
    'orderId', target_order.id,
    'status', next_status,
    'usedAt', now()
  );
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

  select *
  into target_order
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Too many wrong OTP attempts. Try again after a few minutes.'
    );
  end if;

  if target_order.delivery_otp is null or btrim(_otp) <> target_order.delivery_otp then
    failed_count := coalesce(target_order.delivery_otp_failed_count, 0) + 1;

    update public.orders
    set delivery_otp_failed_count = failed_count,
        delivery_otp_locked_until = case
          when failed_count >= 5 then now() + interval '10 minutes'
          else null
        end
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

  return jsonb_build_object(
    'ok', true,
    'orderId', target_order.id,
    'status', 'delivered',
    'usedAt', now()
  );
end;
$$;

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

alter table public.order_qr_tokens enable row level security;

drop policy if exists "Order QR tokens select related" on public.order_qr_tokens;
create policy "Order QR tokens select related"
on public.order_qr_tokens for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or created_by = auth.uid()
  or assigned_rider_id = public.current_rider_id()
);

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
revoke all on function public.issue_order_qr_token(uuid, text, integer) from public, anon;
revoke all on function public.consume_order_qr_token(text, text, uuid) from public, anon;
revoke all on function public.verify_delivery_otp(uuid, text) from public, anon;
grant execute on function public.issue_order_qr_token(uuid, text, integer) to authenticated;
grant execute on function public.consume_order_qr_token(text, text, uuid) to authenticated;
grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;
