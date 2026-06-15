import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { normalizeOrders, ORDER_SELECT, type Order, type OrderChannel } from './useOrders';

export type BusinessStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type BusinessMemberRole = 'owner' | 'manager' | 'staff';

export interface BusinessAccount {
  id: string;
  owner_id: string | null;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string;
  gst_number: string | null;
  address: string | null;
  city: string;
  status: BusinessStatus;
  default_order_channel: OrderChannel;
  monthly_volume_estimate: number;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessBatch {
  id: string;
  business_account_id: string;
  created_by: string | null;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  total_stops: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessInquiryInput {
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_type: string;
  estimated_orders_per_month: number;
  message?: string;
}

export interface BusinessAccountInput {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_type: string;
  gst_number?: string;
  address?: string;
  city?: string;
  default_order_channel?: 'b2p' | 'b2b';
  monthly_volume_estimate?: number;
  notes?: string;
}

export function useBusiness() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [batches, setBatches] = useState<BusinessBatch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.status === 'approved') ?? accounts[0] ?? null,
    [accounts],
  );

  const fetchBusiness = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setBatches([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: accountRows, error: accountError } = await supabase
      .from('business_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (accountError) {
      console.error('Business account fetch failed:', accountError);
      setAccounts([]);
      setBatches([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    const safeAccounts = (accountRows || []) as BusinessAccount[];
    setAccounts(safeAccounts);

    const accountIds = safeAccounts.map((account) => account.id);
    if (accountIds.length === 0) {
      setBatches([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    const [{ data: batchRows }, { data: orderRows }] = await Promise.all([
      supabase
        .from('business_delivery_batches')
        .select('*')
        .in('business_account_id', accountIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select(ORDER_SELECT)
        .in('business_account_id', accountIds)
        .order('created_at', { ascending: false }),
    ]);

    setBatches((batchRows || []) as BusinessBatch[]);
    setOrders(normalizeOrders(orderRows));
    setLoading(false);
  }, [user]);

  const submitInquiry = useCallback(
    async (input: BusinessInquiryInput) => {
      const { error } = await supabase.from('business_inquiries').insert({
        ...input,
        created_by: user?.id ?? null,
      });

      if (error) {
        toast({
          title: 'Could not send business request',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Business request sent',
        description: 'Droplix support will review your store details and contact you.',
      });
      return true;
    },
    [toast, user?.id],
  );

  const createBusinessAccount = useCallback(
    async (input: BusinessAccountInput) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('business_accounts')
        .insert({
          ...input,
          owner_id: user.id,
          city: input.city || 'Mumbai',
          default_order_channel: input.default_order_channel || 'b2p',
          monthly_volume_estimate: input.monthly_volume_estimate || 25,
        })
        .select('*')
        .single();

      if (error || !data) {
        toast({
          title: 'Could not create store profile',
          description: error?.message || 'Try again in a moment.',
          variant: 'destructive',
        });
        return null;
      }

      await supabase.from('business_members').insert({
        business_account_id: data.id,
        user_id: user.id,
        role: 'owner',
      });

      toast({
        title: 'Store profile created',
        description: 'Your business profile is pending admin approval.',
      });

      await fetchBusiness();
      return data as BusinessAccount;
    },
    [fetchBusiness, toast, user],
  );

  const createBatch = useCallback(
    async (businessAccountId: string, name: string, totalStops: number, notes?: string) => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('business_delivery_batches')
        .insert({
          business_account_id: businessAccountId,
          created_by: user.id,
          name,
          total_stops: totalStops,
          notes: notes || null,
        })
        .select('*')
        .single();

      if (error || !data) {
        toast({
          title: 'Could not create batch',
          description: error?.message || 'Try again in a moment.',
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Business batch created',
        description: 'Use this batch to group multi-stop deliveries.',
      });

      await fetchBusiness();
      return data as BusinessBatch;
    },
    [fetchBusiness, toast, user],
  );

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  return {
    accounts,
    activeAccount,
    batches,
    orders,
    loading,
    submitInquiry,
    createBusinessAccount,
    createBatch,
    refetch: fetchBusiness,
  };
}
