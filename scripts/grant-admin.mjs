import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pgModuleRoot = process.env.PG_MODULE_ROOT;
const password = process.env.SUPABASE_DB_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL;

if (!pgModuleRoot) throw new Error('PG_MODULE_ROOT is required.');
if (!password) throw new Error('SUPABASE_DB_PASSWORD is required.');
if (!adminEmail) throw new Error('ADMIN_EMAIL is required.');

const { Client } = require(path.join(pgModuleRoot, 'pg'));

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.uslmtfaeflvzcmzvratg.supabase.co',
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

await client.connect();

try {
  const result = await client.query(
    `
      with target_user as (
        select id, email
        from auth.users
        where lower(email) = lower($1)
        limit 1
      ),
      profile_upsert as (
        insert into public.profiles (id, email, full_name, is_guest)
        select id, email, coalesce(nullif(split_part(email, '@', 1), ''), 'Admin'), false
        from target_user
        on conflict (id) do update
        set email = excluded.email,
            is_guest = false,
            updated_at = now()
        returning id
      ),
      admin_role as (
        insert into public.user_roles (user_id, role)
        select id, 'admin'::public.app_role
        from target_user
        on conflict (user_id, role) do nothing
        returning user_id
      ),
      sender_role as (
        insert into public.user_roles (user_id, role)
        select id, 'sender'::public.app_role
        from target_user
        on conflict (user_id, role) do nothing
        returning user_id
      ),
      promos as (
        insert into public.user_promos (user_id, free_deliveries_remaining)
        select id, 2
        from target_user
        on conflict (user_id) do nothing
        returning user_id
      )
      select
        target_user.id,
        target_user.email,
        exists (
          select 1
          from public.user_roles
          where user_id = target_user.id
            and role = 'admin'
        ) as is_admin
      from target_user
    `,
    [adminEmail],
  );

  if (result.rowCount === 0) {
    console.log(JSON.stringify({
      ok: false,
      reason: 'user_not_found',
      email: adminEmail,
      nextSql: `insert into public.user_roles (user_id, role) select id, 'admin'::public.app_role from auth.users where lower(email) = lower('${adminEmail.replaceAll("'", "''")}') on conflict (user_id, role) do nothing;`,
    }, null, 2));
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify({ ok: true, admin: result.rows[0] }, null, 2));
  }
} finally {
  await client.end();
}
