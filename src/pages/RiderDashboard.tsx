import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  Navigation,
  PackageSearch,
  Power,
  Radio,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderCard } from "@/components/orders/OrderCard";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useRider } from "@/hooks/useRider";

const activeStatuses = ["accepted", "picked", "in_transit"] as const;
type QueueSort = "recommended" | "payout" | "distance" | "newest";

function formatRupees(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getRiderNextAction(status?: string) {
  if (status === "accepted") return "Go to pickup and scan the sender QR.";
  if (status === "picked") return "Navigate to the drop point and mark arrival.";
  if (status === "in_transit") return "Meet receiver and verify delivery OTP.";
  return "Go online and accept one clean delivery.";
}

export default function RiderDashboard() {
  const { user, loading: authLoading, hasRole } = useAuth();
  const { rider, loading: riderLoading, toggleOnlineStatus } = useRider();
  const { orders, loading: ordersLoading, acceptOrder, updateOrderStatus, cancelOrder, uploadDeliveryProof } = useOrders();
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [queueSort, setQueueSort] = useState<QueueSort>("recommended");

  const isLoading = authLoading || riderLoading || ordersLoading;

  const activeOrders = useMemo(() => {
    if (!rider) return [];
    return orders.filter((order) => (
      order.rider_id === rider.id &&
      activeStatuses.includes(order.status as (typeof activeStatuses)[number])
    ));
  }, [orders, rider]);

  const deliveredToday = useMemo(() => {
    if (!rider) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((order) => (
      order.rider_id === rider.id &&
      order.status === "delivered" &&
      order.delivered_at &&
      new Date(order.delivered_at) >= today
    ));
  }, [orders, rider]);

  const todayEarnings = deliveredToday.reduce((sum, order) => {
    return sum + Number(order.sender_paid_amount || order.platform_paid_amount || order.price_offered || 0);
  }, 0);

  const cashEarnings = deliveredToday.reduce((sum, order) => {
    return sum + Number(order.sender_paid_amount || (!order.is_promo_free ? order.price_offered : 0));
  }, 0);

  const droplyCoveredEarnings = deliveredToday.reduce((sum, order) => {
    return sum + Number(order.platform_paid_amount || (order.is_promo_free ? order.price_offered : 0));
  }, 0);

  const averagePayout = deliveredToday.length ? Math.round(todayEarnings / deliveredToday.length) : 0;

  const pendingQueue = useMemo(() => {
    return orders.filter((order) => order.status === "pending" && order.sender_id !== user?.id);
  }, [orders, user?.id]);

  const availableOrders = useMemo(() => {
    if (!rider?.is_online || activeOrders.length > 0) return [];
    return orders.filter((order) => (
      order.status === "pending" &&
      order.sender_id !== user?.id &&
      !skippedIds.has(order.id)
    ));
  }, [activeOrders.length, orders, rider?.is_online, skippedIds, user?.id]);

  const sortedAvailableOrders = useMemo(() => {
    const items = [...availableOrders];

    return items.sort((a, b) => {
      if (queueSort === "payout") {
        return Number(b.price_offered || 0) - Number(a.price_offered || 0);
      }

      if (queueSort === "distance") {
        return Number(a.distance_km || 999) - Number(b.distance_km || 999);
      }

      if (queueSort === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      const aScore = Number(a.price_offered || 0) / Math.max(Number(a.distance_km || 1), 1);
      const bScore = Number(b.price_offered || 0) / Math.max(Number(b.distance_km || 1), 1);
      return bScore - aScore;
    });
  }, [availableOrders, queueSort]);

  const focusOrder = activeOrders[0] ?? sortedAvailableOrders[0] ?? null;
  const focusPayout = focusOrder
    ? Number(focusOrder.sender_paid_amount || focusOrder.platform_paid_amount || focusOrder.price_offered || 0)
    : 0;

  const demandLabel = pendingQueue.length >= 4 ? "High demand" : pendingQueue.length > 0 ? "Orders waiting" : "Calm";
  const demandTone = pendingQueue.length >= 4 ? "text-emerald-700" : pendingQueue.length > 0 ? "text-primary" : "text-muted-foreground";

  const readinessItems = [
    {
      label: "Approved rider profile",
      ready: rider?.status === "approved",
      detail: rider?.status === "approved" ? "Ready for dispatch" : "Approval required",
    },
    {
      label: "Online for requests",
      ready: !!rider?.is_online,
      detail: rider?.is_online ? "Listening live" : "Switch on to receive orders",
    },
    {
      label: "One-order focus",
      ready: activeOrders.length === 0,
      detail: activeOrders.length === 0 ? "Open for a new order" : "Finish current delivery",
    },
  ];

  const handleOnlineChange = async () => {
    if (!rider || isSavingStatus || rider.status !== "approved") return;

    setIsSavingStatus(true);
    try {
      await toggleOnlineStatus();
    } finally {
      setIsSavingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasRole("rider") && !rider) return <Navigate to="/become-rider" replace />;

  if (!rider) {
    return (
      <MainLayout showFooter={false}>
        <div className="container py-16 max-w-lg text-center">
          <Bike className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Rider profile missing</h1>
          <p className="text-muted-foreground mb-6">
            Your rider role exists, but we could not find the matching rider profile. Re-apply or contact support.
          </p>
          <Button asChild className="btn-gradient">
            <Link to="/become-rider">Open rider setup</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const canAccept = rider.is_online && activeOrders.length === 0;

  return (
    <MainLayout showFooter={false}>
      <div className="container py-6 md:py-8">
        <section className="mb-6 overflow-hidden rounded-lg border bg-card/90 shadow-sm backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-primary via-emerald-400 to-warning" />
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px] lg:p-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <Bike className="h-4 w-4" />
                    Rider command center
                  </div>
                  <h1 className="font-heading text-3xl font-bold">Rider Dashboard</h1>
                  <p className="mt-2 max-w-2xl text-muted-foreground">
                    Stay online, pick one clean delivery, verify pickup, then finish with receiver OTP.
                  </p>
                </div>
                <Badge variant={rider.is_online ? "default" : "secondary"} className="w-fit gap-1.5">
                  <Radio className={`h-3.5 w-3.5 ${rider.is_online ? "animate-soft-pulse" : ""}`} />
                  {rider.is_online ? "Live" : "Paused"}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="stat-tile">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Queue</span>
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{pendingQueue.length}</p>
                  <p className={`mt-1 text-xs font-medium ${demandTone}`}>{demandLabel}</p>
                </div>
                <div className="stat-tile">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Current</span>
                    <Navigation className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{activeOrders.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Single delivery mode</p>
                </div>
                <div className="stat-tile">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Average payout</span>
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <p className="flex items-center text-2xl font-bold">
                    <IndianRupee className="h-5 w-5" />
                    {averagePayout}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">From today&apos;s deliveries</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${rider.is_online ? "border-emerald-500/40 bg-emerald-500/10" : "bg-background/80"}`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${rider.is_online ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {isSavingStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{rider.is_online ? "Online and available" : "Offline"}</p>
                  <p className="text-xs text-muted-foreground">
                    {rider.is_online ? "New orders can appear instantly" : "Switch on when you are ready"}
                  </p>
                </div>
                <Switch
                  checked={!!rider.is_online}
                  onCheckedChange={handleOnlineChange}
                  disabled={isSavingStatus || rider.status !== "approved"}
                />
              </div>

              <div className="mt-4 space-y-2">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-2 rounded-lg bg-background/70 p-2.5">
                    {item.ready ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-lg border bg-card/90 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={activeOrders.length > 0 ? "default" : "secondary"}>
                  {activeOrders.length > 0 ? "Current delivery" : "Next best action"}
                </Badge>
                {focusOrder?.distance_km && (
                  <Badge variant="outline">~{focusOrder.distance_km} km</Badge>
                )}
              </div>
              <h2 className="font-heading text-xl font-semibold">
                {focusOrder ? getRiderNextAction(focusOrder.status) : "Stay ready for the next order."}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {focusOrder
                  ? `${focusOrder.pickup_address} -> ${focusOrder.drop_address}`
                  : rider.is_online
                    ? "You are online. New requests will appear automatically."
                    : "Switch online when you are ready to receive delivery requests."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
              <div className="rounded-md border bg-background/80 p-3">
                <p className="text-xs font-medium text-muted-foreground">Payout</p>
                <p className="mt-1 text-xl font-bold">{formatRupees(focusPayout)}</p>
              </div>
              <div className="rounded-md border bg-background/80 p-3">
                <p className="text-xs font-medium text-muted-foreground">Queue rank</p>
                <p className="mt-1 text-xl font-bold">
                  {focusOrder && sortedAvailableOrders.length > 0 && activeOrders.length === 0 ? "Best" : activeOrders.length > 0 ? "Locked" : "Open"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="card-elevated">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Active delivery</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeOrders.length}</p>
              <p className="text-xs text-muted-foreground">Only one active order at a time</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Completed today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{deliveredToday.length}</p>
              <p className="text-xs text-muted-foreground">Delivered orders</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Today earnings</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5" />
                {todayEarnings}
              </p>
              <p className="text-xs text-muted-foreground">Cash plus Droply-covered orders</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Payout split</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Cash</span>
                  <span className="font-semibold">₹{cashEarnings}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Droply</span>
                  <span className="font-semibold">₹{droplyCoveredEarnings}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeOrders.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-heading text-xl font-semibold">Current delivery</h2>
                <p className="text-sm text-muted-foreground">Finish this before accepting another order.</p>
              </div>
              <Badge className="bg-primary/15 text-primary">Locked in</Badge>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isRider
                  onUpdateStatus={(status) => updateOrderStatus(order.id, status)}
                  onCancel={(reason) => cancelOrder(order.id, reason)}
                  onUploadProof={(file) => uploadDeliveryProof(order.id, file)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading text-xl font-semibold">Available orders</h2>
              <p className="text-sm text-muted-foreground">
                {canAccept ? "Choose a pending order and head to pickup." : "Go online and finish active deliveries to unlock more orders."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canAccept && availableOrders.length > 1 && (
                <Select value={queueSort} onValueChange={(value) => setQueueSort(value as QueueSort)}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="payout">Highest payout</SelectItem>
                    <SelectItem value="distance">Shortest route</SelectItem>
                    <SelectItem value="newest">Newest first</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Badge variant={canAccept ? "default" : "secondary"} className="w-fit">
                {canAccept ? `${availableOrders.length} available` : "Not accepting"}
              </Badge>
            </div>
          </div>

          {!rider.is_online ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-8">
                <EmptyState
                  variant="deliveries"
                  title="You are offline"
                  description="Switch online when you are ready to receive nearby delivery requests."
                />
              </CardContent>
            </Card>
          ) : activeOrders.length > 0 ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Single delivery mode is active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This keeps the rider flow simple and prevents missed pickups. Complete your current delivery to see more orders.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : availableOrders.length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-8">
                <EmptyState
                  variant="search"
                  title="No orders waiting"
                  description="You are online. New orders will appear here automatically."
                >
                  <div className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Listening for real-time requests
                  </div>
                </EmptyState>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedAvailableOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isRider
                  onAccept={() => acceptOrder(order.id)}
                  onDeny={() => setSkippedIds((prev) => new Set(prev).add(order.id))}
                />
              ))}
            </div>
          )}
        </section>

        {skippedIds.size > 0 && rider.is_online && activeOrders.length === 0 && (
          <div className="mt-5 text-center">
            <Button variant="ghost" onClick={() => setSkippedIds(new Set())}>
              <PackageSearch className="h-4 w-4 mr-2" />
              Show skipped orders again
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
