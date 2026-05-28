import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { extractDeliveryOtp, extractOneTimeQrToken } from '@/lib/qrPayload';

type SupabaseErrorLike = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

export type OrderStatus = 'pending' | 'accepted' | 'picked' | 'in_transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  sender_id: string | null;
  rider_id: string | null;
  pickup_address: string;
  pickup_landmark: string | null;
  drop_address: string;
  drop_landmark: string | null;
  item_description: string;
  item_photo_url: string | null;
  sender_phone: string;
  receiver_phone: string | null;
  price_offered: number;
  suggested_price: number | null;
  distance_km: number | null;
  status: OrderStatus;
  payment_method: string;
  delivery_proof_url: string | null;
  delivery_otp: string | null;
  picked_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  is_promo_free: boolean;
  platform_paid_amount: number;
  sender_paid_amount: number;
  tracking_code: string;
}

export interface RiderInfo {
  id: string;
  user_id: string;
  vehicle_type: string;
  is_online: boolean;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
}

export const ORDER_SELECT = `
  id,
  sender_id,
  rider_id,
  pickup_address,
  pickup_landmark,
  drop_address,
  drop_landmark,
  item_description,
  item_photo_url,
  sender_phone,
  receiver_phone,
  price_offered,
  suggested_price,
  distance_km,
  status,
  payment_method,
  delivery_proof_url,
  picked_at,
  delivered_at,
  cancelled_at,
  cancellation_reason,
  created_at,
  updated_at,
  is_promo_free,
  platform_paid_amount,
  sender_paid_amount,
  tracking_code
`;

type OrderWithoutOtp = Omit<Order, 'delivery_otp'>;

export function normalizeOrder(order: OrderWithoutOtp | Order): Order {
  return {
    ...order,
    delivery_otp: null,
  } as Order;
}

export function normalizeOrders(data: unknown): Order[] {
  return ((data as OrderWithoutOtp[] | null) || []).map(normalizeOrder);
}

