-- Receiver delivery scanner and editable trust reviews.
-- Safe to run more than once.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.issue_receiver_delivery_qr_token(
  _tracking_code text,
  _ttl_seconds integer default 300
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
  if btrim(coalesce(_tracking_code, '')) = '' then
    raise exception 'Tracking code required';
  end if;

  select * into target_order
  from public.orders
  where upper(tracking_code) = upper(btrim(_tracking_code))
  for update;

  if not found then
    raise exception 'Tracking link not found';
  end if;

  if target_order.status <> 'in_transit' then
    raise exception 'Receiver QR is available only when the rider reaches the drop point';
  end if;

  if target_order.rider_id is null then
    raise exception 'Receiver QR needs an assigned rider';
  end if;

  ttl := least(greatest(coalesce(_ttl_seconds, 300), 60), 900);
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  hashed_token := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  expires_at_value := now() + make_interval(secs => ttl);

  update public.order_qr_tokens
  set revoked_at = now()
  where order_id = target_order.id
    and token_type = 'delivery'
    and used_at is null
    and revoked_at is null;

  insert into public.order_qr_tokens (order_id, token_hash, token_type, assigned_rider_id, created_by, expires_at)
  values (target_order.id, hashed_token, 'delivery', target_order.rider_id, null, expires_at_value)
  returning id into token_id;

  return jsonb_build_object(
    'token', raw_token,
    'tokenId', token_id,
    'type', 'delivery',
    'orderId', target_order.id,
    'trackingCode', target_order.tracking_code,
    'expiresAt', expires_at_value,
    'oneTime', true
  );
end;
$$;

drop policy if exists "Senders update own delivery reviews" on public.rider_reviews;
create policy "Senders update own delivery reviews"
on public.rider_reviews for update
to authenticated
using (reviewer_id = auth.uid())
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

grant select, insert, update on public.rider_reviews to authenticated;
revoke all on function public.issue_receiver_delivery_qr_token(text, integer) from public;
grant execute on function public.issue_receiver_delivery_qr_token(text, integer) to anon, authenticated;
