import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type RiderStatus = 'pending' | 'approved' | 'suspended';
export type VehicleType = 'bike' | 'scooter' | 'car' | 'bicycle';

export interface Rider {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  vehicle_photo_url: string | null;
  license_photo_url: string | null;
  status: RiderStatus;
  is_online: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
  updated_at: string;
}

const getRiderErrorMessage = (error: { message?: string; code?: string }) => {
  const combined = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();

  if (combined.includes('row-level security') || combined.includes('permission denied')) {
    return 'Your rider permissions are not ready yet. Refresh once or contact support.';
  }

  if (combined.includes('no rows')) {
    return 'Only approved riders can go online.';
  }

  return error.message || 'Please try again.';
};

export function useRider() {
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, refetchRoles } = useAuth();
  const { toast } = useToast();

  const fetchRider = useCallback(async () => {
    if (!user) {
      setRider(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching rider:', error);
    } else {
      setRider(data as Rider | null);
    }

    setLoading(false);
  }, [user]);

  const applyAsRider = async (vehicleType: VehicleType) => {
    if (!user) return null;

    // Ensure profile exists first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || null,
        full_name: user.user_metadata?.full_name || 'Rider',
        is_guest: false,
      });
    }

    const { data, error } = await supabase
      .from('riders')
      .insert({
        user_id: user.id,
        vehicle_type: vehicleType,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already Applied',
          description: 'You have already applied as a rider',
          variant: 'destructive',
        });
      } else {
        console.error('Rider application error:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit rider application',
          variant: 'destructive',
        });
      }
      return null;
    }

    // Add rider role (idempotent, surfaces RLS errors instead of swallowing them)
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: user.id, role: 'rider' },
        { onConflict: 'user_id,role' }
      );

    if (roleError) {
      console.error('Failed to grant rider role:', roleError);
      toast({
        title: 'Almost there…',
        description: 'Your rider profile was created but we could not assign the rider role. Please refresh and try again.',
        variant: 'destructive',
      });
    }

    // Refetch roles so the UI updates immediately
    await refetchRoles();

    // Since status defaults to 'approved', show appropriate message
    toast({
      title: 'You\'re Now a Rider!',
      description: 'Your account is active. Go online to start accepting orders!',
    });

    await fetchRider();
    return data;
  };

  const toggleOnlineStatus = async () => {
    if (!rider) return false;

    if (rider.status !== 'approved') {
      toast({
        title: 'Approval required',
        description: 'Only approved riders can go online.',
        variant: 'destructive',
      });
      return false;
    }

    const previous = rider.is_online;
    // Optimistic update: flip immediately so the switch never flickers.
    setRider({ ...rider, is_online: !previous });

    const { data, error } = await supabase
      .from('riders')
      .update({ is_online: !previous })
      .eq('id', rider.id)
      .eq('status', 'approved')
      .select()
      .single();

    if (error || !data) {
      // Revert on failure
      setRider({ ...rider, is_online: previous });
      toast({
        title: 'Could not update rider status',
        description: error ? getRiderErrorMessage(error) : 'Only approved riders can go online.',
        variant: 'destructive',
      });
      return false;
    }

    setRider(data as Rider);
    toast({
      title: data.is_online ? 'You are online' : 'You are offline',
      description: data.is_online ? 'New delivery requests can appear now.' : 'You will not receive new delivery requests.',
    });

    return true;
  };

  useEffect(() => {
    fetchRider();
  }, [fetchRider]);

  return {
    rider,
    loading,
    applyAsRider,
    toggleOnlineStatus,
    refetch: fetchRider,
  };
}
