import { Navigate, Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="app-screen container app-page-stack max-w-2xl py-4 md:py-8">
        <section className="app-hero p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="app-hero-chip mb-4">
                <Bell className="h-3.5 w-3.5" />
                Alert center
              </div>
              <h1 className="font-heading text-3xl font-extrabold">Notifications</h1>
              <p className="app-hero-subtle mt-2 text-sm">
                {unreadCount > 0 ? `${unreadCount} unread updates need attention` : 'All deliveries are caught up'}
              </p>
            </div>
            <div className="hidden h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/15 text-white sm:grid">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Inbox</h2>
            <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="rounded-2xl">
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="app-card flex min-h-40 items-center justify-center text-sm text-muted-foreground">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <Card className="app-card py-12 text-center">
            <CardContent>
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`app-card transition-all active:scale-[0.99] ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${!notification.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.order_id && (
                          <Link
                            to={`/track/${notification.order_id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View Order
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
