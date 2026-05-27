import { Link } from 'react-router-dom';
import { Plus, UserPlus, Clock, Gift } from 'lucide-react';
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
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { orders, loading, updateOrderStatus, cancelOrder } = useOrders();
  const { freeRemaining } = usePromos();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('is_guest, guest_expires_at')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setIsGuest(data?.is_guest || false);
        });
    }
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

  const senderOrders = orders.filter(o => o.sender_id === user.id);
  const activeOrders = senderOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = senderOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = senderOrders.filter(o => o.status === 'cancelled');

  return (
    <MainLayout showFooter={false}>
      <div className="container py-8 overflow-x-hidden">
        {/* Guest User Banner */}
        {isGuest && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-amber-800 dark:text-amber-200">
                You're using a guest account. Your session expires in 24 hours.
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
                🎁 You have {freeRemaining} FREE {freeRemaining === 1 ? 'delivery' : 'deliveries'} left! Send a parcel on us.
              </span>
              <Button asChild size="sm" className="btn-gradient">
                <Link to="/send">Use Free Delivery</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Track and manage your deliveries in real-time</p>
          </div>
          <Button asChild className="btn-gradient w-full sm:w-auto shrink-0">
            <Link to="/send"><Plus className="mr-2 h-4 w-4" /> Send Parcel</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-6 animate-pulse space-y-4">
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
            description="Send your first parcel and track it right here. It's quick, easy, and secure!"
            action={{
              label: 'Create your first order',
              href: '/send',
            }}
          />
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active" className="gap-2">
                Active
                {activeOrders.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {activeOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed
                {completedOrders.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {completedOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-2">
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
