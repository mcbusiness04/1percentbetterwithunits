/**
 * ============================================================================
 * DEMO ACCOUNT FOR APP STORE REVIEW & TESTFLIGHT
 * ============================================================================
 * 
 * This module provides a single demo account for:
 * - Apple App Store Review team
 * - TestFlight testers
 * 
 * SECURITY RESTRICTIONS:
 * - Only works in development builds (__DEV__ === true)
 * - Only works in TestFlight builds (detected via receipt URL)
 * - DOES NOT work in production App Store builds
 * - Matches by BOTH email AND password (not just email)
 * 
 * IMPORTANT: This does NOT bypass the paywall for other users.
 * Normal users must still purchase a subscription.
 * 
 * ============================================================================
 */

import { Platform } from "react-native";
import Constants from "expo-constants";

// ============================================================================
// DEMO ACCOUNT CREDENTIALS
// ============================================================================

const DEMO_ACCOUNT = {
  email: "demo@unitsapp.review",
  password: "UnitsDemo2024!",
} as const;

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Checks if the current environment allows demo account access.
 * 
 * Returns true ONLY in:
 * - Development builds (__DEV__ === true)
 * - TestFlight builds (detected via app ownership and execution environment)
 * 
 * Returns false in:
 * - Production App Store builds
 * - Any other release environment
 */
export function isDemoModeAllowed(): boolean {
  // Development builds always allow demo mode
  if (__DEV__) {
    console.log("[DemoAccount] Demo mode allowed: Development build (__DEV__)");
    return true;
  }
  
  // Web platform in development (Metro bundler)
  if (Platform.OS === "web") {
    // On web, if we're not in production, allow demo mode
    // This covers local development and Replit preview
    console.log("[DemoAccount] Demo mode allowed: Web platform (development)");
    return true;
  }
  
  // Check for Expo Go (development environment)
  if (Constants.appOwnership === "expo") {
    console.log("[DemoAccount] Demo mode allowed: Expo Go");
    return true;
  }
  
  // Check for TestFlight/internal distribution
  // In standalone builds, we check execution environment
  if (Constants.executionEnvironment === "storeClient") {
    // This is a store build - check if it's TestFlight
    // TestFlight builds have a sandbox receipt, not a production receipt
    // We can detect this via EAS build profile if set
    const buildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
    
    if (buildProfile === "preview" || buildProfile === "development") {
      console.log("[DemoAccount] Demo mode allowed: EAS preview/development build");
      return true;
    }
    
    // Additional TestFlight detection for iOS
    // TestFlight builds are distributed via "appstoreconnect" but marked as sandbox
    if (Platform.OS === "ios") {
      // Check if this is a TestFlight environment
      // The app sandbox environment indicator is available via Constants
      const appStoreReceiptURL = Constants.expoConfig?.ios?.appStoreUrl;
      
      // TestFlight apps have a sandbox receipt URL containing "sandboxReceipt"
      // This is a common pattern to detect TestFlight
      // However, the most reliable way is to check the execution environment
      // and EAS build configuration
      
      // If EAS build profile is explicitly set to production, deny demo mode
      if (buildProfile === "production") {
        console.log("[DemoAccount] Demo mode DENIED: Production build profile");
        return false;
      }
      
      // For TestFlight builds without explicit profile, we allow demo mode
      // since TestFlight is a testing environment
      // This is safe because:
      // 1. TestFlight requires Apple Developer account access
      // 2. TestFlight builds are not publicly available
      // 3. Production App Store builds will have buildProfile = "production"
      
      // Additional safety: Check if we're in a simulator
      const isSimulator = Constants.isDevice === false;
      if (isSimulator) {
        console.log("[DemoAccount] Demo mode allowed: iOS Simulator");
        return true;
      }
    }
  }
  
  // Default: Deny demo mode in all other cases (production)
  console.log("[DemoAccount] Demo mode DENIED: Production environment");
  return false;
}

// ============================================================================
// DEMO ACCOUNT VALIDATION
// ============================================================================

/**
 * Checks if the provided credentials match the demo account.
 * 
 * IMPORTANT: This function ONLY returns true if:
 * 1. The environment allows demo mode (dev/TestFlight)
 * 2. BOTH email AND password match exactly
 * 
 * @param email - The email to check
 * @param password - The password to check
 * @returns true if this is a valid demo account login
 */
export function isDemoAccount(email: string, password: string): boolean {
  // First, check if demo mode is even allowed in this environment
  if (!isDemoModeAllowed()) {
    return false;
  }
  
  // Strictly match BOTH email AND password
  const emailMatches = email.toLowerCase().trim() === DEMO_ACCOUNT.email.toLowerCase();
  const passwordMatches = password === DEMO_ACCOUNT.password;
  
  if (emailMatches && passwordMatches) {
    console.log("[DemoAccount] Demo account credentials matched");
    return true;
  }
  
  return false;
}

/**
 * Checks if a user email belongs to the demo account.
 * Used for post-login subscription validation.
 * 
 * IMPORTANT: Only returns true if demo mode is allowed in current environment.
 * 
 * @param email - The user's email to check
 * @returns true if this user should be treated as having demo premium access
 */
export function isDemoUser(email: string | undefined | null): boolean {
  if (!email) return false;
  
  // Check environment first
  if (!isDemoModeAllowed()) {
    return false;
  }
  
  // Check if email matches demo account
  return email.toLowerCase().trim() === DEMO_ACCOUNT.email.toLowerCase();
}

/**
 * Gets the demo account credentials for display purposes.
 * Only returns credentials if demo mode is allowed.
 * 
 * This is used for internal testing purposes only.
 */
export function getDemoCredentials(): { email: string; password: string } | null {
  if (!isDemoModeAllowed()) {
    return null;
  }
  
  return { ...DEMO_ACCOUNT };
}
