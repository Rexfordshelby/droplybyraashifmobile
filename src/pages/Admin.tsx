import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Bike,
  CheckCircle,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Truck,
  UserCheck,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdminData, type AdminRider, type ServiceZone } from '@/hooks/useAdminData';
import { useAuth } from '@/hooks/useAuth';
import type { Order, OrderStatus } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';

type RiderFilter = 'all' | AdminRider['status'];
type OrderFilter = 'all' | OrderStatus;
type ZoneFilter = 'all' | 'active' | 'inactive';

const orderStatuses: OrderStatus[] = ['pending', 'accepted', 'picked', 'in_transit', 'delivered', 'cancelled'];

const statusTone: Record<string, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  accepted: 'border-sky-500/30 bg-sky-500/10 text-sky-700',
  picked: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700',
  in_transit: 'border-primary/30 bg-primary/10 text-primary',
  delivered: 'border-success/30 bg-success/10 text-success',
  cancelled: 'border-destructive/30 bg-destructive/10 text-destructive',
  approved: 'border-success/30 bg-success/10 text-success',
  suspended: 'border-destructive/30 bg-destructive/10 text-destructive',
  active: 'border-success/30 bg-success/10 text-success',
  inactive: 'border-muted-foreground/30 bg-muted text-muted-foreground',
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function formatRelative(value?: string | null) {
  if (!value) return 'Unknown time';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function includesText(source: string | null | undefined, query: string) {
  return source?.toLowerCase().includes(query) ?? false;
}

function getOrderCode(order: Order) {
  return order.tracking_code || `#${order.id.slice(0, 8).toUpperCase()}`;
}

function getIssueReason(order: Order) {
  const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

  if (order.status === 'cancelled') return order.cancellation_reason || 'Cancelled order';
  if (order.status === 'pending' && ageMinutes >= 30) return `Pending for ${ageMinutes} minutes`;
  if (order.status === 'accepted' && ageMinutes >= 90) return `Pickup not confirmed after ${ageMinutes} minutes`;
  if ((order.status === 'picked' || order.status === 'in_transit') && ageMinutes >= 180) return `Delivery running ${ageMinutes} minutes`;
  if (!order.receiver_phone && order.status !== 'delivered') return 'Missing receiver phone';

  return null;
}

function getNextOrderStatuses(order: Order): OrderStatus[] {
  if (order.status === 'delivered' || order.status === 'cancelled') return [];

  if (order.status === 'pending') {
    return order.rider_id ? ['accepted', 'cancelled'] : ['cancelled'];
  }

  if (order.status === 'accepted') return ['picked', 'cancelled'];
  if (order.status === 'picked') return ['in_transit', 'cancelled'];
  if (order.status === 'in_transit') return ['delivered', 'cancelled'];

  return ['cancelled'];
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-700',
    success: 'bg-success/10 text-success',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];

  return (
    <Card className="card-elevated overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 truncate text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', toneClass)}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
      <Icon className="h-9 w-9 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('capitalize', statusTone[status] ?? statusTone.inactive)}>
      {formatLabel(status)}
    </Badge>
  );
}

