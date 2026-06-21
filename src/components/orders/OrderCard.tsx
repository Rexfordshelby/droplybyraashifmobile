import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, IndianRupee, Phone, Receipt, QrCode, X, Check, Loader2,
  Navigation, Eye, Gift, RotateCcw, Share2, CheckCircle2, ArrowRight, Package,
  Building2, CalendarClock, Camera, Flame, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order, OrderStatus } from '@/hooks/useOrders';
import { OrderQRCode } from './OrderQRCode';
import { QRScanner } from './QRScanner';
import { OrderTimeline } from './OrderTimeline';
import { RiderInfoCard } from './RiderInfoCard';
import { CancelOrderModal } from './CancelOrderModal';
import { DeliverySuccessSheet } from './DeliverySuccessSheet';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { saveOrderDraft } from '@/lib/orderDrafts';
import { shareTrackingLink, buildTrackingUrl } from '@/lib/shareTracking';
import { ShareReceiverCard } from './ShareReceiverCard';
import { getProtectionLabel } from '@/lib/trustFeatures';
import { RiderReviewCard } from './RiderReviewCard';

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onAccept?: () => Promise<boolean>;
  onDeny?: () => void;
  onUpdateStatus?: (status: OrderStatus) => void;
  onVerifyPickup?: (rawCode: string) => Promise<boolean>;
  onVerifyDelivery?: (rawCode: string) => Promise<boolean>;
  onCancel?: (reason: string) => Promise<boolean>;
  onUploadProof?: (file: File) => Promise<boolean>;
  onUploadTransitProof?: (file: File) => Promise<boolean>;
  isRider?: boolean;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Finding Rider',
  accepted: 'Rider Assigned',
  picked: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
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

const stageOrder: OrderStatus[] = ['accepted', 'picked', 'in_transit', 'delivered'];
const stageNames = ['Pickup', 'Heading to drop', 'At drop', 'Done'];

