import type { Order } from '@/hooks/useOrders';

const KEY = 'droply:order_draft';

export interface OrderDraft {
  pickup_address: string;
  pickup_landmark?: string;
  drop_address: string;
  drop_landmark?: string;
  item_description: string;
  sender_phone: string;
  receiver_phone?: string;
  estimated_distance: number;
}

export function saveOrderDraft(order: Order) {
  if (typeof window === 'undefined') return;
  const draft: OrderDraft = {
    pickup_address: order.pickup_address,
    pickup_landmark: order.pickup_landmark ?? '',
    drop_address: order.drop_address,
    drop_landmark: order.drop_landmark ?? '',
    item_description: order.item_description,
    sender_phone: order.sender_phone,
    receiver_phone: order.receiver_phone ?? '',
    estimated_distance: Number(order.distance_km) || 5,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function consumeOrderDraft(): OrderDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}
