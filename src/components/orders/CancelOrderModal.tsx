import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CancelOrderModalProps {
  trigger: React.ReactNode;
  onConfirm: (reason: string) => Promise<boolean>;
  isRider?: boolean;
}

const senderReasons = [
  'Changed my mind',
  'Found another delivery option',
  'Receiver not available',
  'Wrong address entered',
  'Other',
];

const riderReasons = [
  'Unable to reach pickup location',
  'Item too large for my vehicle',
  'Emergency situation',
  'Sender not responding',
  'Other',
];

export function CancelOrderModal({ trigger, onConfirm, isRider = false }: CancelOrderModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = isRider ? riderReasons : senderReasons;

  const handleConfirm = async () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason;
    if (!reason.trim()) return;

    setIsSubmitting(true);
    const success = await onConfirm(reason);
    setIsSubmitting(false);

    if (success) {
      setOpen(false);
      setSelectedReason('');
      setCustomReason('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Order
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this order? Please select a reason.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center space-x-2 py-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">{reason}</Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === 'Other' && (
            <Textarea
              className="mt-3"
              placeholder="Please describe your reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Keep Order</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === 'Other' && !customReason.trim()) || isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
