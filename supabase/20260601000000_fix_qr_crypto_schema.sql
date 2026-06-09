-- Fix QR token issuance on hosted Supabase projects where pgcrypto lives in the
-- `extensions` schema instead of `public`.

create extension if not exists pgcrypto with schema extensions;

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

revoke all on function public.issue_order_qr_token(uuid, text, integer) from public, anon;
revoke all on function public.consume_order_qr_token(text, text, uuid) from public, anon;
grant execute on function public.issue_order_qr_token(uuid, text, integer) to authenticated;
grant execute on function public.consume_order_qr_token(text, text, uuid) to authenticated;
