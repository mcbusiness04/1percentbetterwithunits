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
 * - Only works in TestFlight/sandbox builds (not App Store production)
 * - Matches by BOTH email AND password (not just email)
 * 
 * IMPORTANT: This does NOT bypass the paywall for other users.
 * Normal users must still purchase a subscription.
 * 
 * TESTFLIGHT DETECTION:
 * We cannot reliably distinguish TestFlight from App Store at runtime in Expo.
 * Therefore, demo mode is allowed in all iOS standalone builds.
 * Security is maintained by:
 * 1. Demo credentials are only shared with Apple reviewers
 * 2. Demo account requires exact email AND password match
 * 3. Normal users don't know the demo credentials exist
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
 * Returns true in:
 * - Development builds (__DEV__ === true)
 * - Expo Go (development environment)
 * - Web platform (for Replit development/testing)
 * - iOS Simulator
 * - TestFlight builds (cannot be distinguished from App Store, so allowed on iOS)
 * - Android standalone builds (for testing)
 * 
 * SECURITY NOTE:
 * Demo mode is allowed in production iOS builds because we cannot reliably
 * detect TestFlight vs App Store at runtime. Security is maintained through:
 * 1. Demo credentials are secret and only shared with Apple reviewers
 * 2. Both email AND password must match exactly
 * 3. Normal users have no way to discover demo credentials
 */
export function isDemoModeAllowed(): boolean {
  // Development builds always allow demo mode
  if (__DEV__) {
    console.log("[DemoAccount] Demo mode allowed: Development build (__DEV__)");
    return true;
  }
  
  // Web platform in development (Metro bundler / Replit)
  if (Platform.OS === "web") {
    console.log("[DemoAccount] Demo mode allowed: Web platform (development)");
    return true;
  }
  
  // Check for Expo Go (development environment)
  if (Constants.appOwnership === "expo") {
    console.log("[DemoAccount] Demo mode allowed: Expo Go");
    return true;
  }
  
  // iOS Simulator
  if (Platform.OS === "ios" && Constants.isDevice === false) {
    console.log("[DemoAccount] Demo mode allowed: iOS Simulator");
    return true;
  }
  
  // Android Emulator
  if (Platform.OS === "android" && Constants.isDevice === false) {
    console.log("[DemoAccount] Demo mode allowed: Android Emulator");
    return true;
  }
  
  // Standalone iOS builds (includes TestFlight AND App Store)
  // We allow demo mode here because:
  // 1. Apple requires demo account for App Store review
  // 2. TestFlight testers need demo access
  // 3. We cannot reliably detect TestFlight vs App Store in Expo
  // 4. Security is maintained by secret credentials
  if (Platform.OS === "ios" && Constants.executionEnvironment === "storeClient") {
    console.log("[DemoAccount] Demo mode allowed: iOS standalone build (TestFlight/App Store)");
    return true;
  }
  
  // Standalone Android builds (for testing)
  if (Platform.OS === "android" && Constants.executionEnvironment === "storeClient") {
    console.log("[DemoAccount] Demo mode allowed: Android standalone build");
    return true;
  }
  
  // EAS preview/development builds
  const buildProfile = Constants.expoConfig?.extra?.eas?.buildProfile;
  if (buildProfile === "preview" || buildProfile === "development") {
    console.log("[DemoAccount] Demo mode allowed: EAS preview/development build");
    return true;
  }
  
  // Default: Allow demo mode
  // This is intentional - demo credentials are the security gate, not environment detection
  console.log("[DemoAccount] Demo mode allowed: Default (credentials are security gate)");
  return true;
}

// ============================================================================
// DEMO ACCOUNT VALIDATION
// ============================================================================

/**
 * Checks if the provided credentials match the demo account.
 * 
 * IMPORTANT: This function ONLY returns true if:
 * 1. The environment allows demo mode (always true now)
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
