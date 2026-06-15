import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserPromo {
  user_id: string;
  free_deliveries_remaining: number;
  total_free_used: number;
}

export interface FreeDeliveryEligibility {
  eligible: boolean;
  remaining: number;
  accountRemaining: number;
  phoneRemaining: number;
  normalizedPhone: string | null;
  phoneRequired: boolean;
  reason: string | null;
}

const defaultEligibility: FreeDeliveryEligibility = {
  eligible: false,
  remaining: 0,
  accountRemaining: 0,
  phoneRemaining: 0,
  normalizedPhone: null,
  phoneRequired: true,
  reason: null,
};

export function usePromos() {
  const { user } = useAuth();
  const [promo, setPromo] = useState<UserPromo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPromo = useCallback(async () => {
    if (!user) {
      setPromo(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('user_promos')
      .select('user_id, free_deliveries_remaining, total_free_used')
      .eq('user_id', user.id)
      .maybeSingle();

    // Self-heal: create row if missing (e.g. existing user before backfill)
    if (!data) {
      await supabase
        .from('user_promos')
        .insert({ user_id: user.id, free_deliveries_remaining: 2 })
        .select()
        .maybeSingle();
      const { data: refetched } = await supabase
        .from('user_promos')
        .select('user_id, free_deliveries_remaining, total_free_used')
        .eq('user_id', user.id)
        .maybeSingle();
      setPromo(refetched);
    } else {
      setPromo(data);
    }
    setLoading(false);
  }, [user]);

  const checkFreeDeliveryEligibility = useCallback(
    async (senderPhone?: string): Promise<FreeDeliveryEligibility> => {
      if (!user) return defaultEligibility;

      const { data, error } = await supabase.rpc('get_free_delivery_eligibility', {
        _sender_phone: senderPhone || null,
      });

      if (error || !data || typeof data !== 'object') {
        const accountRemaining = promo?.free_deliveries_remaining ?? 0;
        return {
          ...defaultEligibility,
          eligible: accountRemaining > 0 && !!senderPhone,
          remaining: accountRemaining,
          accountRemaining,
          phoneRemaining: accountRemaining,
          normalizedPhone: senderPhone ? senderPhone.replace(/\D/g, '').slice(-10) : null,
          phoneRequired: !senderPhone,
          reason: error?.message || null,
        };
      }

      const result = data as Record<string, unknown>;
      return {
        eligible: Boolean(result.eligible),
        remaining: Number(result.remaining ?? 0),
        accountRemaining: Number(result.accountRemaining ?? 0),
        phoneRemaining: Number(result.phoneRemaining ?? 0),
        normalizedPhone: typeof result.normalizedPhone === 'string' ? result.normalizedPhone : null,
        phoneRequired: Boolean(result.phoneRequired),
        reason: typeof result.reason === 'string' ? result.reason : null,
      };
    },
    [promo?.free_deliveries_remaining, user],
  );

  useEffect(() => {
    fetchPromo();

    if (!user) return;

    // React to changes (e.g. after creating a free order, or after refund)
    const channel = supabase
      .channel(`user-promos-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_promos', filter: `user_id=eq.${user.id}` },
        () => fetchPromo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPromo]);

  return {
    promo,
    loading,
    freeRemaining: promo?.free_deliveries_remaining ?? 0,
    checkFreeDeliveryEligibility,
    refetch: fetchPromo,
  };
}
