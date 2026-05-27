import { Link } from 'react-router-dom';
import { CheckCircle2, IndianRupee, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeliverySuccessSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
}

export function DeliverySuccessSheet({ open, onClose, orderId, amount }: DeliverySuccessSheetProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] text-center">
        <DialogHeader className="items-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mb-2 animate-scale-in">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <DialogTitle className="text-2xl font-heading">Delivery complete! 🎉</DialogTitle>
          <DialogDescription>
            Great work — the parcel is safely handed over.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-5">
          <p className="text-xs text-muted-foreground mb-1">You earned</p>
          <p className="text-4xl font-bold text-emerald-600 flex items-center justify-center">
            <IndianRupee className="h-7 w-7" />
            {amount}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link to={`/receipt/${orderId}`}>
              <Receipt className="h-4 w-4 mr-2" />
              Receipt
            </Link>
          </Button>
          <Button onClick={onClose} className="btn-gradient">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
