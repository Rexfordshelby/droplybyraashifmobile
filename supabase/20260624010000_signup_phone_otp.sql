create extension if not exists pgcrypto with schema extensions;

create or replace function public.normalize_phone_e164(_phone text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select
      btrim(coalesce(_phone, '')) as raw_value,
      regexp_replace(coalesce(_phone, ''), '\D', '', 'g') as digits
  )
  select case
    when digits = '' then null
    when raw_value like '+%' and length(digits) between 10 and 15 then '+' || digits
    when length(digits) = 10 then '+91' || digits
    when length(digits) between 11 and 15 then '+' || digits
    else null
  end
  from cleaned;
$$;

alter table public.profiles
add column if not exists phone_verified_at timestamptz;

create table if not exists public.phone_verification_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  purpose text not null default 'signup' check (purpose in ('signup')),
  code_hash text not null,
  request_ip_hash text,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  twilio_sid text,
  twilio_status text,
  error_message text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);

create index if not exists idx_phone_verification_otps_phone_created
on public.phone_verification_otps(phone, created_at desc);

create index if not exists idx_phone_verification_otps_ip_created
on public.phone_verification_otps(request_ip_hash, created_at desc)
where request_ip_hash is not null;

create table if not exists public.phone_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  purpose text not null default 'signup' check (purpose in ('signup')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_verification_tokens_phone_created
on public.phone_verification_tokens(phone, created_at desc);

alter table public.phone_verification_otps enable row level security;
alter table public.phone_verification_tokens enable row level security;

revoke all on public.phone_verification_otps from anon, authenticated;
revoke all on public.phone_verification_tokens from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on public.phone_verification_otps to service_role;
    grant select, insert, update, delete on public.phone_verification_tokens to service_role;
  end if;
end $$;

create or replace function public.consume_signup_phone_verification(_phone text, _token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_phone text := public.normalize_phone_e164(_phone);
  hashed_token text := encode(extensions.digest(btrim(coalesce(_token, '')), 'sha256'), 'hex');
  consumed_id uuid;
begin
  if normalized_phone is null or btrim(coalesce(_token, '')) = '' then
    return false;
  end if;

  update public.phone_verification_tokens
  set consumed_at = now()
  where id = (
    select id
    from public.phone_verification_tokens
    where phone = normalized_phone
      and purpose = 'signup'
      and token_hash = hashed_token
      and consumed_at is null
      and expires_at > now()
    order by created_at desc
    limit 1
    for update skip locked
  )
  returning id into consumed_id;

  if consumed_id is null then
    return false;
  end if;

  update public.phone_verification_otps
  set consumed_at = now()
  where phone = normalized_phone
    and purpose = 'signup'
    and verified_at is not null
    and consumed_at is null;

  return true;
end;
$$;

revoke all on function public.consume_signup_phone_verification(text, text) from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  submitted_phone text := public.normalize_phone_e164(new.raw_user_meta_data ->> 'phone');
  verification_token text := new.raw_user_meta_data ->> 'phone_verification_token';
  verified_phone text := null;
begin
  if submitted_phone is not null
     and verification_token is not null
     and public.consume_signup_phone_verification(submitted_phone, verification_token) then
    verified_phone := submitted_phone;
  end if;

  insert into public.profiles (id, email, full_name, phone, phone_verified_at, is_guest, guest_expires_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', case when new.email is null then 'Guest User' else 'User' end),
    verified_phone,
    case when verified_phone is not null then now() else null end,
    new.email is null,
    case when new.email is null then now() + interval '24 hours' else null end
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(public.profiles.phone, excluded.phone),
    phone_verified_at = coalesce(public.profiles.phone_verified_at, excluded.phone_verified_at),
    updated_at = now();

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
