# Droplix Auth and SMS Setup

## Google Sign-In

The frontend now supports Google sign-in through Supabase OAuth. No Google client secret is stored in the app.

In Supabase:

1. Open Authentication > Sign In / Providers.
2. Enable Google.
3. Add your Google OAuth Client ID and Client Secret.
4. In Authentication > URL Configuration, keep the site URL as:
   `https://droplixmumbai.vercel.app`
5. Add redirect URLs:
   `https://droplixmumbai.vercel.app/**`
   `http://localhost:*/**`

In Google Cloud Console, the OAuth redirect URI should be the Supabase callback URL:

`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## Twilio SMS

Twilio credentials must stay server-side. Do not put Twilio SID, auth token, or secrets in any `VITE_` variable.

The app calls the Supabase Edge Function:

`send-sms-notification`

The function:

- Requires a logged-in Supabase user.
- Reads the order through normal Supabase RLS.
- Sends only sender/receiver order messages.
- Normalizes 10-digit India numbers to `+91`.
- Limits each user to 3 SMS sends per order recipient per hour.
- Logs delivery attempts in `public.sms_delivery_logs`.

Signup phone verification uses two additional public Edge Functions:

- `request-signup-phone-otp`
- `verify-signup-phone-otp`

These functions send a 6-digit OTP through Twilio before email/password account creation. OTPs are stored only as hashes, expire after 10 minutes, and the verified signup token is one-time use.

Apply the SMS log migration:

```bash
supabase db push
```

Set Supabase Edge Function secrets:

```bash
supabase secrets set PUBLIC_APP_URL="https://droplixmumbai.vercel.app"
supabase secrets set TWILIO_ACCOUNT_SID="<your Twilio account SID>"
supabase secrets set TWILIO_AUTH_TOKEN="<your Twilio auth token>"
supabase secrets set TWILIO_FROM_NUMBER="<your Twilio phone number in E.164 format>"
supabase secrets set PHONE_OTP_SECRET="<long random OTP hashing secret>"
```

If you use a Twilio Messaging Service, set this instead of or in addition to `TWILIO_FROM_NUMBER`:

```bash
supabase secrets set TWILIO_MESSAGING_SERVICE_SID="<your messaging service SID>"
```

Deploy the function:

```bash
supabase functions deploy send-sms-notification
supabase functions deploy request-signup-phone-otp
supabase functions deploy verify-signup-phone-otp
```

After deployment:

- Signup requires phone OTP verification before account creation.
- The sender order card shows an SMS button next to WhatsApp, Copy, and Share.
