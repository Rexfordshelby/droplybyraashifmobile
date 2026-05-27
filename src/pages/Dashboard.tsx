import { Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Clock, Gift, PackageCheck, Plus, Truck, UserPlus, XCircle } from 'lucide-react';
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
      <div className="container py-6 md:py-8 overflow-x-hidden">
        {isGuest && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
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
          <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/30">
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

        <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-semibold uppercase text-primary">Sender workspace</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Track live deliveries, share receiver links, and repeat common routes.
            </p>
          </div>
          <Button asChild className="btn-gradient h-11 w-full sm:w-auto shrink-0">
            <Link to="/send">
              <Plus className="mr-2 h-4 w-4" />
              Send Parcel
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="stat-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Active</span>
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold">{activeOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Need attention now</p>
          </div>
          <div className="stat-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Completed</span>
              <PackageCheck className="h-4 w-4 text-success" />
            </div>
            <p className="text-3xl font-bold">{completedOrders.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Delivered successfully</p>
          </div>
          <div className="stat-tile">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Cancelled</span>
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
