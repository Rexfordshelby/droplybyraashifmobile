import { Check, Clock, Package, Truck, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/hooks/useOrders';
import { format } from 'date-fns';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: typeof Check;
  timestamp?: string;
}

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  createdAt: string;
  pickedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  className?: string;
}

export function OrderTimeline({
  currentStatus,
  createdAt,
  pickedAt,
  deliveredAt,
  cancelledAt,
  className,
}: OrderTimelineProps) {
  const isCancelled = currentStatus === 'cancelled';

  const steps: TimelineStep[] = isCancelled
    ? [
        { status: 'pending', label: 'Order Placed', icon: Clock, timestamp: createdAt },
        { status: 'cancelled', label: 'Cancelled', icon: X, timestamp: cancelledAt || undefined },
      ]
    : [
        { status: 'pending', label: 'Order Placed', icon: Clock, timestamp: createdAt },
        { status: 'accepted', label: 'Rider Assigned', icon: Package },
        { status: 'picked', label: 'Picked Up', icon: MapPin, timestamp: pickedAt || undefined },
        { status: 'in_transit', label: 'On The Way', icon: Truck },
        { status: 'delivered', label: 'Delivered', icon: Check, timestamp: deliveredAt || undefined },
      ];

  const statusOrder: OrderStatus[] = ['pending', 'accepted', 'picked', 'in_transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  const getStepState = (stepStatus: OrderStatus) => {
    if (isCancelled) {
      if (stepStatus === 'cancelled') return 'cancelled';
      return 'completed';
    }
    const stepIndex = statusOrder.indexOf(stepStatus);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => {
        const state = getStepState(step.status);
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  state === 'completed' && 'bg-primary border-primary text-primary-foreground',
                  state === 'current' && 'border-primary bg-primary/15 text-primary animate-soft-pulse shadow-[0_0_20px_hsl(var(--primary)/0.35)]',
                  state === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground/50',
                  state === 'cancelled' && 'bg-destructive border-destructive text-destructive-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-8 my-1',
                    state === 'completed' || state === 'current'
                      ? 'bg-primary'
                      : 'bg-muted-foreground/20',
                    state === 'cancelled' && 'bg-destructive'
                  )}
                />
              )}
            </div>
            <div className="flex-1 pt-2">
              <p
                className={cn(
                  'font-medium',
                  state === 'upcoming' && 'text-muted-foreground',
                  state === 'cancelled' && 'text-destructive'
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(step.timestamp), 'PPp')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
