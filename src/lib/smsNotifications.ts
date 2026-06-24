import { supabase } from '@/integrations/supabase/client';

type SmsRecipient = 'sender' | 'receiver';
type SmsMessageType = 'tracking_link' | 'order_update';

export async function sendOrderSms(
  orderId: string,
  recipient: SmsRecipient,
  messageType: SmsMessageType = 'tracking_link',
) {
  const { data, error } = await supabase.functions.invoke('send-sms-notification', {
    body: {
      orderId,
      recipient,
      messageType,
    },
  });

  if (error) throw error;
  return data as { ok: boolean; status?: string; sid?: string };
}
