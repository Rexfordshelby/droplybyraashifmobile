import { MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ServiceZone } from '@/hooks/useServiceZones';
import { Skeleton } from '@/components/ui/skeleton';

interface ZoneSelectorProps {
  zones: ServiceZone[];
  loading: boolean;
  selectedZoneId: string | null;
  onZoneChange: (zoneId: string) => void;
}

export function ZoneSelector({ zones, loading, selectedZoneId, onZoneChange }: ZoneSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Service Zone</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Service Zone
        </Label>
        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          No service zones available. Default pricing will apply (₹30 base + ₹8/km).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Service Zone
      </Label>
      <Select value={selectedZoneId || ''} onValueChange={onZoneChange}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Select your area" />
        </SelectTrigger>
        <SelectContent>
          {zones.map((zone) => (
            <SelectItem key={zone.id} value={zone.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span className="font-medium">{zone.name}</span>
                <span className="text-xs text-muted-foreground">
                  ₹{zone.base_price} + ₹{zone.price_per_km}/km
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Pricing varies by zone. Select your pickup area for accurate pricing.
      </p>
    </div>
  );
}
