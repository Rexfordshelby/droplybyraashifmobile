const KEY = 'droply:order_memory';
const MAX_ITEMS = 5;

export interface OrderMemory {
  pickupAddresses: string[];
  dropAddresses: string[];
  senderPhones: string[];
  receiverPhones: string[];
  updatedAt: string | null;
}

export interface RememberOrderInput {
  pickup_address: string;
  drop_address: string;
  sender_phone: string;
  receiver_phone?: string | null;
}

const emptyMemory = (): OrderMemory => ({
  pickupAddresses: [],
  dropAddresses: [],
  senderPhones: [],
  receiverPhones: [],
  updatedAt: null,
});

function pushUnique(values: string[], value?: string | null) {
  const clean = value?.trim();
  if (!clean) return values.slice(0, MAX_ITEMS);

  return [clean, ...values.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_ITEMS);
}

export function readOrderMemory(): OrderMemory {
  if (typeof window === 'undefined') return emptyMemory();

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyMemory();

    const parsed = JSON.parse(raw) as Partial<OrderMemory>;
    return {
      pickupAddresses: Array.isArray(parsed.pickupAddresses) ? parsed.pickupAddresses.slice(0, MAX_ITEMS) : [],
      dropAddresses: Array.isArray(parsed.dropAddresses) ? parsed.dropAddresses.slice(0, MAX_ITEMS) : [],
      senderPhones: Array.isArray(parsed.senderPhones) ? parsed.senderPhones.slice(0, MAX_ITEMS) : [],
      receiverPhones: Array.isArray(parsed.receiverPhones) ? parsed.receiverPhones.slice(0, MAX_ITEMS) : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return emptyMemory();
  }
}

export function rememberOrderDetails(input: RememberOrderInput) {
  if (typeof window === 'undefined') return;

  const current = readOrderMemory();
  const next: OrderMemory = {
    pickupAddresses: pushUnique(current.pickupAddresses, input.pickup_address),
    dropAddresses: pushUnique(current.dropAddresses, input.drop_address),
    senderPhones: pushUnique(current.senderPhones, input.sender_phone),
    receiverPhones: pushUnique(current.receiverPhones, input.receiver_phone),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
