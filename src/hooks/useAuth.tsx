import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'rider' | 'sender';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    phoneVerificationToken: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  refetchRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const missingSupabaseError = new Error(
  'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
);

function getOAuthRedirectUrl(path = '/dashboard') {
  const configuredOrigin = (import.meta.env.VITE_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '';
  const isLocalOrigin = /^(http:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(
    currentOrigin.replace(/^https?:\/\//i, '')
  );
  const origin = configuredOrigin || (!isLocalOrigin ? currentOrigin : '') || currentOrigin;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Self-healing: ensure profile exists even if DB trigger missed it
  const ensureProfileExists = useCallback(async (userId: string, email?: string, fullName?: string) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: userId,
        email: email || null,
        full_name: fullName || 'User',
        is_guest: false,
      });
    }
  }, []);

  // Self-healing: ensure user has at least the sender role
  const ensureSenderRole = useCallback(async (userId: string) => {
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!existingRoles || existingRoles.length === 0) {
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'sender',
      });
    }
  }, []);

  const fetchUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data?.map((r) => r.role as UserRole) || [];
  }, []);

  const bootstrapUser = useCallback(async (sessionUser: User) => {
    await ensureProfileExists(
      sessionUser.id,
      sessionUser.email,
      sessionUser.user_metadata?.full_name
    );
    await ensureSenderRole(sessionUser.id);
    const newRoles = await fetchUserRoles(sessionUser.id);
    setRoles(newRoles);
  }, [ensureProfileExists, ensureSenderRole, fetchUserRoles]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer Supabase calls to avoid deadlock inside auth callback
          setTimeout(() => {
            bootstrapUser(session.user);
          }, 0);
        } else {
          setRoles([]);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await bootstrapUser(session.user);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [bootstrapUser]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    phoneVerificationToken: string
  ) => {
    if (!isSupabaseConfigured) {
      return { error: missingSupabaseError };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone,
          phone_verification_token: phoneVerificationToken,
        },
      },
    });

    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: missingSupabaseError };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }, []);

  const signInWithGoogle = useCallback(async (redirectPath = '/dashboard') => {
    if (!isSupabaseConfigured) {
      return { error: missingSupabaseError };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl(redirectPath),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setRoles([]);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  }, []);

  const hasRole = useCallback((role: UserRole) => roles.includes(role), [roles]);

  const refetchRoles = useCallback(async () => {
    if (user) {
      const newRoles = await fetchUserRoles(user.id);
      setRoles(newRoles);
    }
  }, [fetchUserRoles, user]);

  const value = useMemo(
    () => ({ user, session, roles, loading, signUp, signIn, signInWithGoogle, signOut, hasRole, refetchRoles }),
    [user, session, roles, loading, signUp, signIn, signInWithGoogle, signOut, hasRole, refetchRoles]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
