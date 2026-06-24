import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type OtpRequest = {
  phone?: string;
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

function getClientIp(req: Request) {
  return (
    req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  );
}

function generateOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, '0');
}

async function sendTwilioSms(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || '';

  if (!accountSid || !authToken || !fromNumber) {
    return {
      ok: false,
      status: 503,
      payload: { message: 'Twilio is not configured on this Supabase function.' },
    };
  }

  const form = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
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

  let body: OtpRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: 'Enter a valid phone number.' }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const ipHash = await sha256(`${otpSecret}:ip:${getClientIp(req)}`);

  const [{ count: phoneTenMinuteCount }, { count: phoneHourCount }, { count: ipHourCount }] = await Promise.all([
    supabase
      .from('phone_verification_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('purpose', 'signup')
      .gte('created_at', tenMinutesAgo),
    supabase
      .from('phone_verification_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('purpose', 'signup')
      .gte('created_at', oneHourAgo),
    supabase
      .from('phone_verification_otps')
      .select('id', { count: 'exact', head: true })
      .eq('request_ip_hash', ipHash)
      .gte('created_at', oneHourAgo),
  ]);

  if ((phoneTenMinuteCount || 0) >= 3 || (phoneHourCount || 0) >= 6 || (ipHourCount || 0) >= 20) {
    return json({ error: 'Too many OTP requests. Try again later.' }, 429);
  }

  const code = generateOtp();
  const codeHash = await sha256(`${otpSecret}:signup:${phone}:${code}`);
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();

  const { data: otpRow, error: insertError } = await supabase
    .from('phone_verification_otps')
    .insert({
      phone,
      purpose: 'signup',
      code_hash: codeHash,
      request_ip_hash: ipHash,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertError || !otpRow) return json({ error: insertError?.message || 'Could not create OTP.' }, 500);

  const result = await sendTwilioSms(phone, `Your Droplix signup OTP is ${code}. It expires in 10 minutes. Do not share it.`);
  const payload = result.payload as { sid?: string; status?: string; message?: string };

  await supabase
    .from('phone_verification_otps')
    .update({
      twilio_sid: payload.sid || null,
      twilio_status: payload.status || null,
      error_message: result.ok ? null : payload.message || 'Twilio send failed',
    })
    .eq('id', otpRow.id);

  if (!result.ok) {
    return json({ error: payload.message || 'Could not send OTP.' }, result.status || 502);
  }

  return json({ ok: true, phone, expiresAt });
});
