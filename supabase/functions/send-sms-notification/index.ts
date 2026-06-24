import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type SmsRecipient = 'sender' | 'receiver';
type SmsMessageType = 'tracking_link' | 'order_update';

type SmsRequest = {
  orderId?: string;
  recipient?: SmsRecipient;
  messageType?: SmsMessageType;
};

type OrderForSms = {
  id: string;
  tracking_code: string | null;
  sender_phone: string | null;
  receiver_phone: string | null;
  item_description: string | null;
  status: string | null;
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

function normalizePhone(rawPhone: string | null) {
  const raw = (rawPhone || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;

  return '';
}

function buildTrackingUrl(trackingCode: string | null) {
  const origin = (Deno.env.get('PUBLIC_APP_URL') || 'https://droplixmumbai.vercel.app').replace(/\/+$/, '');
  return `${origin}/t/${encodeURIComponent((trackingCode || '').trim().toUpperCase())}`;
}

function buildMessage(order: OrderForSms, recipient: SmsRecipient, messageType: SmsMessageType) {
  const label = order.item_description ? ` (${order.item_description})` : '';

  if (messageType === 'tracking_link' && recipient === 'receiver') {
    return `Hi! Your Droplix parcel${label} is on the way. Track it live, show the receiver QR, and get your delivery OTP here: ${buildTrackingUrl(order.tracking_code)}`;
  }

  if (messageType === 'tracking_link') {
    return `Your Droplix parcel${label} is booked. Track it here: ${buildTrackingUrl(order.tracking_code)}`;
  }

  return `Droplix update: your parcel${label} is now ${order.status || 'updated'}. Track it here: ${buildTrackingUrl(order.tracking_code)}`;
}

async function sendTwilioSms(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || '';
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return {
      ok: false,
      status: 503,
      payload: { error: 'Twilio is not configured on this Supabase function.' },
    };
  }

  const form = new URLSearchParams({
    To: to,
    Body: body.slice(0, 800),
  });

  if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid);
  else form.set('From', fromNumber);

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
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const authorization = req.headers.get('Authorization') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Supabase function environment is missing.' }, 503);
  }

  if (!authorization.startsWith('Bearer ')) {
    return json({ error: 'Authentication required' }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401);

  let body: SmsRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const orderId = body.orderId || '';
  const recipient = body.recipient || 'receiver';
  const messageType = body.messageType || 'tracking_link';

  if (!orderId) return json({ error: 'orderId is required' }, 400);
  if (!['sender', 'receiver'].includes(recipient)) return json({ error: 'Invalid recipient' }, 400);
  if (!['tracking_link', 'order_update'].includes(messageType)) return json({ error: 'Invalid messageType' }, 400);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, tracking_code, sender_phone, receiver_phone, item_description, status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) return json({ error: orderError.message }, 400);
  if (!order) return json({ error: 'Order not found or not allowed' }, 404);

  const targetPhone = recipient === 'receiver' ? order.receiver_phone : order.sender_phone;
  const to = normalizePhone(targetPhone);
  if (!to) return json({ error: `Valid ${recipient} phone number is required` }, 400);

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('sms_delivery_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .eq('order_id', orderId)
    .eq('recipient', recipient)
    .gte('created_at', since);

  if (!countError && (count || 0) >= 3) {
    return json({ error: 'SMS limit reached for this order. Try again later.' }, 429);
  }

  const message = buildMessage(order as OrderForSms, recipient, messageType);
  const result = await sendTwilioSms(to, message);
  const payload = result.payload as { sid?: string; status?: string; message?: string };

  await supabase.from('sms_delivery_logs').insert({
    user_id: userData.user.id,
    order_id: orderId,
    recipient,
    to_phone: to,
    message_type: messageType,
    twilio_sid: payload.sid || null,
    twilio_status: payload.status || null,
    error_message: result.ok ? null : payload.message || 'Twilio send failed',
  });

  if (!result.ok) {
    return json({ error: payload.message || 'Twilio send failed' }, result.status || 502);
  }

  return json({ ok: true, sid: payload.sid, status: payload.status });
});
