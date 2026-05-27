import { useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Generate a short memorable ID for guest users
const generateGuestId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const describeGuestAuthError = (error: { message?: string }) => {
  const message = error.message || '';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('anonymous') ||
    normalized.includes('provider is disabled') ||
    normalized.includes('signups not allowed')
  ) {
    return {
      title: 'Enable guest checkout in Supabase',
      description: 'In Supabase, open Authentication > Sign In/Providers and turn Anonymous sign-ins on.',
    };
  }

  return {
    title: 'Guest sign-in failed',
    description: message || 'Please try again.',
  };
};

export function useGuestAuth() {
  const [loading, setLoading] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const { toast } = useToast();

  const signInAsGuest = async () => {
    setLoading(true);
    
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        const authError = describeGuestAuthError(error);
        toast({
          title: authError.title,
          description: authError.description,
          variant: 'destructive',
        });
        return { error, user: null, guestId: null };
      }

      // Generate a guest ID and store it
      const newGuestId = generateGuestId();
      setGuestId(newGuestId);
      
      // Store guest ID in localStorage for recovery
      if (data.user) {
        localStorage.setItem(`guest_${data.user.id}`, newGuestId);
        localStorage.setItem(`guest_id_${newGuestId}`, data.user.id);
        localStorage.setItem('current_guest_id', newGuestId);
      }

      toast({
        title: `Welcome! Your Guest ID: ${newGuestId}`,
        description: 'Save this ID to log back in. Session expires in 24 hours.',
        duration: 10000,
      });

      return { error: null, user: data.user, guestId: newGuestId };
    } catch (error) {
      const err = error as Error;
      const authError = describeGuestAuthError(err);
      toast({
        title: authError.title,
        description: authError.description,
        variant: 'destructive',
      });
      return { error: err, user: null, guestId: null };
    } finally {
      setLoading(false);
    }
  };

  const getStoredGuestId = (): string | null => {
    return localStorage.getItem('current_guest_id');
  };

  const convertGuestToUser = async (email: string, password: string) => {
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
      }

      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return { error };
      }

      // Update profile to remove guest status
      await supabase
        .from('profiles')
        .update({ is_guest: false, guest_expires_at: null })
        .eq('id', data.user?.id);

      // Clear guest ID from localStorage
      if (data.user) {
        const storedGuestId = localStorage.getItem(`guest_${data.user.id}`);
        if (storedGuestId) {
          localStorage.removeItem(`guest_id_${storedGuestId}`);
          localStorage.removeItem(`guest_${data.user.id}`);
        }
        localStorage.removeItem('current_guest_id');
      }

      toast({
        title: 'Account Created!',
        description: 'Your guest account has been converted to a full account.',
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    signInAsGuest,
    convertGuestToUser,
    getStoredGuestId,
    guestId,
    loading,
  };
}
