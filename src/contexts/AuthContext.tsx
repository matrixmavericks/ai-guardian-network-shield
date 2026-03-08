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

export const useAuth = () => useContext(AuthContext);

async function ensureUserSetup(supabaseUser: User) {
  const fullName = supabaseUser.user_metadata?.full_name as string | undefined;
  const requestedRole = supabaseUser.user_metadata?.requested_role as string | undefined;
  const safeRole = requestedRole === 'teacher' || requestedRole === 'parent' ? requestedRole : 'student';

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', supabaseUser.id)
    .maybeSingle();

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
    // Backfill email if missing
    await supabase.from('profiles').update({ email: supabaseUser.email }).eq('user_id', supabaseUser.id);
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
}

async function buildAuthUser(supabaseUser: User): Promise<AuthUser> {
  await ensureUserSetup(supabaseUser);

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supabaseUser.id);

  const role = roles?.[0]?.role || 'student';

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', supabaseUser.id)
    .maybeSingle();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    role,
    fullName: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Use setTimeout to avoid potential deadlock with Supabase client
        setTimeout(async () => {
          try {
            const authUser = await buildAuthUser(newSession.user);
            setUser(authUser);
          } catch (e) {
            console.error('Failed to build auth user:', e);
            setUser(null);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        try {
          const authUser = await buildAuthUser(existingSession.user);
          setUser(authUser);
        } catch (e) {
          console.error('Failed to build auth user:', e);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const handleLogin = async (email: string, password: string): Promise<AuthUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Login failed');
    const authUser = await buildAuthUser(data.user);
    setUser(authUser);
    setSession(data.session);
    return authUser;
  };

  const handleSignUp = async (email: string, password: string, fullName: string, role: string) => {
    const safeRole = role === 'teacher' || role === 'parent' ? role : 'student';
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
