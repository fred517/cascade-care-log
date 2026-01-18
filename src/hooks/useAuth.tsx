import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'operator' | 'supervisor' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  site_id: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

interface SignupData {
  firstName: string;
  surname: string;
  facilityName: string;
  phoneNumber: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isApproved: boolean;
  signUp: (email: string, password: string, data: SignupData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSupervisor: boolean;
  isOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile/role fetch to avoid blocking
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role using the security definer function
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      if (roleData) {
        setRole(roleData as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, data: SignupData) => {
    const redirectUrl = `${window.location.origin}/confirm-email`;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: data.firstName,
          surname: data.surname,
          facility_name: data.facilityName,
          phone_number: data.phoneNumber,
          display_name: `${data.firstName} ${data.surname}`,
        },
      },
    });

    // Send notification to admin if signup was successful
    if (!error && authData.user) {
      try {
        await supabase.functions.invoke('send-signup-notification', {
          body: {
            userId: authData.user.id,
            email: email,
            firstName: data.firstName,
            surname: data.surname,
            facilityName: data.facilityName,
            phoneNumber: data.phoneNumber,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send signup notification:', notifyError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    isApproved: profile?.is_approved ?? false,
    signUp,
    signIn,
    signOut,
    isAdmin: role === 'admin',
    isSupervisor: role === 'supervisor' || role === 'admin',
    isOperator: role === 'operator' || role === 'supervisor' || role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
