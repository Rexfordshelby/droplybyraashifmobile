import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bike,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Shuffle,
  User,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { triggerHapticTap } from '@/lib/appPreferences';

const hiddenRoutes = new Set(['/', '/auth', '/t']);

type NavItem =
  | {
      type: 'link';
      label: string;
      href: string;
      icon: typeof LayoutDashboard;
      badge?: number;
    }
  | {
      type: 'mode';
      label: string;
      icon: typeof Shuffle;
    };

export function MobileBottomNav() {
  const { user, hasRole } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const canUseRider = hasRole('rider');
  const isRiderView = location.pathname.startsWith('/rider');

  if (!user) return null;
  if ([...hiddenRoutes].some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`))) {
    return null;
  }

  const toggleWorkspace = () => {
    triggerHapticTap(18);

    if (canUseRider) {
      navigate(isRiderView ? '/dashboard' : '/rider');
      return;
    }

    navigate('/become-rider');
  };

  const items: NavItem[] = [
    { type: 'link', label: 'Orders', href: '/dashboard', icon: LayoutDashboard },
    { type: 'link', label: 'Send', href: '/send', icon: Send },
    {
      type: 'mode',
      label: canUseRider ? (isRiderView ? 'User' : 'Rider') : 'Apply',
      icon: canUseRider ? (isRiderView ? UserRound : Bike) : Bike,
    },
    hasRole('admin')
      ? { type: 'link', label: 'Admin', href: '/admin', icon: ShieldCheck }
      : { type: 'link', label: 'Alerts', href: '/notifications', icon: Bell, badge: unreadCount },
    { type: 'link', label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="native-tabbar fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-[0_-18px_45px_-32px_hsl(var(--foreground)/0.7)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.type === 'mode') {
            const active = canUseRider && isRiderView;

            return (
              <button
                key="workspace-mode"
                type="button"
                onClick={toggleWorkspace}
                className={cn(
                  'native-tab-item native-tab-toggle relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-muted-foreground transition-all duration-300 active:scale-95',
                  active && 'is-active bg-primary text-primary-foreground shadow-md',
                  !active && 'bg-primary/8 text-primary',
                )}
              >
                <span className="absolute -top-2 rounded-full border bg-background px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary shadow-sm">
                  Mode
                </span>
                <Icon className="mt-1 h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          }

          const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => triggerHapticTap()}
              className={cn(
                'native-tab-item relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-muted-foreground transition-all duration-300 active:scale-95',
                active && 'is-active bg-primary text-primary-foreground shadow-md',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="absolute right-1.5 top-1 h-4 min-w-4 px-1 text-[10px] leading-none">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
