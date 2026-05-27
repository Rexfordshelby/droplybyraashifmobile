import { useRef } from 'react';
import { Download, Share2, MapPin, IndianRupee, Calendar, Package, Clock, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OrderReceiptProps {
  order: Order;
  showActions?: boolean;
}

export function OrderReceipt({ order, showActions = true }: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const qrData = encodeURIComponent(JSON.stringify({
    orderId: order.id,
    amount: order.price_offered,
    date: order.created_at,
  }));
  const receiptQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    try {
      // Create a simple text-based receipt for download
      const receiptText = `
═══════════════════════════════════════
           DELIVERY RECEIPT
═══════════════════════════════════════

Order ID: ${order.id.slice(0, 8).toUpperCase()}
Date: ${format(new Date(order.created_at), 'PPP')}
Time: ${format(new Date(order.created_at), 'p')}

───────────────────────────────────────
PICKUP LOCATION
${order.pickup_address}
${order.pickup_landmark ? `Landmark: ${order.pickup_landmark}` : ''}

DROP LOCATION
${order.drop_address}
${order.drop_landmark ? `Landmark: ${order.drop_landmark}` : ''}

───────────────────────────────────────
ITEM DETAILS
${order.item_description}

───────────────────────────────────────
PAYMENT DETAILS
${order.distance_km ? `Distance: ${order.distance_km} km` : ''}
${order.suggested_price ? `Subtotal: ₹${order.suggested_price}` : ''}
${order.is_promo_free ? `Promo Discount: -₹${order.suggested_price ?? order.platform_paid_amount ?? 0}` : ''}
Total Amount: ₹${order.is_promo_free ? 0 : order.price_offered}${order.is_promo_free ? ' (FREE)' : ''}
Payment Method: ${order.is_promo_free ? 'Promo - Paid by Droply' : 'Cash on Delivery'}

───────────────────────────────────────
Status: ${order.status.toUpperCase()}
${order.delivered_at ? `Delivered: ${format(new Date(order.delivered_at), 'PPP p')}` : ''}

═══════════════════════════════════════
        Thank you for using our service!
═══════════════════════════════════════
      `;

      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${order.id.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Receipt Downloaded',
        description: 'Your receipt has been saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download receipt',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    const shareText = `
Order Receipt - ${order.id.slice(0, 8).toUpperCase()}
Amount: ₹${order.price_offered}
Status: ${order.status}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Delivery Receipt',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User cancelled native share.
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied',
        description: 'Receipt details copied to clipboard',
      });
    }
  };

  const statusColor = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    picked: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    in_transit: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/30',
  };

  return (
    <Card className="max-w-md mx-auto glass-card animate-scale-in" ref={receiptRef}>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-xl font-bold">Delivery Receipt</h2>
          </div>
          <Badge className={statusColor[order.status]}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Order Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Date
            </span>
            <span>{format(new Date(order.created_at), 'PPP')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time
            </span>
            <span>{format(new Date(order.created_at), 'p')}</span>
          </div>
        </div>

        <Separator />

        {/* Addresses */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">PICKUP</p>
              <p className="text-sm">{order.pickup_address}</p>
              {order.pickup_landmark && (
                <p className="text-xs text-muted-foreground">{order.pickup_landmark}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-3 w-3 rounded-full bg-red-500" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">DROP</p>
              <p className="text-sm">{order.drop_address}</p>
              {order.drop_landmark && (
                <p className="text-xs text-muted-foreground">{order.drop_landmark}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Item */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">ITEM DESCRIPTION</p>
          <p className="text-sm">{order.item_description}</p>
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PAYMENT DETAILS</p>
          {order.distance_km && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Distance</span>
              <span>{order.distance_km} km</span>
            </div>
          )}
          {order.suggested_price && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{order.is_promo_free ? 'Subtotal' : 'Base Price'}</span>
              <span className="flex items-center">
                <IndianRupee className="h-3 w-3" />
                {order.suggested_price}
              </span>
            </div>
          )}
          {order.is_promo_free && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span className="flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Promo Discount
              </span>
              <span className="flex items-center font-medium">
                −<IndianRupee className="h-3 w-3" />
                {order.suggested_price ?? order.platform_paid_amount ?? 0}
              </span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between items-center font-semibold">
            <span>Total Amount</span>
            <span className="flex items-center gap-2">
              <span className="flex items-center text-primary text-lg">
                <IndianRupee className="h-4 w-4" />
                {order.is_promo_free ? 0 : order.price_offered}
              </span>
              {order.is_promo_free && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-xs">
                  FREE
                </Badge>
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="capitalize">
              {order.is_promo_free ? 'Promo (Paid by Droply)' : 'Cash on Delivery'}
            </span>
          </div>
          {order.is_promo_free && (
            <p className="text-xs text-muted-foreground italic pt-1">
              Rider was paid ₹{order.suggested_price ?? order.platform_paid_amount ?? 0} by Droply on your behalf. 🎁
            </p>
          )}
        </div>

        {order.delivered_at && (
          <>
            <Separator />
            <div className="text-center text-sm text-muted-foreground">
              Delivered on {format(new Date(order.delivered_at), 'PPP')} at {format(new Date(order.delivered_at), 'p')}
            </div>
          </>
        )}

        {/* QR Code */}
        <div className="flex justify-center pt-2">
          <img 
            src={receiptQrUrl} 
            alt="Receipt QR" 
            className="w-20 h-20 opacity-70"
            loading="lazy"
          />
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          Thank you for using our delivery service!
        </p>
      </CardContent>
    </Card>
  );
}
