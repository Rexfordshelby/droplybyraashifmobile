import { useEffect, useState } from 'react';
import { Download, Loader2, QrCode, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Order } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  createOrderQrDataUrl,
  getOrderDisplayCode,
  getQrFileName,
  IssuedOrderQrToken,
} from '@/lib/qrPayload';

interface OrderQRCodeProps {
  order: Order;
  type?: 'pickup' | 'delivery';
  showButton?: boolean;
}

const describeQrIssueError = (error: unknown, type: 'pickup' | 'delivery') => {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('gen_random_bytes') || normalized.includes('digest')) {
    return 'Secure QR service needs the latest Supabase migration. Ask admin to run the QR crypto fix.';
  }

  if (normalized.includes('only the sender')) {
    return type === 'pickup'
      ? 'Only the sender account can issue this pickup QR.'
      : 'Only the sender account can issue this delivery QR.';
  }

  if (normalized.includes('after a rider accepts')) {
    return 'Pickup QR unlocks after a rider accepts this order.';
  }

  if (normalized.includes('assigned rider')) {
    return 'Pickup QR needs an assigned rider first.';
  }

  if (message) return message;

  return type === 'pickup'
    ? 'Could not issue a secure one-time pickup QR. Refresh the order and try again.'
    : 'Could not generate this QR code. Try again.';
};

export function OrderQRCode({ order, type = 'pickup', showButton = true }: OrderQRCodeProps) {
  const [open, setOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrError, setQrError] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const { toast } = useToast();

  const displayCode = getOrderDisplayCode(order);

  useEffect(() => {
    if (showButton && !open) return;

    let isMounted = true;
    setQrError('');
    setQrImage('');
    setExpiresAt(null);

    const generateQr = async () => {
      let issuedToken: IssuedOrderQrToken | undefined;

      if (type === 'pickup' || type === 'delivery') {
        const { data, error } = await supabase.rpc('issue_order_qr_token', {
          _order_id: order.id,
          _token_type: type,
          _ttl_seconds: 900,
        });

        if (error) throw error;
        issuedToken = data as IssuedOrderQrToken;
      }

      const dataUrl = await createOrderQrDataUrl(order, type, issuedToken);

      if (issuedToken?.expiresAt && isMounted) {
        setExpiresAt(issuedToken.expiresAt);
      }

      return dataUrl;
    };

    generateQr()
      .then((dataUrl) => {
        if (isMounted) setQrImage(dataUrl);
      })
      .catch((error) => {
        console.error('QR generation failed:', error);
        if (isMounted) {
          setQrError(describeQrIssueError(error, type));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, order, refreshCount, showButton, type]);

  const handleDownload = async () => {
    if (!qrImage) return;

    try {
      const a = document.createElement('a');
      a.href = qrImage;
      a.download = getQrFileName(order, type);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: 'Downloaded',
        description: 'QR code saved to your device',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download QR code',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshCount((count) => count + 1);
  };

  const QRContent = () => (
    <div className="flex flex-col items-center space-y-4">
      <div className="rounded-lg border bg-white p-4 shadow-lg">
        {qrImage ? (
          <img
            src={qrImage}
            alt={`${type} QR Code`}
            className="h-48 w-48 md:h-64 md:w-64"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center md:h-64 md:w-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          Order #{displayCode}
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          One-time secure QR
        </div>
        {qrError && (
          <p className="text-xs font-medium text-destructive">
            {qrError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {type === 'pickup'
            ? 'Show this in person. It expires and cannot be reused after scan.'
            : 'Rider will verify this at delivery'}
        </p>
        {expiresAt && (
          <p className="text-[11px] text-muted-foreground">
            Expires {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!qrImage}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          New QR
        </Button>
      </div>
    </div>
  );

  if (!showButton) {
    return <QRContent />;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <QrCode className="h-4 w-4 mr-2" />
          {type === 'pickup' ? 'Pickup QR' : 'Delivery QR'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {type === 'pickup' ? 'Pickup Verification' : 'Delivery Verification'}
          </DialogTitle>
        </DialogHeader>
        <QRContent />
      </DialogContent>
    </Dialog>
  );
}
