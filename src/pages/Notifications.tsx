import { Navigate, Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Package } from 'lucide-react';
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
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <Card className="card-elevated text-center py-12">
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
                className={`card-elevated transition-all ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${!notification.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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