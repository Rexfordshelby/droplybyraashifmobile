import { useEffect, useState } from 'react';
import { Phone, Bike, Car, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders, RiderInfo } from '@/hooks/useOrders';

interface RiderInfoCardProps {
  riderId: string;
}

const vehicleIcons: Record<string, React.ReactNode> = {
  bike: <Bike className="h-4 w-4" />,
  scooter: <Bike className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bicycle: <Bike className="h-4 w-4" />,
};

export function RiderInfoCard({ riderId }: RiderInfoCardProps) {
  const { getRiderInfo } = useOrders();
  const [riderInfo, setRiderInfo] = useState<RiderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRider = async () => {
      const info = await getRiderInfo(riderId);
      setRiderInfo(info);
      setLoading(false);
    };
    fetchRider();
  }, [riderId, getRiderInfo]);

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riderInfo) return null;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {riderInfo.profile?.full_name || 'Rider'}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {vehicleIcons[riderInfo.vehicle_type] || <Bike className="h-3 w-3" />}
                <span className="capitalize">{riderInfo.vehicle_type}</span>
              </div>
            </div>
          </div>
          
          {riderInfo.profile?.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${riderInfo.profile.phone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
