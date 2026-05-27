import { AlertTriangle, CheckCircle2, IndianRupee, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LiabilityDisclaimerProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  highlight?: boolean;
}

const guardrails = [
  'No loss/damage liability unless the rider is proven responsible',
  'Items above ₹20,000 are not supported',
  'Cash payments stay between sender and rider',
  'Droply connects people; it is not a logistics company',
];

export function LiabilityDisclaimer({ accepted, onAcceptChange, highlight = false }: LiabilityDisclaimerProps) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-xl border bg-background/80 p-4 shadow-sm transition-all duration-300',
          highlight ? 'border-destructive/70 ring-4 ring-destructive/10' : 'border-border',
          accepted && 'border-emerald-500/40 bg-emerald-500/5',
        )}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              accepted ? 'bg-emerald-500/15 text-emerald-600' : 'bg-destructive/10 text-destructive',
            )}
          >
            {accepted ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Safety terms</p>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  accepted ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
                )}
              >
                {accepted ? 'Accepted' : 'Required'}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {guardrails.map((item) => (
                <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <span>OTP-verified delivery</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <IndianRupee className="h-4 w-4 text-primary shrink-0" />
          <span>Pay after delivery</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>Verified riders only</span>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <Checkbox 
          id="liability-accept" 
          checked={accepted} 
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="liability-accept" className="text-sm leading-relaxed cursor-pointer">
          I understand that Droply is a peer-to-peer platform and I am sending items
          at my own risk. I confirm the item value is under ₹20,000 and agree to the terms above.
        </Label>
      </div>
    </div>
  );
}
