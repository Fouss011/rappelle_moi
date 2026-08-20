import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { supabase } from '../services/supabase';

type Profile = {
  id: string;
  first_name: string | null;
};

type SignUpResult = {
  error: string | null;
  requiresEmailConfirmation: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<string | null>;

  signUp: (
    firstName: string,
    email: string,
    password: string
  ) => Promise<SignUpResult>;

  resetPassword: (
    email: string
  ) => Promise<string | null>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  updateProfileName: (
    firstName: string
  ) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name')
        .eq('id', userId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        console.error('Erreur de chargement du profil :', error.message);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    } catch (error) {
      console.error(
        'Erreur inattendue pendant le chargement du profil :',
        error
      );

      if (mountedRef.current) {
        setProfile(null);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    await loadProfile(user.id);
  }, [loadProfile, user?.id]);

  useEffect(() => {
    mountedRef.current = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.error(
            'Erreur pendant la restauration de la session :',
            error.message
          );

          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser?.id) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Erreur inattendue pendant l'initialisation de l'authentification :",
          error
        );

        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newUser = newSession?.user ?? null;

      setSession(newSession);
      setUser(newUser);

      if (!newUser?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        if (mountedRef.current) {
          void loadProfile(newUser.id);
        }
      }, 0);

      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      try {
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) return error.message;

        const newSession = data.session ?? null;
        const newUser = data.user ?? null;

        setSession(newSession);
        setUser(newUser);

        if (newUser?.id) {
          await loadProfile(newUser.id);
        } else {
          setProfile(null);
        }

        return null;
      } catch (error) {
        console.error('Erreur inattendue pendant la connexion :', error);
        return 'Une erreur inattendue est survenue pendant la connexion.';
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async (
      firstName: string,
      email: string,
      password: string
    ): Promise<SignUpResult> => {
      try {
        setLoading(true);

        const cleanFirstName = firstName.trim();
        const cleanEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              first_name: cleanFirstName,
            },
          },
        });

        if (error) {
          return {
            error: error.message,
            requiresEmailConfirmation: false,
          };
        }

        const newUser = data.user ?? null;
        const newSession = data.session ?? null;

        if (!newUser?.id) {
          return {
            error:
              "Le compte a été créé, mais l'utilisateur n'a pas été retourné.",
            requiresEmailConfirmation: false,
          };
        }

        if (!newSession) {
          if (mountedRef.current) {
            setSession(null);
            setUser(null);
            setProfile(null);
          }

          return {
            error: null,
            requiresEmailConfirmation: true,
          };
        }

        if (mountedRef.current) {
          setSession(newSession);
          setUser(newUser);
        }

        await loadProfile(newUser.id);

        return {
          error: null,
          requiresEmailConfirmation: false,
        };
      } catch (error) {
        console.error(
          'Erreur inattendue pendant la création du compte :',
          error
        );

        return {
          error:
            'Une erreur inattendue est survenue pendant la création du compte.',
          requiresEmailConfirmation: false,
        };
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loadProfile]
  );

  const resetPassword = useCallback(
    async (email: string): Promise<string | null> => {
      try {
        setLoading(true);

        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail) {
          return 'Entre ton adresse email.';
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: 'daya://reset-password',
          }
        );

        if (error) return error.message;

        return null;
      } catch (error) {
        console.error(
          'Erreur pendant la demande de réinitialisation :',
          error
        );

        return (
          'Impossible d’envoyer l’email de ' +
          'réinitialisation pour le moment.'
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const updateProfileName = useCallback(
    async (firstName: string): Promise<string | null> => {
      if (!user?.id) {
        return 'Utilisateur non connecté.';
      }

      const cleanFirstName = firstName.trim();

      if (!cleanFirstName) {
        return 'Entre ton prénom.';
      }

      if (cleanFirstName.length > 50) {
        return 'Le prénom est trop long.';
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: cleanFirstName,
          })
          .eq('id', user.id);

        if (error) {
          console.error(
            'Erreur pendant la modification du profil :',
            error.message
          );
          return error.message;
        }

        await loadProfile(user.id);
        return null;
      } catch (error) {
        console.error(
          'Erreur inattendue pendant la modification du profil :',
          error
        );

        return 'Impossible de modifier le profil pour le moment.';
      }
    },
    [loadProfile, user?.id]
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error(
          'Erreur pendant la déconnexion :',
          error.message
        );
      }
    } finally {
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        refreshProfile,
        updateProfileName,
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