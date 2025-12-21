import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Only set up URL polyfill for native platforms
if (Platform.OS !== "web") {
  require("react-native-url-polyfill/auto");
}

// Hardcoded Supabase credentials 
const SUPABASE_URL = "https://rleheeagukbgovoywnlb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZWhlZWFndWtiZ292b3l3bmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTg0NDksImV4cCI6MjA4MTU3NDQ0OX0.cw-TdZkbLnz4h2dp06LP8Ukc4Wp_JXr9VFuCl9F3aKU";

// Check if Supabase is properly configured
export const isSupabaseConfigured = true;

// Create the Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  email: string;
  onboarding_answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  product_id: string;
  transaction_id: string | null;
  original_transaction_id: string | null;
  purchase_date: string | null;
  expires_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
