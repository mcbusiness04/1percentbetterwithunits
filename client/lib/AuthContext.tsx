import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase, Profile, isSupabaseConfigured } from "@/lib/supabase";
import { getIsPro } from "@/lib/storage";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPremium: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updatePremiumStatus: (isPremium: boolean) => Promise<void>;
  updateOnboardingAnswers: (answers: Record<string, unknown>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    if (!isSupabaseConfigured) return null;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // Profile doesn't exist - create it
      if (error.code === "PGRST116" && userEmail) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            email: userEmail,
            is_premium: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });

        if (!upsertError) {
          // Re-fetch after creating
          const { data: newData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          return newData as Profile | null;
        }
      }
      return null;
    }
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user.email ?? undefined);
      if (profileData) {
        setProfile(profileData);
      }
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email ?? undefined).then(setProfile);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id, session.user.email ?? undefined);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncLocalPremiumStatus = async (userId: string, userEmail?: string) => {
    // Check if user has local premium status (from onboarding paywall)
    const localIsPro = await getIsPro();
    if (localIsPro) {
      // Sync local premium status to Supabase profile
      const { error } = await supabase
        .from("profiles")
        .update({ is_premium: true, updated_at: new Date().toISOString() })
        .eq("id", userId);
      
      if (!error) {
        // Refresh profile to get updated premium status
        const profileData = await fetchProfile(userId, userEmail);
        if (profileData) {
          setProfile(profileData);
        }
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: "Supabase not configured" } as AuthError };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // After successful signup, sync local premium status
    if (!error && data.user) {
      await syncLocalPremiumStatus(data.user.id, data.user.email ?? undefined);
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: "Supabase not configured" } as AuthError };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // After successful signin, sync local premium status
    if (!error && data.user) {
      await syncLocalPremiumStatus(data.user.id, data.user.email ?? undefined);
    }
    
    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(null);
  };

  const updatePremiumStatus = async (isPremium: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, is_premium: isPremium } : null));
    }
  };

  const updateOnboardingAnswers = async (answers: Record<string, unknown>) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_answers: answers, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, onboarding_answers: answers } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isPremium: profile?.is_premium ?? false,
        signUp,
        signIn,
        signOut,
        updatePremiumStatus,
        updateOnboardingAnswers,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
