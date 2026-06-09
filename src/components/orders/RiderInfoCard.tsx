import { useEffect, useState } from 'react';
import { Phone, Bike, Car, User, ShieldCheck, Star, TrendingUp, AlertTriangle, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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

  const trust = riderInfo.trust;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">
                  {riderInfo.profile?.full_name || 'Rider'}
                </p>
                {trust.trustTier === 'gold' && (
                  <Badge className="gap-1 bg-amber-500/15 text-amber-700 border border-amber-500/30">
                    <ShieldCheck className="h-3 w-3" />
                    Gold
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {vehicleIcons[riderInfo.vehicle_type] || <Bike className="h-3 w-3" />}
                <span className="capitalize">{riderInfo.vehicle_type}</span>
                {trust.rating > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {trust.rating.toFixed(1)}
                  </span>
                )}
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

        <div className="rounded-lg border bg-background/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Trust Score</span>
            <span className="text-lg font-bold text-primary">{trust.trustScore || 0}%</span>
          </div>
          <Progress value={trust.trustScore || 0} className="h-2" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div>
              <p className="font-bold">{trust.completedDeliveries}</p>
              <p className="text-muted-foreground">deliveries</p>
            </div>
            <div>
              <p className="font-bold">{trust.onTimeRate}%</p>
              <p className="text-muted-foreground">on time</p>
            </div>
            <div>
              <p className="font-bold">{trust.cancellationRate}%</p>
              <p className="text-muted-foreground">cancelled</p>
            </div>
            <div>
              <p className="font-bold">{trust.damageIncidents}</p>
              <p className="text-muted-foreground">damage claims</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-bold">{trust.repeatCustomerRate}%</p>
              <p className="text-muted-foreground">repeat trust signal</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(trust.reviewTags.length ? trust.reviewTags : ['Professional', 'Careful handoff']).slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1 bg-background">
              {tag.toLowerCase().includes('late') || tag.toLowerCase().includes('damage') ? (
                <AlertTriangle className="h-3 w-3 text-amber-600" />
              ) : tag.toLowerCase().includes('repeat') ? (
                <Repeat className="h-3 w-3 text-primary" />
              ) : (
                <TrendingUp className="h-3 w-3 text-success" />
              )}
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
