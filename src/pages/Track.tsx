import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, IndianRupee, Loader2, Package, QrCode, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { OrderQRCode } from "@/components/orders/OrderQRCode";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { RiderInfoCard } from "@/components/orders/RiderInfoCard";
import { ShareReceiverCard } from "@/components/orders/ShareReceiverCard";
import { RiderReviewCard } from "@/components/orders/RiderReviewCard";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatus, useOrders } from "@/hooks/useOrders";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Finding rider",
  accepted: "Rider assigned",
  picked: "Picked up",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "status-pending",
  accepted: "status-accepted",
  picked: "status-picked",
  in_transit: "status-in_transit",
  delivered: "status-delivered",
  cancelled: "status-cancelled",
};

export default function Track() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();

  if (authLoading || ordersLoading) {
    return (
      <MainLayout showFooter={false}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const order = orders.find((item) => item.id === orderId && item.sender_id === user.id);

  if (!order) {
    return (
      <MainLayout>
        <div className="container py-16 text-center max-w-md">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Order not found</h1>
          <p className="text-muted-foreground mb-6">
            This order may be unavailable or you may not have permission to view it.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to orders</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const showPickupCode = order.status === "accepted";

  return (
    <MainLayout showFooter={false}>
      <div className="container py-6 max-w-4xl">
        <Button variant="ghost" asChild className="mb-5">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to orders
          </Link>
        </Button>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <Card className="card-elevated">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">
                      #{order.tracking_code || order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <h1 className="font-heading text-2xl md:text-3xl font-bold mt-1">
                      {statusLabels[order.status]}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Created {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge className={`status-badge ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardContent className="p-5 md:p-6">
                <OrderTimeline
                  currentStatus={order.status}
                  createdAt={order.created_at}
                  pickedAt={order.picked_at}
                  deliveredAt={order.delivered_at}
                  cancelledAt={order.cancelled_at}
                />
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full bg-success animate-soft-pulse mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">PICKUP</p>
                    <p className="text-sm md:text-base">{order.pickup_address}</p>
                    {order.pickup_landmark && (
                      <p className="text-xs text-muted-foreground">{order.pickup_landmark}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 rounded-full bg-destructive mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">DROP</p>
                    <p className="text-sm md:text-base">{order.drop_address}</p>
                    {order.drop_landmark && (
                      <p className="text-xs text-muted-foreground">{order.drop_landmark}</p>
                    )}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Item</p>
                    <p className="font-medium">{order.item_description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="font-medium flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {order.is_promo_free ? "0 covered by Droplix" : `${order.price_offered} cash`}
                    </p>
                  </div>
                </div>
                {order.item_photo_url && (
                  <img
                    src={order.item_photo_url}
                    alt="Parcel"
                    className="w-full max-h-64 object-cover rounded-lg border"
                    loading="lazy"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {order.rider_id && order.status !== "pending" && order.status !== "cancelled" && (
              <Card className="card-elevated">
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-3">YOUR RIDER</p>
                  <RiderInfoCard riderId={order.rider_id} />
                </CardContent>
              </Card>
            )}

            {order.status !== "cancelled" && order.status !== "delivered" && (
              <ShareReceiverCard
                orderId={order.id}
                trackingCode={order.tracking_code}
                receiverPhone={order.receiver_phone}
                itemDescription={order.item_description}
              />
            )}

            {showPickupCode && (
              <Card className="card-elevated">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="h-5 w-5 text-primary" />
                    <p className="font-semibold">Pickup verification</p>
                  </div>
                  <OrderQRCode order={order} type="pickup" />
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Show this to the rider at pickup. The receiver OTP is never shown here.
                  </p>
                </CardContent>
              </Card>
            )}

            {order.status === "delivered" && (
              <div className="space-y-4">
                {order.rider_id && <RiderReviewCard order={order} />}
                <Button asChild className="w-full btn-gradient">
                  <Link to={`/receipt/${order.id}`}>
                    <Share2 className="h-4 w-4 mr-2" />
                    View receipt
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
