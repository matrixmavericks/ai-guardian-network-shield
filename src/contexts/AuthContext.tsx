import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  logout: async () => {},
  login: async () => { throw new Error('Not initialized'); },
  signUp: async () => {},
});

const DEFAULT_ROLE = 'student';

export const useAuth = () => useContext(AuthContext);

const getSafeRole = (requestedRole?: string | null) => {
  return requestedRole === 'teacher' || requestedRole === 'parent' ? requestedRole : DEFAULT_ROLE;
};

const getFallbackAuthUser = (supabaseUser: User, role = getSafeRole(supabaseUser.user_metadata?.requested_role)) => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  role,
  fullName:
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.email?.split('@')[0] ||
    'User',
});

const isNetworkError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    error instanceof TypeError ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')
  );
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function recoverSessionAfterNetworkError() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session;
    }
    await wait(300);
  }

  return null;
}

async function ensureUserSetup(supabaseUser: User) {
  const fullName = supabaseUser.user_metadata?.full_name as string | undefined;
  const safeRole = getSafeRole(supabaseUser.user_metadata?.requested_role as string | undefined);

  try {
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();

    if (profileFetchError) throw profileFetchError;

    if (!profile) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: supabaseUser.id,
        full_name: fullName || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || null,
      });

      if (profileError) {
        throw profileError;
      }
    } else if (!profile.email && supabaseUser.email) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ email: supabaseUser.email })
        .eq('user_id', supabaseUser.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supabaseUser.id);

    if (rolesError) {
      throw rolesError;
    }

    if (!roles || roles.length === 0) {
      const { error: roleInsertError } = await supabase.from('user_roles').insert({
        user_id: supabaseUser.id,
        role: safeRole as any,
      });

      if (roleInsertError) {
        throw roleInsertError;
      }
    }
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn('Skipping user setup because the network is temporarily unavailable.', error);
      return;
    }

    throw error;
  }
}

async function buildAuthUser(supabaseUser: User): Promise<AuthUser> {
  await ensureUserSetup(supabaseUser);

  const fallbackUser = getFallbackAuthUser(supabaseUser);

  const [rolesResult, profileResult] = await Promise.allSettled([
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supabaseUser.id),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', supabaseUser.id)
      .maybeSingle(),
  ]);

  const role =
    rolesResult.status === 'fulfilled' && !rolesResult.value.error
      ? rolesResult.value.data?.[0]?.role || fallbackUser.role
      : fallbackUser.role;

  const fullName =
    profileResult.status === 'fulfilled' && !profileResult.value.error
      ? profileResult.value.data?.full_name || fallbackUser.fullName
      : fallbackUser.fullName;

  return {
    ...fallbackUser,
    role,
    fullName,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncAuthState = async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setUser(null);
      return;
    }

    try {
      const authUser = await buildAuthUser(nextSession.user);
      setUser(authUser);
    } catch (error) {
      console.error('Failed to build auth user:', error);
      setUser(getFallbackAuthUser(nextSession.user, user?.role));
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, newSession) => {
      void syncAuthState(newSession).finally(() => {
        setIsLoading(false);
      });
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      void syncAuthState(existingSession).finally(() => {
        setIsLoading(false);
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const handleLogin = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Login failed');

      const authUser = await buildAuthUser(data.user);
      setUser(authUser);
      setSession(data.session);
      return authUser;
    } catch (error) {
      if (isNetworkError(error)) {
        const recoveredSession = await recoverSessionAfterNetworkError();

        if (recoveredSession?.user) {
          const authUser = await buildAuthUser(recoveredSession.user);
          setUser(authUser);
          setSession(recoveredSession);
          return authUser;
        }

        throw new Error('We could not reach the authentication service. Please try again in a moment.');
      }

      throw error;
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string, role: string) => {
    const safeRole = getSafeRole(role);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          requested_role: safeRole,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      logout: handleLogout,
      login: handleLogin,
      signUp: handleSignUp,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
