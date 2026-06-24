import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type VerifyRequest = {
  phone?: string;
  code?: string;
};

type OtpRow = {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(rawPhone: string | null | undefined) {
  const raw = (rawPhone || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return '';
}

async function sha256(value: string) {
  const input = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const otpSecret = Deno.env.get('PHONE_OTP_SECRET') || '';

  if (!supabaseUrl || !serviceRoleKey || !otpSecret) {
    return json({ error: 'OTP service is not configured.' }, 503);
  }

  let body: VerifyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const phone = normalizePhone(body.phone);
  const code = (body.code || '').replace(/\D/g, '').slice(0, 6);

  if (!phone) return json({ error: 'Enter a valid phone number.' }, 400);
  if (!/^\d{6}$/.test(code)) return json({ error: 'Enter the 6-digit OTP.' }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: otpRow, error: otpError } = await supabase
    .from('phone_verification_otps')
    .select('id, phone, code_hash, attempts, expires_at')
    .eq('phone', phone)
    .eq('purpose', 'signup')
    .is('verified_at', null)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError) return json({ error: otpError.message }, 400);
  if (!otpRow) return json({ error: 'OTP expired or not found. Request a new code.' }, 400);

  const row = otpRow as OtpRow;
  if (row.attempts >= 5) return json({ error: 'Too many wrong attempts. Request a new OTP.' }, 429);

  const expectedHash = await sha256(`${otpSecret}:signup:${phone}:${code}`);
  if (expectedHash !== row.code_hash) {
    await supabase
      .from('phone_verification_otps')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);

    return json({ error: 'Wrong OTP. Check the SMS and try again.' }, 400);
  }

  const verificationToken = createToken();
  const tokenHash = await sha256(verificationToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error: tokenError } = await supabase.from('phone_verification_tokens').insert({
    phone,
    purpose: 'signup',
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (tokenError) return json({ error: tokenError.message }, 500);

  await supabase
    .from('phone_verification_otps')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', row.id);

  return json({
    ok: true,
    phone,
    verificationToken,
    expiresAt,
  });
});
