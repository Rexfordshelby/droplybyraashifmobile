import { Link, useLocation } from 'react-router-dom';
import { Bell, Bike, LayoutDashboard, Send, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const hiddenRoutes = new Set(['/', '/auth', '/send', '/track', '/t']);

export function MobileBottomNav() {
  const { user, hasRole } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  if (!user) return null;
  if ([...hiddenRoutes].some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`))) {
    return null;
  }

  const items = [
    { label: 'Orders', href: '/dashboard', icon: LayoutDashboard, show: true },
    { label: 'Send', href: '/send', icon: Send, show: true },
    { label: 'Rider', href: '/rider', icon: Bike, show: hasRole('rider') },
    { label: 'Admin', href: '/admin', icon: ShieldCheck, show: hasRole('admin') },
    { label: 'Profile', href: '/profile', icon: User, show: true },
  ].filter((item) => item.show);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_36px_-30px_hsl(var(--foreground)/0.55)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-lg border bg-background/80 p-1">
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-semibold text-muted-foreground transition-all',
                active && 'bg-primary text-primary-foreground shadow-sm',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.href === '/profile' && unreadCount > 0 && (
                <Badge variant="destructive" className="absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          );
        })}
        {items.length < 5 && (
          <Link
            to="/notifications"
            className={cn(
              'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-semibold text-muted-foreground transition-all',
              location.pathname === '/notifications' && 'bg-primary text-primary-foreground shadow-sm',
            )}
          >
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Link>
        )}
      </div>
    </nav>
  );
}
