import QRCode from 'qrcode';
import type { Order } from '@/hooks/useOrders';

export type DroplixQrType = 'pickup' | 'delivery' | 'receipt';

export type IssuedOrderQrToken = {
  token: string;
  tokenId?: string;
  expiresAt?: string;
};

export type DroplixQrPayload = {
  app: 'droplix';
  version: 1;
  type: DroplixQrType;
  orderId: string;
  trackingCode?: string;
  token?: string;
  tokenId?: string;
  otp?: string | null;
  amount?: number;
  status?: string;
  expiresAt?: string;
  issuedAt: string;
};

export type ParsedOrderQrPayload = Partial<DroplixQrPayload> & {
  order_id?: string;
  tracking_code?: string;
  qrToken?: string;
};

const qrOptions = {
  errorCorrectionLevel: 'Q' as const,
  margin: 2,
  width: 640,
  color: {
    dark: '#111827',
    light: '#ffffff',
  },
};

export function getOrderDisplayCode(order: Order) {
  return order.tracking_code || order.id.slice(0, 8).toUpperCase();
}

export function buildOrderQrPayload(
  order: Order,
  type: DroplixQrType,
  issuedToken?: IssuedOrderQrToken,
): DroplixQrPayload {
  const basePayload: DroplixQrPayload = {
    app: 'droplix',
    version: 1,
    type,
    orderId: order.id,
    trackingCode: order.tracking_code || undefined,
    token: issuedToken?.token,
    tokenId: issuedToken?.tokenId,
    expiresAt: issuedToken?.expiresAt,
    issuedAt: new Date().toISOString(),
  };

  if (type === 'receipt') {
    return {
      ...basePayload,
      amount: Number(order.sender_paid_amount ?? order.price_offered ?? 0),
      status: order.status,
    };
  }

  return basePayload;
}

export function stringifyOrderQrPayload(
  order: Order,
  type: DroplixQrType,
  issuedToken?: IssuedOrderQrToken,
) {
  return JSON.stringify(buildOrderQrPayload(order, type, issuedToken));
}

export function getQrFileName(order: Order, type: DroplixQrType) {
  return `droplix-${getOrderDisplayCode(order).toLowerCase()}-${type}-qr.png`;
}

export async function createQrDataUrlFromText(value: string) {
  return QRCode.toDataURL(value, qrOptions);
}

export async function createOrderQrDataUrl(
  order: Order,
  type: DroplixQrType,
  issuedToken?: IssuedOrderQrToken,
) {
  return createQrDataUrlFromText(stringifyOrderQrPayload(order, type, issuedToken));
}

export function parseOrderQrPayload(raw: string): ParsedOrderQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as ParsedOrderQrPayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function extractOneTimeQrToken(raw: string) {
  const value = raw.trim();
  if (!value) return '';

  const parsed = parseOrderQrPayload(value);
  const token = parsed?.token || parsed?.qrToken;
  if (typeof token === 'string' && token.trim()) return token.trim();

  return /^[a-zA-Z0-9_-]{32,}$/.test(value) ? value : '';
}

export function extractDeliveryOtp(raw: string) {
  const value = raw.trim();
  if (!value) return '';

  const parsed = parseOrderQrPayload(value);
  const otp = parsed?.otp;
  if (typeof otp === 'string' && /^\d{4}$/.test(otp)) return otp;

  return /^\d{4}$/.test(value) ? value : '';
}
