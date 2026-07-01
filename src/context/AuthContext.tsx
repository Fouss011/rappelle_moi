import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '../services/supabase';

type Profile = {
  id: string;
  first_name: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    firstName: string,
    email: string,
    password: string
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const currentSession = data.session;
      const currentUser = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser?.id) {
        await loadProfile(currentUser.id);
      }

      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const newUser = newSession?.user ?? null;

        setSession(newSession);
        setUser(newUser);

        if (newUser?.id) {
          await loadProfile(newUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return error.message;

  if (data.user?.id) {
    await loadProfile(data.user.id);
  }

  return null;
};

  const signUp = async (
    firstName: string,
    email: string,
    password: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return error.message;

    const newUser = data.user;

    if (newUser?.id) {
  const { error: profileError } = await supabase.from('profiles').insert({
    id: newUser.id,
    first_name: firstName.trim(),
  });

  if (profileError) return profileError.message;

  setProfile({
    id: newUser.id,
    first_name: firstName.trim(),
  });
}
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }

  return context;
}