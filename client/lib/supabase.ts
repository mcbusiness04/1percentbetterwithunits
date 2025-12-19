import { setupURLPolyfill } from "react-native-url-polyfill";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

setupURLPolyfill();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://"));

// Create a dummy client if not configured to prevent crashes
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);

export type Profile = {
  id: string;
  email: string;
  is_premium: boolean;
  onboarding_answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
