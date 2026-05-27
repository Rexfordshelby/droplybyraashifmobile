import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  base_price: number;
  price_per_km: number;
  is_active: boolean;
}

export function useServiceZones() {
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_zones')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setZones(data);
    }
    setLoading(false);
  };

  const calculatePrice = (zone: ServiceZone | null, distanceKm: number): number => {
    if (!zone) {
      // Default pricing
      return 30 + (distanceKm * 8);
    }
    return (zone.base_price || 30) + (distanceKm * (zone.price_per_km || 8));
  };

  return {
    zones,
    loading,
    calculatePrice,
    refetch: fetchZones,
  };
}
