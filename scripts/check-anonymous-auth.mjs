import path from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data, error } = await supabase.auth.signInAnonymously();

if (error) {
  console.log(JSON.stringify({
    anonymousSignIn: false,
    message: error.message,
  }, null, 2));
  process.exit(0);
}

let cleanedUp = false;

if (data.user?.id && process.env.PG_MODULE_ROOT && process.env.SUPABASE_DB_PASSWORD) {
  const require = createRequire(import.meta.url);
  const { Client } = require(path.join(process.env.PG_MODULE_ROOT, 'pg'));
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST || 'db.uslmtfaeflvzcmzvratg.supabase.co',
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query('delete from auth.users where id = $1', [data.user.id]);
  await client.end();
  cleanedUp = true;
}

console.log(JSON.stringify({
  anonymousSignIn: true,
  createdUser: Boolean(data.user?.id),
  cleanedUp,
}, null, 2));
