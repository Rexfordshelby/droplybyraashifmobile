import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  Copy,
  Download,
  Gift,
  Hash,
  IndianRupee,
  MapPin,
  Package,
  Printer,
  Route,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Order } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { createOrderQrDataUrl, getOrderDisplayCode } from '@/lib/qrPayload';

interface OrderReceiptProps {
  order: Order;
  showActions?: boolean;
}

const statusColor = {
  pending: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  accepted: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  picked: 'bg-primary/10 text-primary border-primary/30',
  in_transit: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/30',
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeFormatDate(value: string | null | undefined, pattern: string) {
  if (!value) return 'Not available';
  return format(new Date(value), pattern);
}

export function OrderReceipt({ order, showActions = true }: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptQrUrl, setReceiptQrUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const { toast } = useToast();

  const receiptCode = getOrderDisplayCode(order);
  const basePrice = Number(order.suggested_price || order.price_offered || 0);
  const totalAmount = order.is_promo_free
    ? 0
    : Number(order.sender_paid_amount || order.price_offered || 0);
  const riderPayout = Number(order.platform_paid_amount || basePrice || 0);
  const deliveryDate = safeFormatDate(order.delivered_at || order.updated_at, 'PPP p');

  const shareText = useMemo(
    () =>
      [
        `Droplix receipt #${receiptCode}`,
        `Status: ${order.status.replace('_', ' ')}`,
        `Amount paid: ${money(totalAmount)}`,
        `Pickup: ${order.pickup_address}`,
        `Drop: ${order.drop_address}`,
      ].join('\n'),
    [order.drop_address, order.pickup_address, order.status, receiptCode, totalAmount],
  );

  useEffect(() => {
    let isMounted = true;
    setReceiptQrUrl('');
    setQrError('');

    createOrderQrDataUrl(order, 'receipt')
      .then((dataUrl) => {
        if (isMounted) setReceiptQrUrl(dataUrl);
      })
      .catch(() => {
        if (isMounted) setQrError('Receipt QR could not be generated.');
      });

    return () => {
      isMounted = false;
    };
  }, [order]);

  const buildReceiptHtml = () => {
    const status = order.status.replace('_', ' ').toUpperCase();
    const qrImage = receiptQrUrl
      ? `<img src="${receiptQrUrl}" alt="Receipt QR" style="width:112px;height:112px;border:1px solid #dbe3ea;border-radius:10px;padding:8px;background:#fff;" />`
      : '';

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Droplix Receipt ${escapeHtml(receiptCode)}</title>
  <style>
    body { margin: 0; background: #f5f7f8; color: #1f2937; font-family: Arial, sans-serif; }
    .receipt { max-width: 760px; margin: 32px auto; background: #fff; border: 1px solid #dbe3ea; border-radius: 14px; overflow: hidden; }
    .header { background: #0f8ea0; color: #fff; padding: 26px; display: flex; justify-content: space-between; gap: 20px; }
    .title { font-size: 26px; font-weight: 800; margin: 0 0 6px; }
    .muted { color: #667085; }
    .header .muted { color: #d9f4f7; }
    .content { padding: 26px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .panel { border: 1px solid #dbe3ea; border-radius: 12px; padding: 14px; }
    .label { color: #667085; font-size: 12px; text-transform: uppercase; letter-spacing: 0; margin-bottom: 4px; }
    .value { font-weight: 700; }
    .section { margin-top: 22px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #eef2f5; }
    .row:last-child { border-bottom: 0; }
    .route { display: grid; gap: 14px; }
    .footer { padding: 18px 26px 26px; color: #667085; font-size: 12px; text-align: center; }
    @media print {
      body { background: #fff; }
      .receipt { margin: 0; max-width: none; border-radius: 0; border: 0; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <section class="header">
      <div>
        <p class="title">Delivery Receipt</p>
        <div class="muted">Receipt #${escapeHtml(receiptCode)}</div>
      </div>
      <div style="text-align:right;">
        <strong>${escapeHtml(status)}</strong>
        <div class="muted">${escapeHtml(safeFormatDate(order.created_at, 'PPP'))}</div>
      </div>
    </section>
    <section class="content">
      <div class="grid">
        <div class="panel"><div class="label">Order ID</div><div class="value">${escapeHtml(order.id)}</div></div>
        <div class="panel"><div class="label">Created</div><div class="value">${escapeHtml(safeFormatDate(order.created_at, 'p'))}</div></div>
        <div class="panel"><div class="label">Paid</div><div class="value">${escapeHtml(money(totalAmount))}</div></div>
      </div>
      <div class="section route">
        <div class="panel"><div class="label">Pickup</div><div>${escapeHtml(order.pickup_address)}</div>${order.pickup_landmark ? `<div class="muted">${escapeHtml(order.pickup_landmark)}</div>` : ''}</div>
        <div class="panel"><div class="label">Drop</div><div>${escapeHtml(order.drop_address)}</div>${order.drop_landmark ? `<div class="muted">${escapeHtml(order.drop_landmark)}</div>` : ''}</div>
      </div>
      <div class="section panel"><div class="label">Item</div><div>${escapeHtml(order.item_description)}</div></div>
      <div class="section panel">
        <div class="label">Payment</div>
        <div class="row"><span>Base delivery price</span><strong>${escapeHtml(money(basePrice))}</strong></div>
        ${order.is_promo_free ? `<div class="row"><span>Promo covered by Droplix</span><strong>-${escapeHtml(money(basePrice))}</strong></div>` : ''}
        <div class="row"><span>Total paid by sender</span><strong>${escapeHtml(money(totalAmount))}</strong></div>
        <div class="row"><span>Payment method</span><strong>${escapeHtml(order.is_promo_free ? 'Promo credit' : 'Cash on delivery')}</strong></div>
      </div>
      <div class="section" style="display:flex;justify-content:space-between;gap:20px;align-items:center;">
        <div class="muted">Delivery timestamp: ${escapeHtml(deliveryDate)}</div>
        ${qrImage}
      </div>
    </section>
    <footer class="footer">Keep this receipt for support, refunds, and delivery proof checks.</footer>
  </main>
</body>
</html>`;
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([buildReceiptHtml()], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `droplix-receipt-${receiptCode.toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Receipt downloaded',
        description: 'Open it in your browser to print or save as PDF.',
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(receiptCode);
      toast({ title: 'Copied', description: 'Receipt code copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Please copy the receipt code manually.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Droplix receipt #${receiptCode}`,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User cancelled native share.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Copied',
        description: 'Receipt details copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Share failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="print-receipt mx-auto max-w-2xl overflow-hidden card-elevated animate-scale-in" ref={receiptRef}>
      <CardContent className="p-0">
        <div className="bg-primary p-5 text-primary-foreground md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                <h2 className="font-heading text-2xl font-bold">Delivery Receipt</h2>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Receipt #{receiptCode}
              </p>
            </div>
            <Badge className={`${statusColor[order.status]} w-fit border bg-white/95`}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/35 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
                Order
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold">{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="rounded-lg border bg-muted/35 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Date
              </p>
              <p className="mt-1 text-sm font-semibold">{safeFormatDate(order.created_at, 'PPP')}</p>
            </div>
            <div className="rounded-lg border bg-muted/35 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Time
              </p>
              <p className="mt-1 text-sm font-semibold">{safeFormatDate(order.created_at, 'p')}</p>
            </div>
          </div>

          <section className="grid gap-3">
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-emerald-500/15 p-2 text-emerald-700">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Pickup</p>
                  <p className="text-sm font-medium leading-relaxed">{order.pickup_address}</p>
                  {order.pickup_landmark && (
                    <p className="text-xs text-muted-foreground">{order.pickup_landmark}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-red-500/15 p-2 text-red-700">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Drop</p>
                  <p className="text-sm font-medium leading-relaxed">{order.drop_address}</p>
                  {order.drop_landmark && (
                    <p className="text-xs text-muted-foreground">{order.drop_landmark}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-muted/25 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Package className="h-4 w-4" />
              Item details
            </p>
            <p className="text-sm font-medium">{order.item_description}</p>
            {order.distance_km && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Route className="h-3.5 w-3.5" />
                Estimated distance: {order.distance_km} km
              </p>
            )}
          </section>

          <section className="rounded-lg border bg-background/80 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              Payment summary
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Base delivery price</span>
                <span className="font-medium">{money(basePrice)}</span>
              </div>
              {order.is_promo_free && (
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span className="flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    Promo covered by Droplix
                  </span>
                  <span className="font-semibold">-{money(basePrice)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between gap-4 text-base font-bold">
                <span>Total paid by sender</span>
                <span className="text-primary">{money(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>Payment method</span>
                <span>{order.is_promo_free ? 'Promo credit' : 'Cash on delivery'}</span>
              </div>
              {order.is_promo_free && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">
                  Rider payout covered by Droplix: {money(riderPayout)}.
                </p>
              )}
            </div>
          </section>

          {(order.delivered_at || order.delivery_proof_url || order.cancelled_at) && (
            <section className="rounded-lg border bg-muted/25 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Delivery proof
              </p>
              <div className="space-y-2 text-sm">
                {order.delivered_at && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="font-medium">{safeFormatDate(order.delivered_at, 'PPP p')}</span>
                  </div>
                )}
                {order.cancelled_at && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-muted-foreground">Cancelled</span>
                    <span className="font-medium">{safeFormatDate(order.cancelled_at, 'PPP p')}</span>
                  </div>
                )}
                {order.delivery_proof_url && (
                  <Button size="sm" variant="outline" asChild className="no-print">
                    <a href={order.delivery_proof_url} target="_blank" rel="noopener noreferrer">
                      View proof photo
                    </a>
                  </Button>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Receipt verification</p>
              <p className="text-xs text-muted-foreground">
                Scan this code to verify the order reference and payment summary.
              </p>
              {qrError && <p className="mt-1 text-xs text-destructive">{qrError}</p>}
            </div>
            <div className="flex items-center gap-3">
              {receiptQrUrl ? (
                <img
                  src={receiptQrUrl}
                  alt="Receipt QR"
                  className="h-24 w-24 rounded-lg border bg-white p-2"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg border bg-muted" />
              )}
              <Button size="icon" variant="outline" className="no-print" onClick={handleCopyCode} aria-label="Copy receipt code">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showActions && (
            <div className="no-print grid gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Keep this receipt for support, refunds, and delivery proof checks.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