const describeCreateOrderError = (error: SupabaseErrorLike) => {
  const combined = [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (combined.includes('no free deliveries remaining')) {
    return {
      title: 'No free deliveries left',
      description: 'You have used all your free deliveries. Set a fair cash price to continue.',
    };
  }

  if (
    combined.includes('relation') ||
    combined.includes('schema cache') ||
    combined.includes('could not find') ||
    combined.includes('row-level security') ||
    combined.includes('permission denied') ||
    combined.includes('orders')
  ) {
    return {
      title: 'Supabase setup needed',
      description: 'Run supabase/droplix_full_schema.sql in your Supabase SQL Editor, then refresh Droplix.',
    };
  }

  if (combined.includes('jwt') || combined.includes('api key')) {
    return {
      title: 'Supabase key rejected',
      description: 'Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.',
    };
  }

  return {
    title: 'Could not create order',
    description: error.message || 'Please try again in a moment.',
  };
};

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const riderIdRef = useRef<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    if (hasRole('admin')) {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching orders:', error);
      else setOrders(normalizeOrders(data));
      setLoading(false);
      return;
    }

    // Resolve rider id (if any) so a user who is BOTH sender and rider sees both buckets.
    if (hasRole('rider') && !riderIdRef.current) {
      const { data: riderData } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      riderIdRef.current = riderData?.id || null;
    }

    // Build a single OR query covering: my own sent orders + (if rider) pending + assigned-to-me orders.
    const orParts: string[] = [`sender_id.eq.${user.id}`];
    if (hasRole('rider')) {
      orParts.push('status.eq.pending');
      if (riderIdRef.current) orParts.push(`rider_id.eq.${riderIdRef.current}`);
    }

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .or(orParts.join(','))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      // De-dupe by id (sender_id and rider_id branches can overlap for self-deliveries)
      const seen = new Set<string>();
      const deduped = normalizeOrders(data).filter(o => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
      setOrders(deduped);
    }

    setLoading(false);
  }, [user, hasRole]);

  /**
   * Compress an image client-side and upload to the `order-photos` bucket.
   * Returns the public URL or null on failure.
   */
  const uploadOrderPhoto = async (file: File, orderId: string): Promise<string | null> => {
    if (!user) return null;
    try {
      // Compress to ≤1280px JPEG ~0.8 quality
      const compressed = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = () => {
            const maxDim = 1280;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('canvas'));
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.8);
          };
          img.onerror = () => reject(new Error('img'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('reader'));
        reader.readAsDataURL(file);
      });

      const path = `${user.id}/${orderId}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('order-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
      if (upErr) {
        console.error('photo upload error', upErr);
        return null;
      }
      const { data: pub } = supabase.storage.from('order-photos').getPublicUrl(path);
      return pub.publicUrl;
    } catch (e) {
      console.error('photo compress error', e);
      return null;
    }
  };

  const uploadDeliveryProof = async (orderId: string, file: File): Promise<boolean> => {
    if (!user) return false;

    const url = await uploadOrderPhoto(file, `proof-${orderId}-${Date.now()}`);
    if (!url) {
      toast({
        title: 'Proof upload failed',
        description: 'Could not upload the delivery proof photo. Try again.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('orders')
      .update({ delivery_proof_url: url })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Proof not saved',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Proof added',
      description: 'Delivery proof photo is attached to this order.',
    });

    return true;
  };

  const createOrder = async (orderData: {
    pickup_address: string;
    pickup_landmark?: string;
    drop_address: string;
    drop_landmark?: string;
    item_description: string;
    sender_phone: string;
    receiver_phone?: string;
    price_offered: number;
    suggested_price?: number;
    distance_km?: number;
    is_promo_free?: boolean;
    item_photo?: File | null;
  }) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in or continue as guest before sending a parcel.',
        variant: 'destructive',
      });
      return null;
    }

    const isPromoFree = !!orderData.is_promo_free;
    const platformPaid = isPromoFree ? orderData.price_offered : 0;
    const senderPaid = isPromoFree ? 0 : orderData.price_offered;

    const { item_photo, ...insertData } = orderData;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...insertData,
        sender_id: user.id,
        is_promo_free: isPromoFree,
        payment_method: 'cash',
        platform_paid_amount: platformPaid,
        sender_paid_amount: senderPaid,
        // Trigger `set_tracking_code` will replace this with a unique 8-char code.
        tracking_code: '',
      })
      .select(ORDER_SELECT)
      .single();

    if (error) {
      console.error('Create order error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const orderError = describeCreateOrderError(error);
      toast({
        title: orderError.title,
        description: orderError.description,
        variant: 'destructive',
      });
      return null;
    }

    // Best-effort photo upload after order is created
    const createdOrder = data ? normalizeOrder(data as OrderWithoutOtp) : null;

    if (item_photo && createdOrder?.id) {
      const url = await uploadOrderPhoto(item_photo, createdOrder.id);
      if (url) {
        await supabase.from('orders').update({ item_photo_url: url }).eq('id', createdOrder.id);
        createdOrder.item_photo_url = url;
      }
    }

    toast({
      title: isPromoFree ? '🎁 Free Order Placed!' : 'Order Created! 🎉',
      description: isPromoFree
        ? 'This delivery is on us. Riders will see it instantly!'
        : 'Your parcel request is now live. Riders will see it instantly!',
    });

    return createdOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, additionalData?: Partial<Order>) => {
    const updateData: Partial<Order> = { status, ...additionalData };

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
      return false;
    }

    const statusMessages: Record<OrderStatus, string> = {
      pending: 'Order is now pending',
      accepted: 'Order accepted!',
      picked: 'Parcel picked up successfully!',
      in_transit: 'Parcel is on the way!',
      delivered: 'Delivery completed! 🎉',
      cancelled: 'Order has been cancelled',
    };

    toast({
      title: 'Status Updated',
      description: statusMessages[status],
    });

    return true;
  };

  const verifyPickupQrToken = async (orderId: string, rawCode: string): Promise<boolean> => {
    const token = extractOneTimeQrToken(rawCode);
    if (!token) {
      toast({
        title: 'Secure QR required',
        description: 'Ask the sender to show the latest one-time pickup QR.',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase.rpc('consume_order_qr_token', {
      _token: token,
      _token_type: 'pickup',
      _order_id: orderId,
    });

    if (error) {
      toast({
        title: 'Pickup not verified',
        description: error.message || 'This QR may be expired, already used, or assigned to another rider.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Pickup secured',
      description: 'The one-time QR was consumed and the order was marked picked up.',
    });
    await fetchOrders();
    return true;
  };

  const verifyDeliveryOtp = async (orderId: string, rawCode: string): Promise<boolean> => {
    const token = extractOneTimeQrToken(rawCode);
    const otp = extractDeliveryOtp(rawCode);

    if (token) {
      const { data, error } = await supabase.rpc('consume_order_qr_token', {
        _token: token,
        _token_type: 'delivery',
        _order_id: orderId,
      });
      const result = data as { ok?: boolean; message?: string } | null;

      if (error || result?.ok === false) {
        toast({
          title: 'Delivery not verified',
          description: error?.message || result?.message || 'This delivery QR may be expired or already used.',
          variant: 'destructive',
        });
        return false;
      }
    } else {
      if (!otp) {
        toast({
          title: 'OTP required',
          description: 'Enter the 4-digit OTP shown to the receiver.',
          variant: 'destructive',
        });
        return false;
      }

      const { data, error } = await supabase.rpc('verify_delivery_otp', {
        _order_id: orderId,
        _otp: otp,
      });
      const result = data as { ok?: boolean; message?: string } | null;

      if (error || result?.ok === false) {
        toast({
          title: 'Delivery not verified',
          description: error?.message || result?.message || 'The OTP did not match this order.',
          variant: 'destructive',
        });
        return false;
      }
    }

    toast({
      title: 'Delivery secured',
      description: 'The receiver verification passed and the order was completed.',
    });
    await fetchOrders();
    return true;
  };

  const acceptOrder = async (orderId: string) => {
    if (!user) return false;

    // Get rider ID
    let riderId = riderIdRef.current;
    if (!riderId) {
      const { data: riderData } = await supabase
        .from('riders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!riderData) {
        toast({
          title: 'Error',
          description: 'Rider profile not found',
          variant: 'destructive',
        });
        return false;
      }
      riderId = riderData.id;
      riderIdRef.current = riderId;
    }

    // Use atomic update with status check to prevent race conditions
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted' as OrderStatus, 
        rider_id: riderId 
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('sender_id')
      .single();

    if (error || !data) {
      toast({
        title: 'Order Unavailable',
        description: 'This order was already accepted by another rider',
        variant: 'destructive',
      });
      return false;
    }

    // Create notification for sender
    if (data.sender_id) {
      await supabase.from('notifications').insert({
        user_id: data.sender_id,
        title: 'Rider Assigned! 🏍️',
        message: 'A rider has accepted your parcel request and is heading to pick it up.',
        type: 'order_update',
        order_id: orderId,
      });
    }

    toast({
      title: 'Order Accepted! 🎉',
      description: 'You can now pick up the parcel. Contact details are available.',
    });

    return true;
  };

  const cancelOrder = async (orderId: string, reason: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled' as OrderStatus,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel order',
        variant: 'destructive',
      });
      return false;
    }

    // If rider cancels, notify sender
    if (hasRole('rider') && order.sender_id) {
      await supabase.from('notifications').insert({
        user_id: order.sender_id,
        title: 'Order Cancelled',
        message: `Your order was cancelled. Reason: ${reason}`,
        type: 'order_cancelled',
        order_id: orderId,
      });
    }

    toast({
      title: 'Order Cancelled',
      description: 'The order has been cancelled successfully.',
    });

    return true;
  };

  const getRiderInfo = async (riderId: string): Promise<RiderInfo | null> => {
    const { data, error } = await supabase
      .from('riders')
      .select(`
        id,
        user_id,
        vehicle_type,
        is_online
      `)
      .eq('id', riderId)
      .single();

    if (error || !data) return null;

    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', data.user_id)
      .single();

    return {
      ...data,
      profile: profile || undefined,
    };
  };

  // Play a short attention beep using Web Audio (no asset needed)
  const playNewOrderBeep = useCallback(() => {
    try {
      const AudioCtx = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.start();
      o.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore — audio is best-effort
    }
  }, []);

  // Best-effort browser notification (rider only)
  const notifyRiderOfNewOrder = useCallback((order: Order) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification('🆕 New delivery available', {
          body: `₹${order.price_offered} • ${order.pickup_address.substring(0, 60)}`,
          icon: '/favicon.ico',
          tag: `order-${order.id}`,
        });
      } catch {
        // noop
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Set up real-time subscription + polling fallback
  useEffect(() => {
    fetchOrders();

    // Polling fallback (every 5s) so riders still get orders even if realtime is delayed
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    if (user && hasRole('rider')) {
      pollTimer = setInterval(() => {
        fetchOrders();
      }, 5000);
    }

    // Subscribe to all order changes for instant updates
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          // Handle different event types for optimal UX
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;

            // Only add if relevant to this user
            if (hasRole('admin') ||
                hasRole('rider') ||
                newOrder.sender_id === user?.id) {
              setOrders(prev => {
                const safeOrder = normalizeOrder(newOrder);
                if (prev.some(o => o.id === safeOrder.id)) return prev;
                return [safeOrder, ...prev];
              });

              // Sound + browser notif + toast for riders when new order appears
              if (hasRole('rider') && newOrder.status === 'pending') {
                playNewOrderBeep();
                notifyRiderOfNewOrder(newOrder);
                toast({
                  title: '🆕 New Order Available!',
                  description: `₹${newOrder.price_offered} - ${newOrder.pickup_address.substring(0, 30)}...`,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = normalizeOrder(payload.new as Order);
            const oldOrder = payload.old as Order;
            const isMine = updatedOrder.sender_id === user?.id;
            let currentRiderId = riderIdRef.current;
            if (hasRole('rider') && !currentRiderId && user?.id) {
              const { data: riderData } = await supabase
                .from('riders')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
              currentRiderId = riderData?.id || null;
              riderIdRef.current = currentRiderId;
            }
            const isAssignedToMe =
              hasRole('rider') &&
              currentRiderId &&
              updatedOrder.rider_id === currentRiderId;

            setOrders(prev => {
              // Pending → accepted by someone else: only drop if I'm a rider AND not the sender AND not the assigned rider.
              if (oldOrder.status === 'pending' && updatedOrder.status === 'accepted') {
                if (hasRole('rider') && !isAssignedToMe && !isMine) {
                  return prev.filter(o => o.id !== updatedOrder.id);
                }
              }

              // Make sure the order is in the list (e.g. sender's own order updated by a rider)
              const exists = prev.some(o => o.id === updatedOrder.id);
              if (!exists && (isMine || isAssignedToMe || hasRole('admin'))) {
                return [updatedOrder, ...prev];
              }
              return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            });

            // Notify sender when their order is accepted
            if (oldOrder.status === 'pending' && 
                updatedOrder.status === 'accepted' && 
                updatedOrder.sender_id === user?.id) {
              toast({
                title: 'Rider on the way! 🏍️',
                description: 'A rider has accepted your order and is heading to pickup.',
              });
            }

            // Notify about status changes
            if (oldOrder.status !== updatedOrder.status && updatedOrder.sender_id === user?.id) {
              const statusMessages: Record<OrderStatus, string> = {
                pending: 'Finding a rider for your order',
                accepted: 'Rider is heading to pickup location',
                picked: 'Your parcel has been picked up!',
                in_transit: 'Your parcel is on the way!',
                delivered: 'Delivery completed! 🎉',
                cancelled: 'Your order was cancelled',
              };
              
              if (updatedOrder.status !== 'pending' && updatedOrder.status !== 'accepted') {
                toast({
                  title: 'Order Update',
                  description: statusMessages[updatedOrder.status],
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
          }
        }
      )
      .subscribe();

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [user, hasRole, fetchOrders, toast, playNewOrderBeep, notifyRiderOfNewOrder]);

  return {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    verifyPickupQrToken,
    verifyDeliveryOtp,
    acceptOrder,
    cancelOrder,
    getRiderInfo,
    refetch: fetchOrders,
    uploadOrderPhoto,
    uploadDeliveryProof,
  };
}
