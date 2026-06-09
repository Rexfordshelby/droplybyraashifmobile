import { useEffect, useState } from 'react';
import { Copy, Loader2, QrCode, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createQrDataUrlFromText } from '@/lib/qrPayload';

type ReceiverQrToken = {
  token?: string;
  tokenId?: string;
  orderId?: string;
  trackingCode?: string;
  expiresAt?: string;
};

interface ReceiverDeliveryQrProps {
  orderId: string;
  trackingCode: string;
  status: string;
}

export function ReceiverDeliveryQr({ orderId, trackingCode, status }: ReceiverDeliveryQrProps) {
  const { toast } = useToast();
  const [qrImage, setQrImage] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [rawPayload, setRawPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const isReady = status === 'in_transit';

  useEffect(() => {
    if (!isReady) {
      setQrImage('');
      setRawPayload('');
      setExpiresAt(null);
      setError('');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');
    setQrImage('');

    const loadQr = async () => {
      const { data, error: rpcError } = await supabase.rpc('issue_receiver_delivery_qr_token', {
        _tracking_code: trackingCode,
        _ttl_seconds: 300,
      });

      if (rpcError) throw rpcError;

      const issued = data as ReceiverQrToken | null;
      if (!issued?.token) throw new Error('Receiver QR token was not issued.');

      const payload = JSON.stringify({
        app: 'droplix',
        version: 1,
        type: 'delivery',
        orderId: issued.orderId || orderId,
        trackingCode: issued.trackingCode || trackingCode,
        token: issued.token,
        tokenId: issued.tokenId,
        expiresAt: issued.expiresAt,
        issuedAt: new Date().toISOString(),
      });

      const dataUrl = await createQrDataUrlFromText(payload);
      if (!isMounted) return;
      setRawPayload(payload);
      setQrImage(dataUrl);
      setExpiresAt(issued.expiresAt || null);
    };

    loadQr()
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Could not create receiver QR.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isReady, orderId, refreshCount, trackingCode]);

  const handleCopy = async () => {
    if (!rawPayload) return;
    try {
      await navigator.clipboard.writeText(rawPayload);
      toast({ title: 'Receiver QR token copied' });
    } catch {
      toast({ title: 'Could not copy token', variant: 'destructive' });
    }
  };

  if (!isReady) {
    return (
      <div className="mt-5 rounded-lg border bg-background/70 p-3 text-left">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Receiver scanner locked</p>
            <p className="text-xs text-muted-foreground">
              The QR scanner appears here when the rider reaches your drop point.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-primary/25 bg-background p-3 text-left shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold">Receiver scan QR</p>
            <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/10 text-primary">
              <ShieldCheck className="h-3 w-3" />
              One use
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Show this screen to the rider. It expires quickly and cannot be reused after scan.
          </p>
        </div>
        <Button size="icon" variant="outline" onClick={() => setRefreshCount((count) => count + 1)} aria-label="Refresh receiver QR">
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex h-48 w-48 items-center justify-center rounded-lg border bg-white p-3">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : qrImage ? (
            <img src={qrImage} alt="Receiver delivery QR" className="h-full w-full" />
          ) : (
            <QrCode className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
        {expiresAt && (
          <p className="text-center text-xs text-muted-foreground">
            Expires {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={!rawPayload}>
          <Copy className="mr-2 h-4 w-4" />
          Copy secure token
        </Button>
      </div>
    </div>
  );
}
