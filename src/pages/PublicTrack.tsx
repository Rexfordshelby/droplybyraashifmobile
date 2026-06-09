import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  Package,
  Bike,
  Gift,
  ArrowLeft,
  KeyRound,
  Wallet,
  Camera,
  CalendarClock,
  Flame,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { ReceiverDeliveryQr } from '@/components/orders/ReceiverDeliveryQr';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { OrderStatus } from '@/hooks/useOrders';
import { formatDistanceToNow } from 'date-fns';
import { getProtectionLabel, type DeliveryPriority, type ProtectionTier, type SupportChannel } from '@/lib/trustFeatures';

interface PublicOrder {
  id: string;
  tracking_code: string;
  status: OrderStatus;
  pickup_address: string;
  pickup_landmark: string | null;
  drop_address: string;
  drop_landmark: string | null;
  item_description: string;
  item_photo_url: string | null;
  transit_photo_url: string | null;
  delivery_proof_url: string | null;
  distance_km: number | null;
  price_offered: number | null;
  fare_locked_amount: number | null;
  protection_tier: ProtectionTier | null;
  protection_coverage: number | null;
  protection_fee: number | null;
  delivery_priority: DeliveryPriority | null;
  priority_fee: number | null;
  scheduled_for: string | null;
  trusted_rider_required: boolean | null;
  support_channel: SupportChannel | null;
  estimated_eta_minutes: number | null;
  eta_confidence: number | null;
  guarantee_credit_amount: number | null;
  payment_method: string | null;
  is_promo_free: boolean;
  created_at: string;
  picked_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  rider_name: string | null;
  rider_vehicle: string | null;
  delivery_otp: string | null;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Finding a rider…',
  accepted: 'Rider on the way to pickup',
  picked: 'Parcel picked up',
  in_transit: 'On the way to you',
  delivered: 'Delivered ✓',
  cancelled: 'Cancelled',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'status-pending',
  accepted: 'status-accepted',
  picked: 'status-picked',
  in_transit: 'status-in_transit',
  delivered: 'status-delivered',
  cancelled: 'status-cancelled',
};