export function OrderCard({
  order,
  showActions = true,
  onAccept,
  onDeny,
  onUpdateStatus,
  onVerifyPickup,
  onVerifyDelivery,
  onCancel,
  onUploadProof,
  onUploadTransitProof,
  isRider = false,
}: OrderCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isUploadingTransit, setIsUploadingTransit] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatus = useRef<OrderStatus>(order.status);

  // Detect rider's transition into 'delivered' to celebrate
  useEffect(() => {
    if (isRider && prevStatus.current !== 'delivered' && order.status === 'delivered') {
      setShowSuccess(true);
    }
    prevStatus.current = order.status;
  }, [order.status, isRider]);

  const handleSendAgain = () => {
    saveOrderDraft(order);
    toast({ title: 'Reorder ready', description: 'We pre-filled your details — just confirm and send!' });
    navigate('/send');
  };

  const handleShare = async () => {
    const result = await shareTrackingLink(order.tracking_code, order.item_description);
    if (result === 'copied') {
      toast({ title: 'Link copied', description: buildTrackingUrl(order.tracking_code) });
    } else if (result === 'failed') {
      toast({ title: 'Could not share', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const mapsUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const handlePickupVerification = async (data: string) => {
    if (onVerifyPickup) return onVerifyPickup(data);
    return false;
  };

  const handleDeliveryVerification = async (data: string) => {
    if (onVerifyDelivery) return onVerifyDelivery(data);
    return false;
  };

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsAccepting(true);
    await onAccept();
    setIsAccepting(false);
  };

  const handleProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadProof) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Photo too large',
        description: 'Choose a delivery proof photo under 5 MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingProof(true);
    await onUploadProof(file);
    setIsUploadingProof(false);
  };

  const handleTransitUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadTransitProof) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Photo too large',
        description: 'Choose a transit photo under 5 MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingTransit(true);
    await onUploadTransitProof(file);
    setIsUploadingTransit(false);
  };

  const isActiveOrder = !['delivered', 'cancelled'].includes(order.status);
  const currentStageIdx = stageOrder.indexOf(order.status);
  const priorityIcon = order.delivery_priority === 'emergency' ? Flame : CalendarClock;
  const PriorityIcon = priorityIcon;

  // ============ RIDER STAGE PANEL ============
  const renderRiderStage = () => {
    if (!isRider) return null;

    // Stage 1: ACCEPTED → go to pickup, scan code
    if (order.status === 'accepted') {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">1</div>
              <p className="font-semibold text-sm">Head to pickup</p>
            </div>
            <p className="text-sm font-medium leading-snug">{order.pickup_address}</p>
            {order.pickup_landmark && (
              <p className="text-xs text-muted-foreground mt-0.5">{order.pickup_landmark}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" size="sm" asChild className="h-10">
                <a href={mapsUrl(order.pickup_address)} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4 mr-1.5" />
                  Navigate
                </a>
              </Button>
              {order.sender_phone && (
                <Button variant="outline" size="sm" asChild className="h-10">
                  <a href={`tel:${order.sender_phone}`}>
                    <Phone className="h-4 w-4 mr-1.5 text-emerald-600" />
                    Call sender
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/30 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
              <p className="font-semibold text-sm">Verify pickup</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Ask the customer to show the one-time pickup QR. Public order IDs are only for tracking.
            </p>
            <QRScanner
              onScan={handlePickupVerification}
              type="pickup"
              expectedOrderId={order.id}
              expectedTrackingCode={order.tracking_code}
              trigger={
                <Button className="w-full btn-gradient h-12 text-base">
                  <QrCode className="h-5 w-5 mr-2" />
                  Scan pickup QR
                </Button>
              }
            />
          </div>
        </div>
      );
    }

    // Stage 2: PICKED → confirmation + head to drop
    if (order.status === 'picked') {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Pickup confirmed</p>
              <p className="text-xs text-muted-foreground">Item with you. Now head to the drop point.</p>
            </div>
          </div>

          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold">3</div>
              <p className="font-semibold text-sm">Head to drop</p>
            </div>
            <p className="text-sm font-medium leading-snug">{order.drop_address}</p>
            {order.drop_landmark && (
              <p className="text-xs text-muted-foreground mt-0.5">{order.drop_landmark}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button variant="outline" size="sm" asChild className="h-10">
                <a href={mapsUrl(order.drop_address)} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4 mr-1.5" />
                  Navigate
                </a>
              </Button>
            {order.receiver_phone && (
              <Button variant="outline" size="sm" asChild className="h-10">
                <a href={`tel:${order.receiver_phone}`}>
                  <Phone className="h-4 w-4 mr-1.5 text-primary" />
                  Call receiver
                </a>
              </Button>
            )}
            </div>
            <div className="mt-3 rounded-lg border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Transit photo</p>
                  <p className="text-xs text-muted-foreground">
                    {order.transit_photo_url ? 'Parcel-in-transit photo attached.' : 'Optional proof for protected or business parcels.'}
                  </p>
                </div>
                {order.transit_photo_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={order.transit_photo_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                )}
              </div>
              {onUploadTransitProof && (
                <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-md border bg-card text-sm font-medium transition-colors hover:bg-muted">
                  {isUploadingTransit ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {order.transit_photo_url ? 'Replace transit photo' : 'Add transit photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={isUploadingTransit}
                    onChange={handleTransitUpload}
                  />
                </label>
              )}
            </div>
            <Button
              className="w-full mt-3 btn-gradient h-12 text-base"
              onClick={() => onUpdateStatus?.('in_transit')}
            >
              I've reached the drop point
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    // Stage 3: IN_TRANSIT → at drop, verify with receiver
    if (order.status === 'in_transit') {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold">4</div>
              <p className="font-semibold text-sm">At the drop — meet the receiver</p>
            </div>
            <p className="text-sm font-medium leading-snug">{order.drop_address}</p>
            {order.receiver_phone && (
              <Button variant="outline" size="sm" asChild className="w-full mt-3 h-10 justify-start">
                <a href={`tel:${order.receiver_phone}`}>
                  <Phone className="h-4 w-4 mr-2 text-primary" />
                  <span className="truncate">Call receiver · {order.receiver_phone}</span>
                </a>
              </Button>
            )}
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/30 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</div>
              <p className="font-semibold text-sm">Verify with receiver</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Ask the receiver to show their QR, or enter the 4-digit OTP shown on their tracking screen.
            </p>
            <div className="mb-3 rounded-lg border bg-background/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Delivery proof</p>
                  <p className="text-xs text-muted-foreground">
                    {order.delivery_proof_url ? 'Proof photo attached.' : 'Add a drop photo before completing.'}
                  </p>
                </div>
                {order.delivery_proof_url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={order.delivery_proof_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                )}
              </div>
              {onUploadProof && (
                <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-md border bg-card text-sm font-medium transition-colors hover:bg-muted">
                  {isUploadingProof ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {order.delivery_proof_url ? 'Replace proof photo' : 'Add proof photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={isUploadingProof}
                    onChange={handleProofUpload}
                  />
                </label>
              )}
            </div>
            <QRScanner
              onScan={handleDeliveryVerification}
              type="delivery"
              trigger={
                <Button className="w-full btn-gradient h-12 text-base">
                  <QrCode className="h-5 w-5 mr-2" />
                  Scan receiver QR / OTP
                </Button>
              }
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <DeliverySuccessSheet
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        orderId={order.id}
        amount={Number(order.price_offered)}
      />

    <Card className={`app-card hover-lift animate-slide-up overflow-hidden transition-all ${order.status === 'pending' && isRider ? 'ring-2 ring-primary/40' : ''}`}>
        <div className={`h-1 ${order.status === 'delivered' ? 'bg-success' : order.status === 'cancelled' ? 'bg-destructive' : 'bg-primary'}`} />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-mono truncate">
                #{order.tracking_code || order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {order.is_promo_free && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 gap-1">
                  <Gift className="h-3 w-3" />
                  FREE
                </Badge>
              )}
              <Badge className={`status-badge ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
              <ShieldCheck className="h-3 w-3" />
              {getProtectionLabel(order.protection_tier)}
            </Badge>
            {order.fare_locked && (
              <Badge variant="outline" className="gap-1">
                <IndianRupee className="h-3 w-3" />
                Fare locked
              </Badge>
            )}
            {order.delivery_priority !== 'standard' && (
              <Badge variant="outline" className="gap-1 capitalize">
                <PriorityIcon className="h-3 w-3" />
                {order.delivery_priority}
              </Badge>
            )}
            {order.trusted_rider_required && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Trusted rider
              </Badge>
            )}
            {order.business_order && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" />
                {order.multi_stop_count > 1 ? `${order.multi_stop_count} stops` : 'Business'}
              </Badge>
            )}
          </div>

          {/* Stage indicator (rider, active orders) */}
          {isRider && currentStageIdx >= 0 && order.status !== 'delivered' && (
            <div className="flex items-center gap-1.5">
              {stageNames.map((name, i) => (
                <div key={name} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${
                      i <= currentStageIdx ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                  <span className={`text-[10px] leading-tight text-center ${i === currentStageIdx ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Price highlight for riders on pending orders */}
          {isRider && order.status === 'pending' && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Earn</p>
              <p className="text-3xl font-bold text-primary flex items-center justify-center">
                <IndianRupee className="h-6 w-6" />
                {order.price_offered}
              </p>
              {order.distance_km && (
                <p className="text-xs text-muted-foreground mt-1">
                  ~{order.distance_km} km · ~₹{Math.round(Number(order.price_offered || 0) / Math.max(Number(order.distance_km), 1))}/km
                </p>
              )}
            </div>
          )}

          {/* Pending pickup/drop preview for riders (decision-making) */}
          {isRider && order.status === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-soft-pulse mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                  <p className="text-sm truncate">{order.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Drop</p>
                  <p className="text-sm truncate">{order.drop_address}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sender view: locations always */}
          {!isRider && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-success animate-soft-pulse mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                  <p className="text-sm truncate">{order.pickup_address}</p>
                  {order.pickup_landmark && (
                    <p className="text-xs text-muted-foreground truncate">{order.pickup_landmark}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Drop</p>
                  <p className="text-sm truncate">{order.drop_address}</p>
                  {order.drop_landmark && (
                    <p className="text-xs text-muted-foreground truncate">{order.drop_landmark}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Item details */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Item</span>
              <span className="text-sm font-medium truncate max-w-[60%] text-right">{order.item_description}</span>
            </div>
            {order.item_photo_url && (
              <div className="pt-1">
                <a href={order.item_photo_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={order.item_photo_url}
                    alt="Parcel"
                    className="w-full max-h-44 object-cover rounded-lg border"
                    loading="lazy"
                  />
                </a>
              </div>
            )}
            {!isRider && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-sm font-semibold flex items-center">
                  <IndianRupee className="h-3.5 w-3.5" />
                  {order.price_offered}
                </span>
              </div>
            )}
            {!order.is_promo_free && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                <span><strong className="text-amber-800 dark:text-amber-200">Cash on Delivery</strong> — {isRider ? `collect ₹${order.price_offered} from sender` : `pay rider ₹${order.price_offered} in cash`}</span>
              </div>
            )}
          </div>

          {!isRider && (order.item_photo_url || order.transit_photo_url || order.delivery_proof_url) && (
            <div className="rounded-lg border bg-background/70 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Verified parcel photo chain</p>
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-3">
                {[
                  { label: 'Pickup photo', url: order.item_photo_url },
                  { label: 'Transit photo', url: order.transit_photo_url },
                  { label: 'Delivery photo', url: order.delivery_proof_url },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-md border p-2 transition-colors ${
                      item.url ? 'bg-card hover:bg-muted' : 'pointer-events-none bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-0.5">{item.url ? 'Available' : 'Pending'}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Stage panel for active rider orders */}
          {isRider && isActiveOrder && order.status !== 'pending' && (
            <div className="pt-3 border-t border-border">
              {renderRiderStage()}
            </div>
          )}

          {/* Sender: rider info */}
          {!isRider && order.rider_id && order.status !== 'pending' && order.status !== 'cancelled' && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Your Rider</p>
              <RiderInfoCard riderId={order.rider_id} />
              {order.receiver_phone && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  Receiver contact: <span className="font-medium text-foreground">{order.receiver_phone}</span>
                </p>
              )}
            </div>
          )}

          {/* Sender: prominent receiver share + live track */}
          {!isRider && order.status !== 'cancelled' && order.status !== 'delivered' && (
            <div className="pt-3 border-t border-border space-y-3">
              <ShareReceiverCard
                trackingCode={order.tracking_code}
                receiverPhone={order.receiver_phone}
                itemDescription={order.item_description}
                compact
              />
              <Button variant="outline" size="sm" asChild className="h-10 w-full">
                <Link to={`/track/${order.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Open live tracking
                </Link>
              </Button>
            </div>
          )}

          {/* Sender: timeline toggle */}
          {!isRider && isActiveOrder && order.status !== 'pending' && (
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="text-xs text-primary hover:underline w-full text-center py-1"
            >
              {showTimeline ? 'Hide timeline' : 'View order progress'}
            </button>
          )}

          {!isRider && showTimeline && order.status !== 'pending' && (
            <div className="pt-2">
              <OrderTimeline
                currentStatus={order.status}
                createdAt={order.created_at}
                pickedAt={order.picked_at}
                deliveredAt={order.delivered_at}
                cancelledAt={order.cancelled_at}
              />
            </div>
          )}

          {/* Sender: pickup QR is one-time and only valid before pickup is confirmed. */}
          {!isRider && order.status === 'accepted' && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Show this to the rider at pickup
              </p>
              <OrderQRCode order={order} type="pickup" />
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                The 4-digit delivery OTP is shown only on the receiver's tracking link when the rider arrives. Never share it yourself.
              </p>
            </div>
          )}


          {/* Delivered actions */}
          {order.status === 'delivered' && (
            <div className="pt-3 border-t border-border space-y-3">
              {!isRider && order.rider_id && <RiderReviewCard order={order} />}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild>
                  <Link to={`/receipt/${order.id}`}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Receipt
                  </Link>
                </Button>
                {!isRider && (
                  <Button onClick={handleSendAgain} className="btn-gradient">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Send again
                  </Button>
                )}
              </div>
            </div>
          )}

          {order.status === 'cancelled' && !isRider && (
            <div className="pt-3 border-t border-border">
              <Button onClick={handleSendAgain} variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Send again
              </Button>
            </div>
          )}

          {/* Actions: accept/deny + cancel */}
          {showActions && (
            <div className="pt-3 border-t border-border space-y-2">
              {order.status === 'pending' && isRider && onAccept && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={onDeny}
                    className="border-muted-foreground/30 h-12"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="btn-gradient h-12"
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Accept
                  </Button>
                </div>
              )}

              {isActiveOrder && order.status !== 'in_transit' && onCancel && (
                <CancelOrderModal
                  trigger={
                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                      Cancel order
                    </Button>
                  }
                  onConfirm={onCancel}
                  isRider={isRider}
                />
              )}
            </div>
          )}

          {order.status === 'cancelled' && order.cancellation_reason && (
            <div className="pt-3 border-t border-border">
              <div className="bg-destructive/10 rounded-lg p-3">
                <p className="text-xs text-destructive font-medium mb-1">Cancellation reason</p>
                <p className="text-sm text-muted-foreground">{order.cancellation_reason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
