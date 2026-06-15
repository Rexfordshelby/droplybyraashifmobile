import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { ORDER_SELECT, normalizeOrders, type Order, type OrderStatus } from './useOrders';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface AdminRider {
  id: string;
  user_id: string;
  vehicle_type: string;
  status: 'pending' | 'approved' | 'suspended';
  is_online: boolean;
  created_at: string;
  profile?: Profile;
}

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  base_price: number;
  price_per_km: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminBusinessAccount {
  id: string;
  owner_id: string | null;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string;
  city: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  default_order_channel: 'b2p' | 'b2b';
  monthly_volume_estimate: number;
  created_at: string;
}

export interface AdminBusinessInquiry {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_type: string;
  estimated_orders_per_month: number;
  message: string | null;
  status: 'new' | 'reviewed' | 'converted' | 'rejected';
  created_by: string | null;
  created_at: string;
}

interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  totalRiders: number;
  onlineRiders: number;
  pendingRiders: number;
  deliveredToday: number;
  totalBusinesses: number;
  pendingBusinesses: number;
  newBusinessInquiries: number;
}

export function useAdminData() {
  const [riders, setRiders] = useState<AdminRider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusinessAccount[]>([]);
  const [businessInquiries, setBusinessInquiries] = useState<AdminBusinessInquiry[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalRiders: 0,
    onlineRiders: 0,
    pendingRiders: 0,
    deliveredToday: 0,
    totalBusinesses: 0,
    pendingBusinesses: 0,
    newBusinessInquiries: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const fetchRiders = useCallback(async () => {
    const { data: ridersData, error: ridersError } = await supabase
      .from('riders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ridersError) {
      console.error('Error fetching riders:', ridersError);
      return [];
    }

    // Fetch profiles for all riders
    const userIds = ridersData?.map(r => r.user_id) || [];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      
      return ridersData?.map(rider => ({
        ...rider,
        profile: profileMap.get(rider.user_id) || undefined
      })) as AdminRider[];
    }

    return ridersData as AdminRider[];
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }

    return normalizeOrders(data);
  }, []);

  const fetchZones = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching zones:', error);
      return [];
    }

    return data as ServiceZone[];
  }, []);

  const fetchBusinesses = useCallback(async () => {
    const { data, error } = await supabase
      .from('business_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business accounts:', error);
      return [];
    }

    return (data || []) as AdminBusinessAccount[];
  }, []);

  const fetchBusinessInquiries = useCallback(async () => {
    const { data, error } = await supabase
      .from('business_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business inquiries:', error);
      return [];
    }

    return (data || []) as AdminBusinessInquiry[];
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user || !hasRole('admin')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const [ridersData, ordersData, zonesData, businessesData, inquiriesData] = await Promise.all([
      fetchRiders(),
      fetchOrders(),
      fetchZones(),
      fetchBusinesses(),
      fetchBusinessInquiries(),
    ]);

    setRiders(ridersData);
    setOrders(ordersData);
    setZones(zonesData);
    setBusinesses(businessesData);
    setBusinessInquiries(inquiriesData);

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      totalOrders: ordersData.length,
      pendingOrders: ordersData.filter(o => o.status === 'pending').length,
      totalRiders: ridersData.filter(r => r.status === 'approved').length,
      onlineRiders: ridersData.filter(r => r.status === 'approved' && r.is_online).length,
      pendingRiders: ridersData.filter(r => r.status === 'pending').length,
      deliveredToday: ordersData.filter(o => 
        o.status === 'delivered' && 
        o.delivered_at && 
        new Date(o.delivered_at) >= today
      ).length,
      totalBusinesses: businessesData.filter(b => b.status === 'approved').length,
      pendingBusinesses: businessesData.filter(b => b.status === 'pending').length,
      newBusinessInquiries: inquiriesData.filter(i => i.status === 'new').length,
    });

    setLoading(false);
  }, [fetchBusinessInquiries, fetchBusinesses, fetchOrders, fetchRiders, fetchZones, hasRole, user]);

  const approveRider = async (riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    const { error } = await supabase
      .from('riders')
      .update({ status: 'approved' })
      .eq('id', riderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve rider',
        variant: 'destructive',
      });
      return;
    }

    // Add rider role to user so an approved applicant can immediately access rider tools.
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id: rider.user_id, role: 'rider' }, { onConflict: 'user_id,role' });

    if (roleError) {
      toast({
        title: 'Rider approved, role sync failed',
        description: 'The rider was approved, but their rider role was not added. Try approving again or check RLS policies.',
        variant: 'destructive',
      });
      await fetchAll();
      return;
    }

    toast({
      title: 'Success',
      description: 'Rider approved successfully',
    });

    await fetchAll();
  };

  const suspendRider = async (riderId: string) => {
    const { error } = await supabase
      .from('riders')
      .update({ status: 'suspended', is_online: false })
      .eq('id', riderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend rider',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Rider suspended',
    });

    await fetchAll();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updates: { status: OrderStatus; cancellation_reason?: string } = { status };

    if (status === 'cancelled') {
      updates.cancellation_reason = 'Cancelled by admin';
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Could not update order',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Order updated',
      description: `Order marked as ${status.replace('_', ' ')}.`,
    });

    await fetchAll();
  };

  const updateZone = async (zoneId: string, updates: Partial<ServiceZone>) => {
    const { error } = await supabase
      .from('service_zones')
      .update(updates)
      .eq('id', zoneId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update zone',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Zone updated',
    });

    await fetchAll();
  };

  const createZone = async () => {
    const { error } = await supabase
      .from('service_zones')
      .insert({
        name: 'New Zone',
        city: 'City Name',
        base_price: 30,
        price_per_km: 8,
        is_active: false,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create zone',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Zone created. Edit it to configure.',
    });

    await fetchAll();
  };

  const approveBusiness = async (businessId: string) => {
    const business = businesses.find((item) => item.id === businessId);
    const { error } = await supabase
      .from('business_accounts')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
      .eq('id', businessId);

    if (error) {
      toast({
        title: 'Could not approve business',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (business?.owner_id) {
      await supabase.from('business_members').upsert({
        business_account_id: business.id,
        user_id: business.owner_id,
        role: 'owner',
      }, { onConflict: 'business_account_id,user_id' });
    }

    toast({ title: 'Business approved', description: 'The store can now create B2P/B2B deliveries.' });
    await fetchAll();
  };

  const suspendBusiness = async (businessId: string) => {
    const { error } = await supabase
      .from('business_accounts')
      .update({ status: 'suspended', suspended_at: new Date().toISOString(), suspended_by: user?.id ?? null })
      .eq('id', businessId);

    if (error) {
      toast({
        title: 'Could not suspend business',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Business suspended', description: 'Business ordering access is paused.' });
    await fetchAll();
  };

  const updateBusinessInquiryStatus = async (inquiryId: string, status: AdminBusinessInquiry['status']) => {
    const { error } = await supabase
      .from('business_inquiries')
      .update({ status })
      .eq('id', inquiryId);

    if (error) {
      toast({
        title: 'Inquiry not updated',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Inquiry updated', description: `Marked as ${status}.` });
    await fetchAll();
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    riders,
    orders,
    zones,
    businesses,
    businessInquiries,
    stats,
    loading,
    approveRider,
    suspendRider,
    updateOrderStatus,
    updateZone,
    createZone,
    approveBusiness,
    suspendBusiness,
    updateBusinessInquiryStatus,
    refetch: fetchAll,
  };
}
