import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  PackageCheck,
  Phone,
  ReceiptText,
  Route,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  User,
  UserRound,
  Vibrate,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useOrders, Order } from '@/hooks/useOrders';
import { usePromos } from '@/hooks/usePromos';
import { useRider } from '@/hooks/useRider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AppPreferences,
  readAppPreferences,
  triggerHapticTap,
  writeAppPreferences,
} from '@/lib/appPreferences';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

const activeStatuses = new Set<Order['status']>(['pending', 'accepted', 'picked', 'in_transit']);

const preferenceRows: Array<{
  key: keyof AppPreferences;
  icon: typeof Sparkles;
  title: string;
  description: string;
}> = [
  {
    key: 'smoothMotion',
    icon: Sparkles,
    title: 'Smooth animations',
    description: 'Softer page changes and native-feeling taps.',
  },
  {
    key: 'hapticTaps',
    icon: Vibrate,
    title: 'Haptic taps',
    description: 'Tiny vibration feedback on phone actions.',
  },
  {
    key: 'compactCards',
    icon: SlidersHorizontal,
    title: 'Compact order cards',
    description: 'Tighter spacing for delivery-heavy days.',
  },
];

function getInitials(name?: string | null, fallback?: string | null) {
  const source = name?.trim() || fallback?.trim() || 'Droplix User';
  const parts = source.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatCurrency(value: number) {
  return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

function uniqueOrders(orders: Order[]) {
  return Array.from(new Map(orders.map((order) => [order.id, order])).values());
}

export default function ProfilePage() {
  const { user, loading: authLoading, roles, signOut } = useAuth();
  const { rider, toggleOnlineStatus } = useRider();
  const { orders, loading: ordersLoading } = useOrders();
  const { freeRemaining, promo, loading: promoLoading } = usePromos();
  const { unreadCount } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRiderStatus, setSavingRiderStatus] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(() => readAppPreferences());
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  const canUseRider = roles.includes('rider');
  const isAdmin = roles.includes('admin');
  const displayName = formData.full_name.trim() || profile?.full_name || user?.user_metadata?.full_name || 'Complete your profile';
  const email = profile?.email || user?.email || '';
  const accountDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'New account';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const senderOrders = useMemo(
    () => (user ? orders.filter((order) => order.sender_id === user.id) : []),
    [orders, user],
  );

  const riderOrders = useMemo(
    () => (rider ? orders.filter((order) => order.rider_id === rider.id) : []),
    [orders, rider],
  );

  const accountOrders = useMemo(
    () => uniqueOrders([...senderOrders, ...riderOrders]),
    [senderOrders, riderOrders],
  );

  const activeOrderCount = accountOrders.filter((order) => activeStatuses.has(order.status)).length;
  const completedOrderCount = accountOrders.filter((order) => order.status === 'delivered').length;
  const riderEarnings = riderOrders
    .filter((order) => order.status === 'delivered')
    .reduce((total, order) => total + Number(order.price_offered || 0), 0);

  const profileChecklist = useMemo(() => [
    { label: 'Name added', done: !!formData.full_name.trim() },
    { label: 'Email connected', done: !!email },
    { label: 'Phone ready', done: !!formData.phone.trim() },
    { label: 'Account role active', done: roles.length > 0 },
  ], [email, formData.full_name, formData.phone, roles.length]);

  const profileCompletion = Math.round(
    (profileChecklist.filter((item) => item.done).length / profileChecklist.length) * 100,
  );

  const handleSave = async () => {
    if (!user) return;

    const phone = formData.phone.trim();
    if (phone && !/^[+0-9 ()-]{7,18}$/.test(phone)) {
      toast({
        title: 'Check phone number',
        description: 'Use a valid phone number with digits, spaces, +, or -.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name.trim(),
        phone,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Profile not saved',
        description: 'Failed to update profile. Try again in a moment.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your mobile account hub is up to date.',
      });
      setProfile((prev) => prev ? { ...prev, full_name: formData.full_name.trim(), phone } : null);
    }

    setSaving(false);
  };

  const updatePreference = (key: keyof AppPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    writeAppPreferences(next);
    if (key === 'hapticTaps' && value) triggerHapticTap(18);
  };

  const handleRiderStatusToggle = async () => {
    if (!rider || savingRiderStatus) return;

    setSavingRiderStatus(true);
    try {
      await toggleOnlineStatus();
    } finally {
      setSavingRiderStatus(false);
    }
  };

  const goToWorkspace = (workspace: 'sender' | 'rider') => {
    triggerHapticTap(18);
    navigate(workspace === 'rider' ? '/rider' : '/dashboard');
  };

  const handleSignOut = async () => {
    triggerHapticTap(18);
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (authLoading || loading) {
    return (
      <MainLayout showFooter={false}>
        <div className="profile-mobile-canvas app-screen container max-w-5xl py-4 md:py-8">
          <section className="profile-cover-panel min-h-56">
            <div className="flex items-center gap-4">
              <div className="profile-avatar animate-soft-pulse" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-4 w-28 rounded-full bg-white/25" />
                <div className="h-8 w-44 rounded-full bg-white/30" />
                <div className="h-4 w-56 max-w-full rounded-full bg-white/20" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="profile-metric animate-soft-pulse" />
              <div className="profile-metric animate-soft-pulse" />
              <div className="profile-metric animate-soft-pulse" />
            </div>
          </section>
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <MainLayout showFooter={false}>
      <div className="profile-mobile-canvas app-screen container app-page-stack max-w-5xl py-4 md:py-8">
        <section className="profile-cover-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="profile-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials(displayName, email)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-primary text-primary-foreground">Droplix member</Badge>
                  {rider?.is_online && (
                    <Badge className="rounded-full bg-emerald-600 text-white">
                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-white animate-soft-pulse" />
                      Online rider
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 truncate font-heading text-2xl font-bold text-white md:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">{email || 'Add email to your account'}</p>
              </div>
            </div>
            <Button type="button" size="icon" variant="outline" className="profile-icon-button" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="profile-metric">
              <span>Active</span>
              <strong>{ordersLoading ? '-' : activeOrderCount}</strong>
              <small>orders moving</small>
            </div>
            <div className="profile-metric">
              <span>Completed</span>
              <strong>{ordersLoading ? '-' : completedOrderCount}</strong>
              <small>handoffs done</small>
            </div>
            <div className="profile-metric">
              <span>Credits</span>
              <strong>{promoLoading ? '-' : freeRemaining}</strong>
              <small>free deliveries</small>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border bg-background/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Profile strength</p>
                <p className="text-xs text-muted-foreground">A complete profile helps riders and receivers trust the handoff.</p>
              </div>
              <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="mt-3 h-2 bg-muted" />
          </div>
        </section>

        <section className="profile-action-strip hidden md:grid" aria-label="Workspace shortcuts">
          <button type="button" onClick={() => goToWorkspace('sender')} className="profile-action-tile">
            <LayoutDashboard className="h-5 w-5" />
            <span>Orders</span>
          </button>
          <Link to="/send" className="profile-action-tile">
            <Send className="h-5 w-5" />
            <span>Send</span>
          </Link>
          <Link to="/notifications" className="profile-action-tile">
            <Bell className="h-5 w-5" />
            <span>Alerts</span>
            {unreadCount > 0 && <em>{unreadCount}</em>}
          </Link>
          <button
            type="button"
            onClick={() => (canUseRider ? goToWorkspace('rider') : navigate('/become-rider'))}
            className="profile-action-tile"
          >
            <Bike className="h-5 w-5" />
            <span>{canUseRider ? 'Rider' : 'Apply'}</span>
          </button>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="profile-section">
            <div className="profile-section-header">
              <div>
                <p className="profile-eyebrow">Identity</p>
                <h2>Profile details</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                {accountDate}
              </Badge>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <div className="profile-input-wrap">
                    <User className="h-4 w-4" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, full_name: event.target.value }))}
                      className="profile-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="profile-input-wrap is-disabled">
                    <Mail className="h-4 w-4" />
                    <Input id="email" value={email} disabled className="profile-input" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="profile-input-wrap">
                    <Phone className="h-4 w-4" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                      className="profile-input"
                      placeholder="+91 XXXXX XXXXX"
                      inputMode="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {profileChecklist.map((item) => (
                  <div key={item.label} className={cn('profile-check-row', item.done && 'is-done')}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} className="btn-gradient h-12 w-full rounded-xl">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-header">
              <div>
                <p className="profile-eyebrow">Workspace</p>
                <h2>Mode control</h2>
              </div>
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              <button type="button" className="profile-mode-row" onClick={() => goToWorkspace('sender')}>
                <div className="profile-mode-icon bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p>User workspace</p>
                  <span>Create, track, share, and receive updates.</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>

              {canUseRider ? (
                <button type="button" className="profile-mode-row" onClick={() => goToWorkspace('rider')}>
                  <div className="profile-mode-icon bg-emerald-500/10 text-emerald-600">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div>
                    <p>Rider workspace</p>
                    <span>Accept deliveries and manage handoffs.</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <Link to="/become-rider" className="profile-mode-row">
                  <div className="profile-mode-icon bg-warning/20 text-warning-foreground">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div>
                    <p>Become a rider</p>
                    <span>Apply and start receiving delivery requests.</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}

              {rider && (
                <div className={cn(
                  'profile-rider-status',
                  rider.is_online ? 'is-online' : 'is-offline',
                )}>
                  <div className="min-w-0">
                    <p>{rider.is_online ? 'Online for new requests' : 'Offline from requests'}</p>
                    <span>
                      {rider.status === 'approved'
                        ? `${rider.vehicle_type} rider profile`
                        : `Rider status: ${rider.status}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {savingRiderStatus && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <Switch
                      checked={!!rider.is_online}
                      onCheckedChange={handleRiderStatusToggle}
                      disabled={savingRiderStatus || rider.status !== 'approved'}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="profile-section lg:col-span-2">
            <div className="profile-section-header">
              <div>
                <p className="profile-eyebrow">Account center</p>
                <h2>Useful controls</h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link to="/notifications" className="profile-menu-row">
                <span className="profile-menu-icon"><Bell className="h-4 w-4" /></span>
                <div>
                  <p>Notifications</p>
                  <small>{unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}</small>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="profile-menu-row">
                <span className="profile-menu-icon"><PackageCheck className="h-4 w-4" /></span>
                <div>
                  <p>Order history</p>
                  <small>{accountOrders.length} total orders in view</small>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/send" className="profile-menu-row">
                <span className="profile-menu-icon"><Route className="h-4 w-4" /></span>
                <div>
                  <p>Book delivery</p>
                  <small>Start a clean pickup to drop flow</small>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="profile-menu-row">
                <span className="profile-menu-icon"><ReceiptText className="h-4 w-4" /></span>
                <div>
                  <p>Receipts</p>
                  <small>Open delivered orders to download</small>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
              {isAdmin && (
                <Link to="/admin" className="profile-menu-row sm:col-span-2">
                  <span className="profile-menu-icon"><BadgeCheck className="h-4 w-4" /></span>
                  <div>
                    <p>Admin operations</p>
                    <small>Manage orders, users, riders, and zones</small>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-header">
              <div>
                <p className="profile-eyebrow">Wallet</p>
                <h2>Credits</h2>
              </div>
              <Wallet className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="profile-wallet-panel">
                <Gift className="h-5 w-5" />
                <div>
                  <p>{promoLoading ? '-' : freeRemaining} free deliveries</p>
                  <span>{promo?.total_free_used ?? 0} credits used so far</span>
                </div>
              </div>
              <div className="profile-wallet-panel muted">
                <Clock3 className="h-5 w-5" />
                <div>
                  <p>{formatCurrency(riderEarnings)}</p>
                  <span>Completed rider earnings estimate</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="profile-section">
          <div className="profile-section-header">
            <div>
              <p className="profile-eyebrow">Phone experience</p>
              <h2>App feel</h2>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {preferenceRows.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.key} className="profile-preference-row">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="profile-menu-icon">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p>{item.title}</p>
                      <span>{item.description}</span>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[item.key]}
                    onCheckedChange={(checked) => updatePreference(item.key, checked)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-header">
            <div>
              <p className="profile-eyebrow">Access</p>
              <h2>Roles and trust</h2>
            </div>
            <Badge variant="outline" className="rounded-full">{roles.length} active</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <div key={role} className="profile-role-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="capitalize">{role === 'sender' ? 'User' : role}</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span>
                  {role === 'sender' && 'Can create and track delivery orders.'}
                  {role === 'rider' && 'Can accept and complete delivery orders.'}
                  {role === 'admin' && 'Can manage platform operations.'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
