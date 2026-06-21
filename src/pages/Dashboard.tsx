import { Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock, Gift, PackageCheck, Plus, ShieldCheck, Truck, UserPlus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { ConvertGuestModal } from '@/components/auth/ConvertGuestModal';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FAQ } from '@/components/FAQ';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { usePromos } from '@/hooks/usePromos';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { orders, loading, updateOrderStatus, cancelOrder } = useOrders();
  const { freeRemaining } = usePromos();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('is_guest, guest_expires_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsGuest(data?.is_guest || false);
      });
  }, [user]);

  if (authLoading) {
    return (
      <MainLayout showFooter={false}>
        <div className="container py-8">
          <DashboardSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const senderOrders = orders.filter((order) => order.sender_id === user.id);
  const activeOrders = senderOrders.filter((order) => !['delivered', 'cancelled'].includes(order.status));
  const completedOrders = senderOrders.filter((order) => order.status === 'delivered');
  const cancelledOrders = senderOrders.filter((order) => order.status === 'cancelled');

  return (
    <MainLayout showFooter={false}>
      <div className="app-screen container app-page-stack max-w-6xl overflow-x-hidden py-4 md:py-8">
        {isGuest && (
          <Alert className="app-card bg-amber-500/10 border-amber-500/30">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-amber-800 dark:text-amber-200">
                You are using a guest account. Your session expires in 24 hours.
              </span>
              <ConvertGuestModal
                trigger={
                  <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Save My Account
                  </Button>
                }
              />
            </AlertDescription>
          </Alert>
        )}

        {freeRemaining > 0 && (
          <Alert className="app-card border-emerald-500/30 bg-emerald-500/10">
            <Gift className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                You have {freeRemaining} free {freeRemaining === 1 ? 'delivery' : 'deliveries'} left. Send a parcel on us.
              </span>
              <Button asChild size="sm" className="btn-gradient">
                <Link to="/send">Use Free Delivery</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="app-hero p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="app-hero-chip mb-4">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sender workspace
              </div>
              <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Your parcel control room</h1>
              <p className="app-hero-subtle mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                Book, track, share receiver links, and handle secure OTP handoffs from one app screen.
              </p>
            </div>
            <Button asChild className="h-12 rounded-2xl bg-white text-foreground shadow-xl hover:bg-white/92 lg:min-w-[178px]">
              <Link to="/send">
                <Plus className="h-4 w-4" />
                Send Parcel
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="app-metric-grid mt-5">
            <div className="app-metric-tile">
              <span>Active</span>
              <strong>{activeOrders.length}</strong>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/70">
                <Truck className="h-3.5 w-3.5" />
                Moving now
              </p>
            </div>
            <div className="app-metric-tile">
              <span>Completed</span>
              <strong>{completedOrders.length}</strong>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/70">
                <PackageCheck className="h-3.5 w-3.5" />
                Delivered
              </p>
            </div>
            <div className="app-metric-tile">
              <span>Credits</span>
              <strong>{freeRemaining}</strong>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/70">
                <Gift className="h-3.5 w-3.5" />
                Free left
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="app-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Live orders</span>
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{activeOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Need attention now</p>
          </div>
          <div className="app-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Safe handoffs</span>
              <PackageCheck className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{completedOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Delivered successfully</p>
          </div>
          <div className="app-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Closed</span>
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-3xl font-bold">{cancelledOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Closed without delivery</p>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-6 animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : senderOrders.length === 0 ? (
          <EmptyState
            variant="orders"
            title="No orders yet"
            description="Send your first parcel and track it right here. It is quick, easy, and secure."
            action={{
              label: 'Create your first order',
              href: '/send',
            }}
          />
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6 grid h-auto w-full grid-cols-3 rounded-lg bg-secondary/70 p-1">
              <TabsTrigger value="active" className="min-h-10 gap-2 rounded-md">
                Active
                {activeOrders.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {activeOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="min-h-10 gap-2 rounded-md">
                Completed
                {completedOrders.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {completedOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="min-h-10 gap-2 rounded-md">
                Cancelled
                {cancelledOrders.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {cancelledOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeOrders.length === 0 ? (
                <EmptyState
                  variant="orders"
                  title="No active orders"
                  description="All your deliveries have been completed or cancelled."
                  action={{
                    label: 'Send a new parcel',
                    href: '/send',
                  }}
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={(status) => updateOrderStatus(order.id, status)}
                      onCancel={(reason) => cancelOrder(order.id, reason)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedOrders.length === 0 ? (
                <EmptyState
                  variant="orders"
                  title="No completed orders"
                  description="Completed deliveries will appear here."
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} showActions={false} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled">
              {cancelledOrders.length === 0 ? (
                <EmptyState
                  variant="orders"
                  title="No cancelled orders"
                  description="Cancelled orders will appear here."
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cancelledOrders.map((order) => (
                    <OrderCard key={order.id} order={order} showActions={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <FAQ variant="compact" />
    </MainLayout>
  );
}
