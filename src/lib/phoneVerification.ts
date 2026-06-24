import { supabase } from '@/integrations/supabase/client';

export type RequestSignupOtpResult = {
  ok: boolean;
  phone: string;
  expiresAt: string;
};

export type VerifySignupOtpResult = {
  ok: boolean;
  phone: string;
  verificationToken: string;
  expiresAt: string;
};

export async function requestSignupPhoneOtp(phone: string) {
  const { data, error } = await supabase.functions.invoke('request-signup-phone-otp', {
    body: { phone },
  });

  if (error) throw error;
  return data as RequestSignupOtpResult;
}

export async function verifySignupPhoneOtp(phone: string, code: string) {
  const { data, error } = await supabase.functions.invoke('verify-signup-phone-otp', {
    body: { phone, code },
  });

  if (error) throw error;
  return data as VerifySignupOtpResult;
}
