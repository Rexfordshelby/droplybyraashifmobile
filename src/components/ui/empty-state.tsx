import { forwardRef, ReactNode } from 'react';
import { Package, Truck, Inbox, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateVariant = 'orders' | 'deliveries' | 'inbox' | 'locations' | 'search';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  children?: ReactNode;
}

const icons: Record<EmptyStateVariant, typeof Package> = {
  orders: Package,
  deliveries: Truck,
  inbox: Inbox,
  locations: MapPin,
  search: Search,
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ variant = 'orders', title, description, action, className, children }, ref) => {
    const Icon = icons[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 text-center',
          className
        )}
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-full p-6">
            <Icon className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

        {action && (
          action.href ? (
            <Button asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )
        )}

        {children}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
