import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrderReceipt } from '@/components/orders/OrderReceipt';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';

export default function Receipt() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();

  if (authLoading || ordersLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Receipt Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The receipt you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-4xl py-6 md:py-8">
        <Button variant="ghost" asChild className="no-print mb-6">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
        <OrderReceipt order={order} />
      </div>
    </MainLayout>
  );
}
