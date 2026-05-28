import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pgModuleRoot = process.env.PG_MODULE_ROOT;

if (!pgModuleRoot) {
  throw new Error('PG_MODULE_ROOT is required and should point to a node_modules folder containing pg.');
}

const { Client } = require(path.join(pgModuleRoot, 'pg'));

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  throw new Error('SUPABASE_DB_PASSWORD is required.');
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sqlPath = path.join(projectRoot, 'supabase', 'droplix_full_schema.sql');
const schemaSql = await readFile(sqlPath, 'utf8');

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.uslmtfaeflvzcmzvratg.supabase.co',
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const withLineContext = (error) => {
  if (!error?.position) return '';
  const position = Number(error.position);
  if (!Number.isFinite(position)) return '';
  const before = schemaSql.slice(0, Math.max(position - 1, 0));
  const line = before.split(/\r?\n/).length;
  const lines = schemaSql.split(/\r?\n/);
  const start = Math.max(line - 3, 0);
  const end = Math.min(line + 2, lines.length);
  const context = lines
    .slice(start, end)
    .map((text, index) => `${start + index + 1}: ${text}`)
    .join('\n');
  return `\nSQL position ${position}, around line ${line}:\n${context}`;
};

try {
  await client.connect();
  await client.query("set statement_timeout = '60s'");
  await client.query(schemaSql);

  const checks = {};

  checks.tables = (await client.query(`
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in ('profiles', 'user_roles', 'user_promos', 'riders', 'service_zones', 'orders', 'order_qr_tokens', 'notifications')
    order by tablename
  `)).rows.map((row) => row.tablename);

  checks.functions = (await client.query(`
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'has_role',
        'current_rider_id',
        'get_public_order',
        'generate_tracking_code',
        'set_tracking_code',
        'consume_free_delivery',
        'refund_free_delivery',
        'enforce_order_promos',
        'enforce_rider_operational_rules',
        'apply_order_defaults_and_flow',
        'issue_order_qr_token',
        'consume_order_qr_token',
        'verify_delivery_otp'
      )
    order by p.proname
  `)).rows.map((row) => row.proname);

  checks.rls = (await client.query(`
    select relname, relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and relname in ('profiles', 'user_roles', 'user_promos', 'riders', 'service_zones', 'orders', 'order_qr_tokens', 'notifications')
    order by relname
  `)).rows;

  checks.policyCount = Number((await client.query(`
    select count(*)::int as count
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'user_roles', 'user_promos', 'riders', 'service_zones', 'orders', 'order_qr_tokens', 'notifications')
  `)).rows[0].count);

  checks.orderTriggers = (await client.query(`
    select trigger_name
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'orders'
    order by trigger_name
  `)).rows.map((row) => row.trigger_name);

  checks.riderTriggers = (await client.query(`
    select trigger_name
    from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table = 'riders'
    order by trigger_name
  `)).rows.map((row) => row.trigger_name);

  checks.safetyConstraints = (await client.query(`
    select conname
    from pg_constraint
    where conname in (
      'orders_sender_phone_digits',
      'orders_receiver_phone_digits',
      'orders_tracking_code_format',
      'riders_online_requires_approval'
    )
    order by conname
  `)).rows.map((row) => row.conname);

  checks.serviceZoneCount = Number((await client.query(`
    select count(*)::int as count
    from public.service_zones
    where is_active = true
  `)).rows[0].count);

  checks.storageBucket = (await client.query(`
    select id, public
    from storage.buckets
    where id = 'order-photos'
  `)).rows[0] ?? null;

  checks.trackingCodeSample = (await client.query('select public.generate_tracking_code() as code')).rows[0].code;
  checks.publicRpcInstalled = (await client.query(`
    select public.get_public_order('NOTREAL') is null as returns_null_for_missing_order
  `)).rows[0].returns_null_for_missing_order;

  const testUserId = '00000000-0000-4000-8000-000000000101';
  await client.query('begin');
  try {
    await client.query(
      `
        insert into auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        )
        values (
          '00000000-0000-0000-0000-000000000000',
          $1,
          'authenticated',
          'authenticated',
          'codex-db-check@droplix.local',
          '',
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"full_name":"Codex DB Check"}'::jsonb,
          now(),
          now()
        )
        on conflict (id) do nothing
      `,
      [testUserId],
    );
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [testUserId]);
    await client.query('set local role authenticated');
    const insertCheck = await client.query(
      `
        insert into public.orders (
          sender_id,
          pickup_address,
          drop_address,
          item_description,
          sender_phone,
          receiver_phone,
          price_offered,
          suggested_price,
          distance_km,
          is_promo_free,
          payment_method
        )
        values (
          $1,
          'Shop 12, Andheri West, Mumbai',
          'Flat 301, Bandra West, Mumbai',
          'Small parcel',
          '9876543210',
          '9876500000',
          75,
          75,
          5,
          false,
          'cash'
        )
        returning id, status, tracking_code, sender_paid_amount, platform_paid_amount
      `,
      [testUserId],
    );
    checks.authenticatedOrderInsert = {
      status: insertCheck.rows[0].status,
      hasTrackingCode: /^[A-Z2-9]{8}$/.test(insertCheck.rows[0].tracking_code),
      senderPaidAmount: Number(insertCheck.rows[0].sender_paid_amount),
      platformPaidAmount: Number(insertCheck.rows[0].platform_paid_amount),
    };
  } finally {
    await client.query('rollback');
  }

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    code: error.code,
    message: error.message,
    detail: error.detail,
    hint: error.hint,
    context: withLineContext(error),
  }, null, 2));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
