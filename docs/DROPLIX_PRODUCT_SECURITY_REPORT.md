# Droplix Product and Security Report

Date: 2026-06-15  
Production domain: https://droplixmumbai.vercel.app/  
Scope: P2P, B2P, B2B parcel delivery for Mumbai

## Executive Summary

Droplix is positioned around trust: locked fares, secure handover, rider verification, proof trails, parcel protection tiers, and admin-controlled operations. This pass adds a stronger store/business system, person-based free-delivery enforcement, admin visibility, and a responsive QA checklist for release.

## Feature Inventory

- Sender booking: pickup/drop address, category, declared value, fragile flag, delivery priority, protection tier, schedule, trusted rider preference, notes, and cash settlement instructions.
- Rider dashboard: eligible pending orders, acceptance flow, pickup verification, delivery verification, cancellation guardrails, status updates, earnings view, and rider profile signals.
- Receiver tracking: public tracking page, delivery timeline, receiver OTP/QR handover, retry/error states, and shareable tracking links on the production domain.
- Secure QR/OTP: one-time hashed pickup/delivery QR tokens, expiry, attempt limits, OTP lockouts, and public-code rejection for pickup.
- Receipts: sender/receiver/order metadata, fare, protection tier, timeline, QR/OTP state, and printable/downloadable receipt support.
- Reviews and trust: rider reliability metrics, delivery safety questions, review tags, proof/photo signals, and admin-visible incident context.
- Notifications: in-app notifications, Android local notifications, order updates, rider assignment, pickup, in-transit, delivered, and issue alerts.
- Free credits: first two free deliveries limited by authenticated account and normalized 10-digit sender phone.
- Store/business delivery: public store landing page, store application, authenticated business dashboard, B2P/B2B modes, bulk delivery batches, order history, support priority, and admin approval.
- Admin panel: rider approvals, order command center, service zones, support issues, store approvals, inquiries, and Platform Health.
- Support: visible contact email, issue queues, WhatsApp/call support messaging hooks, and cancellation/support records.
- Protection tiers: Basic, Protected, and Premium Protected flows for trust-led parcel sending.

## Delivery Modes

- P2P: person-to-person sender flow, free-credit eligibility, public receiver tracking, and standard rider assignment.
- B2P: approved store to customer delivery with store account attached to every order.
- B2B: approved store to business/office delivery, batch-friendly order channel, and invoice-ready history.

## Backend Security Controls

- Supabase RLS remains the primary boundary for orders, riders, stores, inquiries, memberships, delivery batches, and free-delivery claims.
- Admin-only operations are enforced through database functions and policies for approving riders, stores, service zones, and sensitive order updates.
- QR tokens are stored hashed, expire, and are consumed once. Public tracking codes cannot verify pickup.
- OTP attempts are locked after repeated failures to reduce brute-force handover abuse.
- Free delivery claims are recorded in `free_delivery_claims` and checked by both `user_id` and normalized sender phone.
- Business orders require an approved `business_account_id` and a member relationship unless the actor is an admin.
- Frontend uses only publishable Supabase keys. Service-role keys and database passwords must never be committed or shipped in the app.

## New Database Objects

Migration: `supabase/20260615000000_business_promos_security.sql`

- `free_delivery_claims`
- `business_accounts`
- `business_members`
- `business_inquiries`
- `business_delivery_batches`
- `normalize_phone_10(text)`
- `get_free_delivery_eligibility(text)`
- `consume_free_delivery(uuid, text, uuid)`
- `refund_free_delivery(uuid, text, uuid)`
- business membership helpers and status guards

Orders now support:

- `business_account_id`
- `business_batch_id`
- `order_channel`: `p2p`, `b2p`, or `b2b`

## Free Delivery Rules

- A signed-in account can claim at most 2 free deliveries.
- A normalized sender phone can claim at most 2 free deliveries across all accounts.
- Free orders require a valid 10-digit sender phone.
- A free credit is automatically refunded only if the order is cancelled before rider acceptance.
- Admins can audit and adjust claims through database access if a support exception requires it.

## Store System Flow

1. A public visitor opens `/business` and submits `/business/apply`.
2. A logged-in store owner creates a store profile in `/business/dashboard`.
3. Admin reviews the store in Admin > Stores.
4. Admin approves the store; the owner is added as a business member.
5. The store can create B2P/B2B orders from the send flow.
6. Orders include business account, optional batch, and order channel metadata.
7. Admin can suspend the store to stop new business bookings.

## Responsive QA Matrix

Viewport sizes required for every release:

| Size | Device class | Required checks |
| --- | --- | --- |
| 360x740 | small Android | No horizontal overflow, bottom nav visible, dialogs fit |
| 430x932 | large phone | Send flow, QR modal, scanner modal, profile/store panels |
| 768x1024 | tablet portrait | Admin/store dashboards readable, no cramped tables |
| 1024x768 | tablet landscape | Tabs, tables, modals, route cards, and dashboard grids |
| 1440x900 | desktop | Dense admin/store views, SEO pages, receipts, and rider flow |

Routes/components to verify:

- `/`
- `/auth`
- `/send`
- `/dashboard`
- `/rider`
- `/admin`
- `/profile`
- `/notifications`
- `/receipt/:id`
- `/track/:id`
- `/t/:code`
- `/business`
- `/business/apply`
- `/business/dashboard`
- QR modals
- scanner modal
- receipt/download views

## Backend Test Scenarios

- First two free orders for the same account and sender phone succeed.
- Third free order for the same account fails.
- Third free order using the same phone from another account fails.
- Paid orders still work after free credits are exhausted.
- Cancellation before rider acceptance refunds the free credit.
- Cancellation after rider acceptance does not auto-refund.
- Non-admin users cannot approve stores/riders or read unrelated business data.
- Approved stores can create B2P and B2B orders.
- Unapproved stores cannot create business orders.
- Rider dashboard receives eligible pending orders.
- Pickup QR and delivery QR remain one-time only.
- Admin navigation stays hidden for normal users.

## Release Verification Commands

```bash
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

## Known Follow-Ups

- Add payment gateway and automated settlement before replacing cash/manual settlement.
- Add formal refund/claims workflow for protected parcels.
- Add richer business invoices once GST/payment details are finalized.
- Add server-side edge functions for push notification fan-out if Android notifications need remote delivery at scale.
- Add Play Store release signing and privacy/data-safety documentation before production Play Store submission.