export default function PublicTrack() {
  const { code } = useParams<{ code: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    if (!isSupabaseConfigured) {
      setBackendError('Tracking is not connected to Supabase yet.');
      setLoading(false);
      return;
    }

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timeout = window.setTimeout(() => {
      if (!isActive) return;
      setBackendError('Tracking is taking too long to respond. Please try again in a moment.');
      setLoading(false);
    }, 8000);

    const load = async () => {
      const { data, error } = await supabase.rpc('get_public_order', { _code: code.toUpperCase() });
      if (!isActive) return;
      window.clearTimeout(timeout);

      if (error) {
        setBackendError('Tracking is not ready in Supabase yet. Run supabase/droplix_full_schema.sql to create get_public_order.');
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const o = data as unknown as PublicOrder;
      setOrder(o);
      setLoading(false);

      // Live updates by row id
      channel = supabase
        .channel(`public-track-${o.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${o.id}` },
          async () => {
            // Re-call the RPC to keep field shape consistent
            const { data: refreshed } = await supabase.rpc('get_public_order', { _code: code.toUpperCase() });
            if (refreshed) setOrder(refreshed as unknown as PublicOrder);
          },
        )
        .subscribe();
    };

    load();
    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Checking tracking link...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (backendError) {
    return (
      <MainLayout>
        <div className="container py-16 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Tracking unavailable</h1>
          <p className="text-muted-foreground mb-6">{backendError}</p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (notFound || !order) {
    return (
      <MainLayout>
        <div className="container py-16 text-center max-w-md">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Tracking link not found</h1>
          <p className="text-muted-foreground mb-6">
            Double-check the code with the sender — it should be 8 characters like <span className="font-mono">A1B2C3D4</span>.
          </p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="container py-6 max-w-2xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Link>
        </Button>

        <Card className="card-elevated mb-6">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-mono text-muted-foreground">
                  Tracking #{order.tracking_code}
                </p>
                <h1 className="font-heading text-2xl font-bold mt-1">
                  {statusLabels[order.status]}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge className={`status-badge shrink-0 ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>

            {order.is_promo_free && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  This delivery is FREE — paid by Droplix 🎁
                </p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Protection
                </div>
                <p className="text-sm font-semibold">{getProtectionLabel(order.protection_tier)}</p>
                <p className="text-xs text-muted-foreground">
                  {order.protection_coverage ? `up to Rs ${order.protection_coverage}` : 'QR + OTP proof'}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {order.delivery_priority === 'emergency' ? (
                    <Flame className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  )}
                  Timing
                </div>
                <p className="text-sm font-semibold capitalize">{order.delivery_priority || 'standard'}</p>
                <p className="text-xs text-muted-foreground">
                  {order.scheduled_for
                    ? new Date(order.scheduled_for).toLocaleString()
                    : order.eta_confidence && order.estimated_eta_minutes
                      ? `${order.eta_confidence}% in ${order.estimated_eta_minutes} min`
                      : 'Live updates'}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5 text-primary" />
                  Locked fare
                </div>
                <p className="text-sm font-semibold">Rs {order.fare_locked_amount ?? order.price_offered ?? 0}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {order.support_channel || 'whatsapp'} support
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OTP card — only revealed when rider is at the drop point */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <Card className={`card-elevated mb-6 ${order.delivery_otp ? 'border-primary/40 bg-primary/5' : 'bg-muted/40'}`}>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <KeyRound className={`h-5 w-5 ${order.delivery_otp ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium text-muted-foreground tracking-wide">DELIVERY OTP</p>
              </div>
              {order.delivery_otp ? (
                <>
                  <p className="text-5xl font-mono font-bold tracking-widest text-primary">
                    {order.delivery_otp}
                  </p>
                  <p className="text-sm text-foreground mt-3 font-medium">
                    Show the QR below or read this code to the rider to confirm delivery.
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    For your eyes only — do not share this code with anyone but the rider at your door.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your OTP will appear here when the rider reaches your door. Please don't share this link with anyone else.
                </p>
              )}
              <ReceiverDeliveryQr
                orderId={order.id}
                trackingCode={order.tracking_code}
                status={order.status}
              />
            </CardContent>
          </Card>
        )}

        <Card className="card-elevated mb-6">
          <CardContent className="pt-6">
            <OrderTimeline
              currentStatus={order.status}
              createdAt={order.created_at}
              pickedAt={order.picked_at}
              deliveredAt={order.delivered_at}
              cancelledAt={order.cancelled_at}
            />
          </CardContent>
        </Card>

        <Card className="card-elevated mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 mt-1.5 animate-soft-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">PICKUP</p>
                <p className="text-sm">{order.pickup_address}</p>
                {order.pickup_landmark && (
                  <p className="text-xs text-muted-foreground">{order.pickup_landmark}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">DROP</p>
                <p className="text-sm">{order.drop_address}</p>
                {order.drop_landmark && (
                  <p className="text-xs text-muted-foreground">{order.drop_landmark}</p>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-border text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Item</span>
              <span className="font-medium truncate max-w-[60%] text-right">{order.item_description}</span>
            </div>
            {order.item_photo_url && (
              <img
                src={order.item_photo_url}
                alt="Parcel"
                className="w-full max-h-48 object-cover rounded-lg border"
                loading="lazy"
              />
            )}
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Verified photo chain</p>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                {[
                  { label: 'Pickup', url: order.item_photo_url },
                  { label: 'Transit', url: order.transit_photo_url },
                  { label: 'Delivery', url: order.delivery_proof_url },
                ].map((proof) => (
                  <a
                    key={proof.label}
                    href={proof.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-md border p-2 transition-colors ${
                      proof.url ? 'bg-card hover:bg-muted' : 'pointer-events-none bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <p className="font-semibold">{proof.label}</p>
                    <p className="mt-0.5">{proof.url ? 'Photo available' : 'Pending'}</p>
                  </a>
                ))}
              </div>
            </div>
            {!order.is_promo_free && order.price_offered != null && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-sm">
                <Wallet className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0" />
                <span><strong className="text-amber-800 dark:text-amber-200">Cash on Delivery</strong> — pay rider ₹{order.price_offered} in cash</span>
              </div>
            )}
          </CardContent>
        </Card>

        {order.rider_name && order.status !== 'cancelled' && (
          <Card className="card-elevated">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Bike className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">YOUR RIDER</p>
                <p className="font-medium">
                  {order.rider_name}
                  {order.rider_vehicle && (
                    <span className="text-muted-foreground"> · {order.rider_vehicle}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6">
          Real-time tracking powered by Droplix.
        </p>
      </div>
    </MainLayout>
  );
}
