import { useState } from 'react';
import { QrCode, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Order } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

interface OrderQRCodeProps {
  order: Order;
  type?: 'pickup' | 'delivery';
  showButton?: boolean;
}

export function OrderQRCode({ order, type = 'pickup', showButton = true }: OrderQRCodeProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Create QR data based on type
  const qrData = type === 'pickup' 
    ? JSON.stringify({
        orderId: order.id,
        type: 'pickup',
        pickup: order.pickup_address,
        item: order.item_description,
      })
    : JSON.stringify({
        orderId: order.id,
        type: 'delivery',
        otp: order.delivery_otp,
        drop: order.drop_address,
      });

  const encodedData = encodeURIComponent(qrData);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedData}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id.slice(0, 8)}-${type}-qr.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order ${order.id.slice(0, 8).toUpperCase()} - ${type === 'pickup' ? 'Pickup' : 'Delivery'} QR`,
          text: type === 'pickup' 
            ? `Show this QR code to the rider at pickup` 
            : `Delivery OTP: ${order.delivery_otp}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled native share.
      }
    } else {
      navigator.clipboard.writeText(type === 'delivery' ? order.delivery_otp || '' : order.id);
      toast({
        title: 'Copied',
        description: type === 'delivery' ? 'OTP copied to clipboard' : 'Order ID copied to clipboard',
      });
    }
  };

  const QRContent = () => (
    <div className="flex flex-col items-center space-y-4">
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <img 
          src={qrUrl} 
          alt={`${type} QR Code`}
          className="w-48 h-48 md:w-64 md:h-64"
          loading="lazy"
        />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>
        {type === 'delivery' && order.delivery_otp && (
          <p className="text-2xl font-bold font-mono tracking-widest text-primary">
            OTP: {order.delivery_otp}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {type === 'pickup' 
            ? 'Show this QR to the rider at pickup' 
            : 'Rider will verify this at delivery'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
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