export default function Admin() {
  const { user, loading: authLoading, hasRole, refetchRoles } = useAuth();
  const {
    riders,
    orders,
    zones,
    stats,
    loading,
    approveRider,
    suspendRider,
    updateOrderStatus,
    updateZone,
    createZone,
    refetch,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState('overview');
  const [riderSearch, setRiderSearch] = useState('');
  const [riderFilter, setRiderFilter] = useState<RiderFilter>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [adminRoleCheck, setAdminRoleCheck] = useState<'idle' | 'checking' | 'done'>('idle');

  const liveZoneCount = zones.filter((zone) => zone.is_active).length;
  const deliveredOrders = orders.filter((order) => order.status === 'delivered');
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled');
  const platformCovered = orders.reduce((sum, order) => sum + Number(order.platform_paid_amount ?? 0), 0);
  const collectedAmount = orders.reduce((sum, order) => sum + Number(order.sender_paid_amount ?? order.price_offered ?? 0), 0);
  const conversionRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
  const queueHealth = stats.pendingOrders + stats.pendingRiders;

  const filteredRiders = useMemo(() => {
    const query = riderSearch.trim().toLowerCase();

    return riders.filter((rider) => {
      const matchesFilter = riderFilter === 'all' || rider.status === riderFilter;
      const matchesQuery =
        !query ||
        includesText(rider.profile?.full_name, query) ||
        includesText(rider.profile?.email, query) ||
        includesText(rider.profile?.phone, query) ||
        includesText(rider.vehicle_type, query);

      return matchesFilter && matchesQuery;
    });
  }, [riderFilter, riderSearch, riders]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter = orderFilter === 'all' || order.status === orderFilter;
      const matchesQuery =
        !query ||
        includesText(order.tracking_code, query) ||
        includesText(order.id, query) ||
        includesText(order.pickup_address, query) ||
        includesText(order.drop_address, query) ||
        includesText(order.sender_phone, query) ||
        includesText(order.receiver_phone, query) ||
        includesText(order.item_description, query);

      return matchesFilter && matchesQuery;
    });
  }, [orderFilter, orderSearch, orders]);

  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      if (zoneFilter === 'active') return zone.is_active;
      if (zoneFilter === 'inactive') return !zone.is_active;
      return true;
    });
  }, [zoneFilter, zones]);

  const pendingRiders = riders.filter((rider) => rider.status === 'pending');
  const priorityOrders = orders.filter((order) => ['pending', 'accepted', 'picked', 'in_transit'].includes(order.status));
  const issueOrders = orders
    .map((order) => ({ order, reason: getIssueReason(order) }))
    .filter((item): item is { order: Order; reason: string } => Boolean(item.reason));

  useEffect(() => {
    setAdminRoleCheck('idle');
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user || hasRole('admin') || adminRoleCheck !== 'idle') return;

    setAdminRoleCheck('checking');
    void refetchRoles().finally(() => setAdminRoleCheck('done'));
  }, [adminRoleCheck, authLoading, hasRole, refetchRoles, user]);

  const runAction = async (id: string, action: () => Promise<void>) => {
    setActioningId(id);
    try {
      await action();
    } finally {
      setActioningId(null);
    }
  };

  const handleZoneTextBlur = (
    zone: ServiceZone,
    field: 'name' | 'city',
    value: string,
  ) => {
    const nextValue = value.trim();
    if (!nextValue || nextValue === zone[field]) return;

    void runAction(`zone-${zone.id}`, () => updateZone(zone.id, { [field]: nextValue }));
  };

  const handleZoneNumberBlur = (
    zone: ServiceZone,
    field: 'base_price' | 'price_per_km',
    value: string,
  ) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue === Number(zone[field])) return;

    void runAction(`zone-${zone.id}`, () => updateZone(zone.id, { [field]: nextValue }));
  };

  const renderRiderActions = (rider: AdminRider) => {
    const busy = actioningId === `rider-${rider.id}`;

    if (rider.status === 'pending') {
      return (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            size="sm"
            className="btn-shine"
            disabled={Boolean(actioningId)}
            onClick={() => void runAction(`rider-${rider.id}`, () => approveRider(rider.id))}
          >
            <CheckCircle className="h-4 w-4" />
            {busy ? 'Saving' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={Boolean(actioningId)}
            onClick={() => void runAction(`rider-${rider.id}`, () => suspendRider(rider.id))}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      );
    }

    if (rider.status === 'approved') {
      return (
        <Button
          size="sm"
          variant="destructive"
          disabled={Boolean(actioningId)}
          onClick={() => void runAction(`rider-${rider.id}`, () => suspendRider(rider.id))}
        >
          <XCircle className="h-4 w-4" />
          {busy ? 'Saving' : 'Suspend'}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        disabled={Boolean(actioningId)}
        onClick={() => void runAction(`rider-${rider.id}`, () => approveRider(rider.id))}
      >
        <UserCheck className="h-4 w-4" />
        {busy ? 'Saving' : 'Reactivate'}
      </Button>
    );
  };

  const renderOrderStatusControl = (order: Order) => {
    const nextStatuses = getNextOrderStatuses(order);
    const busy = actioningId === `order-${order.id}`;

    if (nextStatuses.length === 0) {
      return <span className="text-xs font-medium text-muted-foreground">Locked</span>;
    }

    return (
      <Select
        value={order.status}
        disabled={Boolean(actioningId)}
        onValueChange={(value) =>
          void runAction(`order-${order.id}`, () => updateOrderStatus(order.id, value as OrderStatus))
        }
      >
        <SelectTrigger className="h-9 min-w-[148px] bg-background">
          <SelectValue>{busy ? 'Updating' : formatLabel(order.status)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={order.status}>{formatLabel(order.status)}</SelectItem>
          {nextStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {formatLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (authLoading || (user && !hasRole('admin') && adminRoleCheck !== 'done')) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasRole('admin')) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-7xl px-4 py-5 sm:py-8">
        <section className="mb-6 overflow-hidden rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  Admin console
                </Badge>
                <Badge variant="outline" className={cn(queueHealth > 0 ? statusTone.pending : statusTone.delivered)}>
                  {queueHealth > 0 ? `${queueHealth} needs review` : 'Operations clear'}
                </Badge>
              </div>
              <h1 className="font-heading text-2xl font-bold tracking-normal text-foreground sm:text-4xl">
                Droplix operations
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Live coverage, rider readiness, and order flow for Mumbai operations.
              </p>
              <p className="mt-3 truncate text-xs text-muted-foreground sm:text-sm">
                Signed in as {user.email}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-success" />
                  Live zones
                </div>
                <p className="mt-1 text-2xl font-bold">{liveZoneCount}</p>
                <p className="text-xs text-muted-foreground">of {zones.length || 0} configured</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Bike className="h-4 w-4 text-primary" />
                  Online riders
                </div>
                <p className="mt-1 text-2xl font-bold">{stats.onlineRiders}</p>
                <p className="text-xs text-muted-foreground">{stats.totalRiders} approved</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Success rate
                </div>
                <p className="mt-1 text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">{cancelledOrders.length} cancelled</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview" className="h-10 gap-2 text-xs sm:text-sm">
              <Eye className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="riders" className="h-10 gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Riders
            </TabsTrigger>
            <TabsTrigger value="orders" className="h-10 gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="zones" className="h-10 gap-2 text-xs sm:text-sm">
              <MapPin className="h-4 w-4" />
              Zones
            </TabsTrigger>
            <TabsTrigger value="issues" className="h-10 gap-2 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              Issues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total orders"
                value={stats.totalOrders}
                hint={`${stats.pendingOrders} waiting for a rider`}
                icon={Package}
                tone={stats.pendingOrders > 0 ? 'warning' : 'default'}
              />
              <MetricCard
                title="Rider capacity"
                value={stats.onlineRiders}
                hint={`${stats.totalRiders} approved riders`}
                icon={Truck}
                tone={stats.onlineRiders > 0 ? 'success' : 'warning'}
              />
              <MetricCard
                title="Needs approval"
                value={stats.pendingRiders}
                hint="new rider applications"
                icon={Clock3}
                tone={stats.pendingRiders > 0 ? 'warning' : 'success'}
              />
              <MetricCard
                title="Cash handled"
                value={formatCurrency(collectedAmount)}
                hint={`${formatCurrency(platformCovered)} promo covered`}
                icon={CircleDollarSign}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <Card className="card-elevated">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Live order queue</CardTitle>
                    <CardDescription>Orders that still need movement or monitoring</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <EmptyPanel icon={Activity} title="Loading operations" detail="Fetching the latest orders and riders." />
                  ) : priorityOrders.length === 0 ? (
                    <EmptyPanel icon={CheckCircle} title="Queue is clear" detail="No active orders need attention right now." />
                  ) : (
                    <div className="space-y-3">
                      {priorityOrders.slice(0, 6).map((order) => (
                        <div
                          key={order.id}
                          className="grid gap-3 rounded-lg border bg-background/70 p-3 transition-colors hover:bg-muted/30 lg:grid-cols-[1fr_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-sm font-semibold">{getOrderCode(order)}</p>
                              <StatusBadge status={order.status} />
                              {!order.rider_id && order.status !== 'cancelled' && (
                                <Badge variant="outline" className={statusTone.pending}>
                                  no rider
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 truncate text-sm font-medium">{order.pickup_address}</p>
                            <p className="truncate text-sm text-muted-foreground">{order.drop_address}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatCurrency(order.price_offered)} · {formatRelative(order.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center">{renderOrderStatusControl(order)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Rider approvals</CardTitle>
                  <CardDescription>Verify applicants before they can accept orders</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <EmptyPanel icon={Users} title="Loading riders" detail="Checking pending applications." />
                  ) : pendingRiders.length === 0 ? (
                    <EmptyPanel icon={ShieldCheck} title="No pending riders" detail="Every applicant has been reviewed." />
                  ) : (
                    <div className="space-y-3">
                      {pendingRiders.slice(0, 5).map((rider) => (
                        <div key={rider.id} className="rounded-lg border bg-background/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{rider.profile?.full_name || 'Unnamed rider'}</p>
                              <p className="truncate text-sm text-muted-foreground">{rider.profile?.email || 'No email'}</p>
                              <p className="text-xs capitalize text-muted-foreground">
                                {rider.vehicle_type} · applied {formatRelative(rider.created_at)}
                              </p>
                            </div>
                            <StatusBadge status={rider.status} />
                          </div>
                          <div className="mt-3">{renderRiderActions(rider)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Coverage
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {liveZoneCount} of {zones.length || 0} service zones are ready for new bookings.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Access
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Signed-in admin role verified for {user.email}.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Open work
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stats.pendingOrders} orders and {stats.pendingRiders} rider applications need review.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="riders" className="space-y-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Rider management</CardTitle>
                <CardDescription>Applications, availability, and account status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_210px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={riderSearch}
                      onChange={(event) => setRiderSearch(event.target.value)}
                      placeholder="Search riders, email, phone, vehicle"
                      className="pl-9"
                    />
                  </div>
                  <Select value={riderFilter} onValueChange={(value) => setRiderFilter(value as RiderFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All riders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <EmptyPanel icon={Users} title="Loading riders" detail="Pulling the latest rider list." />
                ) : filteredRiders.length === 0 ? (
                  <EmptyPanel icon={Filter} title="No riders found" detail="Try clearing the search or changing the filter." />
                ) : (
                  <div className="grid gap-3">
                    {filteredRiders.map((rider) => (
                      <div
                        key={rider.id}
                        className="grid gap-4 rounded-lg border bg-background/70 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[1fr_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{rider.profile?.full_name || 'Unnamed rider'}</p>
                            <StatusBadge status={rider.status} />
                            {rider.is_online && rider.status === 'approved' && (
                              <Badge variant="outline" className={statusTone.active}>
                                online
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                            <span className="truncate">{rider.profile?.email || 'No email'}</span>
                            <span className="truncate">{rider.profile?.phone || 'No phone'}</span>
                            <span className="capitalize">{rider.vehicle_type}</span>
                            <span>Joined {formatRelative(rider.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center lg:justify-end">{renderRiderActions(rider)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Order command center</CardTitle>
                <CardDescription>Tracking codes, routes, fares, and order state</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search tracking, phone, pickup, drop"
                      className="pl-9"
                    />
                  </div>
                  <Select value={orderFilter} onValueChange={(value) => setOrderFilter(value as OrderFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All orders</SelectItem>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <EmptyPanel icon={Package} title="Loading orders" detail="Fetching recent order activity." />
                ) : filteredOrders.length === 0 ? (
                  <EmptyPanel icon={ClipboardList} title="No orders found" detail="Try another status or search term." />
                ) : (
                  <>
                    <div className="grid gap-3 lg:hidden">
                      {filteredOrders.slice(0, 40).map((order) => (
                        <div key={order.id} className="rounded-lg border bg-background/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-sm font-semibold">{getOrderCode(order)}</p>
                            <StatusBadge status={order.status} />
                          </div>
                          <div className="mt-3 space-y-2 text-sm">
                            <div>
                              <p className="text-xs font-medium uppercase text-muted-foreground">Pickup</p>
                              <p className="line-clamp-2">{order.pickup_address}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase text-muted-foreground">Drop</p>
                              <p className="line-clamp-2">{order.drop_address}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-muted/50 p-2">
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="font-semibold">{formatCurrency(order.price_offered)}</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2">
                              <p className="text-xs text-muted-foreground">Created</p>
                              <p className="font-semibold">{formatRelative(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="mt-3">{renderOrderStatusControl(order)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden overflow-hidden rounded-lg border lg:block">
                      <table className="w-full min-w-[920px]">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Order
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Route
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Price
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Created
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.slice(0, 60).map((order) => (
                            <tr key={order.id} className="border-t transition-colors hover:bg-muted/30">
                              <td className="px-4 py-3 align-top">
                                <p className="font-mono text-sm font-semibold">{getOrderCode(order)}</p>
                                <p className="text-xs text-muted-foreground">{order.sender_phone}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="max-w-[280px] truncate text-sm font-medium">{order.pickup_address}</p>
                                <p className="max-w-[280px] truncate text-sm text-muted-foreground">{order.drop_address}</p>
                              </td>
                              <td className="px-4 py-3 align-top text-sm font-semibold">
                                {formatCurrency(order.price_offered)}
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                                {formatRelative(order.created_at)}
                              </td>
                              <td className="px-4 py-3 align-top">{renderOrderStatusControl(order)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones" className="space-y-4">
            <Card className="card-elevated">
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Service zones and pricing</CardTitle>
                  <CardDescription>City coverage, launch status, and rider pricing</CardDescription>
                </div>
                <Button
                  className="btn-gradient btn-shine w-full sm:w-auto"
                  disabled={Boolean(actioningId)}
                  onClick={() => void runAction('zone-new', () => createZone())}
                >
                  <Plus className="h-4 w-4" />
                  Add zone
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {liveZoneCount} active zones · {zones.length - liveZoneCount} paused
                  </div>
                  <Select value={zoneFilter} onValueChange={(value) => setZoneFilter(value as ZoneFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      <SelectItem value="active">Active only</SelectItem>
                      <SelectItem value="inactive">Paused only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <EmptyPanel icon={MapPin} title="Loading zones" detail="Fetching service coverage and pricing." />
                ) : filteredZones.length === 0 ? (
                  <EmptyPanel icon={SlidersHorizontal} title="No zones found" detail="Change the filter or add a new zone." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredZones.map((zone) => (
                      <div
                        key={zone.id}
                        className={cn(
                          'rounded-lg border bg-background/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                          !zone.is_active && 'opacity-75',
                        )}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <StatusBadge status={zone.is_active ? 'active' : 'inactive'} />
                            <p className="mt-2 truncate text-lg font-semibold">{zone.name}</p>
                            <p className="truncate text-sm text-muted-foreground">{zone.city}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={zone.is_active ? 'outline' : 'default'}
                            disabled={Boolean(actioningId)}
                            onClick={() =>
                              void runAction(`zone-${zone.id}`, () => updateZone(zone.id, { is_active: !zone.is_active }))
                            }
                          >
                            {zone.is_active ? 'Pause' : 'Enable'}
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm font-medium">
                            Zone name
                            <Input
                              defaultValue={zone.name}
                              className="mt-1"
                              onBlur={(event) => handleZoneTextBlur(zone, 'name', event.currentTarget.value)}
                            />
                          </label>
                          <label className="block text-sm font-medium">
                            City
                            <Input
                              defaultValue={zone.city}
                              className="mt-1"
                              onBlur={(event) => handleZoneTextBlur(zone, 'city', event.currentTarget.value)}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block text-sm font-medium">
                              Base
                              <Input
                                type="number"
                                min="0"
                                defaultValue={zone.base_price}
                                className="mt-1"
                                onBlur={(event) => handleZoneNumberBlur(zone, 'base_price', event.currentTarget.value)}
                              />
                            </label>
                            <label className="block text-sm font-medium">
                              Per km
                              <Input
                                type="number"
                                min="0"
                                defaultValue={zone.price_per_km}
                                className="mt-1"
                                onBlur={(event) => handleZoneNumberBlur(zone, 'price_per_km', event.currentTarget.value)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card className="card-elevated">
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Support queue</CardTitle>
                  <CardDescription>Cancelled, stuck, or incomplete orders that may need admin attention</CardDescription>
                </div>
                <Badge variant={issueOrders.length > 0 ? 'destructive' : 'secondary'} className="w-fit">
                  {issueOrders.length} issues
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <EmptyPanel icon={AlertTriangle} title="Loading issues" detail="Checking operational exceptions." />
                ) : issueOrders.length === 0 ? (
                  <EmptyPanel icon={CheckCircle} title="No support issues" detail="Cancelled and stuck-order queues are clear." />
                ) : (
                  <div className="grid gap-3">
                    {issueOrders.slice(0, 60).map(({ order, reason }) => (
                      <div
                        key={order.id}
                        className="grid gap-4 rounded-lg border bg-background/70 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[1fr_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-semibold">{getOrderCode(order)}</p>
                            <StatusBadge status={order.status} />
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                              {reason}
                            </Badge>
                          </div>
                          <p className="mt-2 truncate text-sm font-medium">{order.pickup_address}</p>
                          <p className="truncate text-sm text-muted-foreground">{order.drop_address}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sender {order.sender_phone} · Receiver {order.receiver_phone || 'not provided'} · {formatRelative(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center lg:justify-end">{renderOrderStatusControl(order)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
