import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  coins: number;
  current_streak: number;
  last_active_date: string | null;
  target_exams: string[] | null;
  current_focus: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile data when user is authenticated
  const fetchProfile = async (userId: string, userEmail?: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, updated_at, coins, current_streak, last_active_date, target_exams, current_focus')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, create it (trigger should handle this, but fallback)
        if (error.code === 'PGRST116') {
          const profileData = {
            id: userId,
            email: userEmail || null,
            full_name: null,
            avatar_url: null,
            coins: 0,
            current_streak: 0,
          };

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select('id, email, full_name, avatar_url, updated_at, coins, current_streak, last_active_date, target_exams, current_focus')
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } else {
        // Ensure email is set if missing (update it)
        if (!data.email && userEmail) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ email: userEmail })
            .eq('id', userId)
            .select('id, email, full_name, avatar_url, updated_at, coins, current_streak, last_active_date, target_exams, current_focus')
            .single();
          
          if (!updateError && updatedProfile) {
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          setProfile(data);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        clearTimeout(loadingTimeout);
        console.log('Session fetched:', !!session);
        setSession(session);
        // Set loading to false immediately after getting session
        setLoading(false);
        
        // Fetch profile in background (don't block on it)
        if (session?.user) {
          console.log('Fetching profile for user:', session.user.id);
          fetchProfile(session.user.id, session.user.email).catch((err) => {
            console.error('Background profile fetch error:', err);
          });
        } else {
          setProfile(null);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        clearTimeout(loadingTimeout);
        if (mounted) {
          setLoading(false);
        }
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      clearTimeout(loadingTimeout);
      setSession(session);
      // Set loading to false immediately
      setLoading(false);
      
      // Fetch profile in background
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email).catch((err) => {
          console.error('Background profile fetch error:', err);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id, session.user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
