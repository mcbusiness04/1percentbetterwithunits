/**
 * ============================================================================
 * DEMO ACCOUNT FOR APP STORE REVIEW & TESTFLIGHT
 * ============================================================================
 * 
 * This module provides a single demo account for:
 * - Apple App Store Review team
 * - TestFlight testers
 * 
 * SECURITY CONTROL:
 * Demo bypass is controlled by the ALLOW_DEMO_REVIEW_LOGIN environment variable.
 * - Default: OFF (false) - demo bypass NEVER works
 * - Must be explicitly set to true in EAS build config for TestFlight builds
 * - App Store production builds must NOT have this enabled
 * 
 * HOW IT WORKS:
 * 1. ALLOW_DEMO_REVIEW_LOGIN is read from app.json → extra → ALLOW_DEMO_REVIEW_LOGIN
 * 2. For EAS builds, set in eas.json env vars for the preview/development profile
 * 3. Production profile must NOT set this variable (defaults to false)
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
// ENVIRONMENT VARIABLE CHECK
// ============================================================================

/**
 * Checks if ALLOW_DEMO_REVIEW_LOGIN is explicitly enabled.
 * 
 * This is the ONLY security gate for demo account access.
 * 
 * CRITICAL SECURITY REQUIREMENTS:
 * - Demo bypass is NOT dependent on __DEV__ (would allow bypass in dev builds)
 * - Demo bypass is NOT dependent on Platform.OS === "web" (would allow bypass on web)
 * - Demo bypass is NOT dependent on Expo Go detection
 * - Demo bypass ONLY works when ALLOW_DEMO_REVIEW_LOGIN === true
 * 
 * Returns true ONLY if:
 * - ALLOW_DEMO_REVIEW_LOGIN is explicitly set to true in app config
 * 
 * Returns false in:
 * - All other cases (including production App Store builds)
 * - Development builds without explicit ALLOW_DEMO_REVIEW_LOGIN=true
 * - Web builds without explicit ALLOW_DEMO_REVIEW_LOGIN=true
 */
function isAllowDemoReviewLoginEnabled(): boolean {
  // Check expo-constants extra config (set at build time)
  const extraConfig = Constants.expoConfig?.extra;
  
  // ONLY the explicit environment variable controls demo access
  // No fallbacks for __DEV__, web, or Expo Go - this is intentional
  if (extraConfig?.ALLOW_DEMO_REVIEW_LOGIN === true) {
    console.log("[DemoAccount] ALLOW_DEMO_REVIEW_LOGIN is explicitly enabled");
    return true;
  }
  
  // Default: Demo mode is OFF in all other cases
  console.log("[DemoAccount] ALLOW_DEMO_REVIEW_LOGIN is NOT enabled - demo mode denied");
  return false;
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Checks if the current environment allows demo account access.
 * 
 * Returns true ONLY if:
 * - ALLOW_DEMO_REVIEW_LOGIN env var is explicitly set to true, OR
 * - Running in __DEV__ mode (local development), OR
 * - Running on web platform (Replit testing)
 * 
 * Returns false in:
 * - Production App Store builds (ALLOW_DEMO_REVIEW_LOGIN not set or false)
 * - Any release build without explicit ALLOW_DEMO_REVIEW_LOGIN=true
 * 
 * IMPORTANT: This function is the security gate. Do not modify
 * to allow demo access based on any other criteria.
 */
export function isDemoModeAllowed(): boolean {
  return isAllowDemoReviewLoginEnabled();
}

// ============================================================================
// DEMO ACCOUNT VALIDATION
// ============================================================================

/**
 * Checks if the provided credentials match the demo account.
 * 
 * IMPORTANT: This function ONLY returns true if:
 * 1. ALLOW_DEMO_REVIEW_LOGIN is explicitly enabled
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
 * IMPORTANT: Only returns true if:
 * 1. ALLOW_DEMO_REVIEW_LOGIN is explicitly enabled
 * 2. Email matches demo account
 * 
 * @param email - The user's email to check
 * @returns true if this user should be treated as having demo premium access
 */
export function isDemoUser(email: string | undefined | null): boolean {
  if (!email) return false;
  
  // Check environment first - this is the security gate
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
