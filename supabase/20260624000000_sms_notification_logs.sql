create table if not exists public.sms_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  recipient text not null check (recipient in ('sender', 'receiver')),
  to_phone text not null,
  message_type text not null check (message_type in ('tracking_link', 'order_update')),
  twilio_sid text,
  twilio_status text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_delivery_logs_user_created
on public.sms_delivery_logs(user_id, created_at desc);

create index if not exists idx_sms_delivery_logs_order_recipient_created
on public.sms_delivery_logs(order_id, recipient, created_at desc);

alter table public.sms_delivery_logs enable row level security;

drop policy if exists "Users can read own SMS logs" on public.sms_delivery_logs;
create policy "Users can read own SMS logs"
on public.sms_delivery_logs for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own SMS logs" on public.sms_delivery_logs;
create policy "Users can insert own SMS logs"
on public.sms_delivery_logs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Admins can manage SMS logs" on public.sms_delivery_logs;
create policy "Admins can manage SMS logs"
on public.sms_delivery_logs for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

grant select, insert on public.sms_delivery_logs to authenticated;
