-- Final Droplix Supabase setup and security hardening.
-- Safe to run more than once.

create extension if not exists pgcrypto;

insert into public.profiles (id, email, full_name, is_guest)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Admin'),
  false
from auth.users u
where lower(u.email) = lower('raashifshaikh70@gmail.com')
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    is_guest = false;

insert into public.user_roles (user_id, role)
select u.id, roles.role::public.app_role
from auth.users u
cross join (values ('sender'), ('admin')) as roles(role)
where lower(u.email) = lower('raashifshaikh70@gmail.com')
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select r.user_id, 'rider'::public.app_role
from public.riders r
where r.user_id is not null
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select p.id, 'sender'::public.app_role
from public.profiles p
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_id = p.id
)
on conflict (user_id, role) do nothing;

alter table public.orders enable row level security;
alter table public.order_qr_tokens enable row level security;
alter table public.rider_reviews enable row level security;
alter table public.favorite_riders enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "Public can view orders by tracking code" on public.orders;
drop policy if exists "Riders can view assigned orders" on public.orders;
drop policy if exists "Riders can view available orders" on public.orders;
drop policy if exists "Senders can view own orders" on public.orders;
drop policy if exists "Senders can create orders" on public.orders;
drop policy if exists "Riders can accept pending orders" on public.orders;
drop policy if exists "Riders can update assigned orders" on public.orders;
drop policy if exists "Admins can manage orders" on public.orders;

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

insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do update
set public = true;

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

revoke all on table public.orders from anon;
revoke all on table public.order_qr_tokens from anon;
revoke all on table public.order_qr_tokens from public;

grant select, insert, update on public.orders to authenticated;
grant select on public.order_qr_tokens to authenticated;
grant select, insert, update on public.rider_reviews to authenticated;
grant select, insert, update, delete on public.favorite_riders to authenticated;
grant select, insert, update on public.support_requests to authenticated;

revoke all on function public.issue_order_qr_token(uuid, text, integer) from public, anon;
revoke all on function public.consume_order_qr_token(text, text, uuid) from public, anon;
grant execute on function public.issue_order_qr_token(uuid, text, integer) to authenticated;
grant execute on function public.consume_order_qr_token(text, text, uuid) to authenticated;
grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;
grant execute on function public.get_rider_trust_profile(uuid) to authenticated;
grant execute on function public.get_public_order(text) to anon, authenticated;
