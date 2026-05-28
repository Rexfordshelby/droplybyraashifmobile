import { Copy, Share2, MessageCircle, Link2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { buildTrackingUrl, shareTrackingLink } from '@/lib/shareTracking';

interface ShareReceiverCardProps {
  trackingCode: string;
  receiverPhone?: string | null;
  itemDescription?: string;
  compact?: boolean;
}

/**
 * Prominent CTA the SENDER uses to hand the receiver a tracking link.
 * The receiver-only OTP is auto-revealed on that link when the rider
 * arrives at the drop point — the sender never sees it.
 */
export function ShareReceiverCard({
  trackingCode,
  receiverPhone,
  itemDescription,
  compact = false,
}: ShareReceiverCardProps) {
  const { toast } = useToast();
  const url = buildTrackingUrl(trackingCode);

  const message = `Hi! Your Droplix parcel${itemDescription ? ` (${itemDescription})` : ''} is on the way. Track it live & get your delivery OTP here: ${url}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: url });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const result = await shareTrackingLink(trackingCode, itemDescription);
    if (result === 'copied') toast({ title: 'Link copied', description: url });
    else if (result === 'failed') toast({ title: 'Could not share', variant: 'destructive' });
  };

  const phoneDigits = (receiverPhone || '').replace(/\D/g, '');
  const waPhone = phoneDigits.length >= 10
    ? (phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits)
    : '';
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className={`rounded-lg border-2 border-primary/40 bg-primary/10 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-start gap-2">
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight">Share tracking link with receiver</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            They'll see live status and get the 4-digit delivery OTP — only when the rider reaches them.
          </p>
        </div>
      </div>

      <div className="bg-background rounded-md border border-border px-3 py-2 flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[12px] font-mono truncate flex-1 select-all">{url}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="default"
          size="sm"
          className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
          asChild
          disabled={!waPhone}
        >
          <a href={waPhone ? whatsappUrl : '#'} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="sm" className="h-10" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-1.5" />
          Copy
        </Button>
        <Button variant="outline" size="sm" className="h-10" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5">
        <KeyRound className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
        <span>
          Only the receiver should open this link. The OTP is revealed there — never share OTPs over chat or call yourself.
        </span>
      </div>
    </div>
  );
}
