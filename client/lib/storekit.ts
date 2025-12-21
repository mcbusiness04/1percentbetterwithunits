/**
 * ============================================================================
 * APPLE IN-APP PURCHASE (IAP) MODULE
 * ============================================================================
 * 
 * This file contains ALL Apple StoreKit / In-App Purchase related code.
 * 
 * PRODUCT IDS (configured in App Store Connect):
 * - units.fullaccess.monthly  - $4.99/month subscription
 * - units.fullaccess.yearly   - $19.99/year subscription
 * 
 * KEY FUNCTIONS:
 * - loadIAPModule()           - Dynamically loads expo-iap (dev builds only)
 * - initializeIAP()           - Establishes StoreKit connection
 * - getSubscriptionProducts() - Fetches product info from App Store
 * - purchaseSubscription()    - Triggers Apple's native payment sheet
 * - restorePurchasesFromStore() - Restores previous purchases (App Store requirement)
 * - validatePremiumAccess()   - Validates subscription status
 * 
 * EXPO GO LIMITATION:
 * IAP requires a development/production build. This module returns fallback
 * data when running in Expo Go to prevent crashes.
 * 
 * ============================================================================
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase, isSupabaseConfigured } from "./supabase";
import { setIsPro as setLocalIsPro, getIsPro as getLocalIsPro } from "./storage";

// ============================================================================
// PRODUCT CONFIGURATION
// ============================================================================

export const PRODUCT_IDS = {
  MONTHLY: "units.fullaccess.monthly",
  YEARLY: "units.fullaccess.yearly",
} as const;

export type SubscriptionProduct = {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceValue: number;
  currency: string;
  type: "monthly" | "yearly";
};

// ============================================================================
// MODULE STATE
// ============================================================================

let iapModule: typeof import("expo-iap") | null = null;
let isIAPAvailable = false;
let isIAPInitialized = false;

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detects if app is running in Expo Go (where IAP is not available)
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Checks if IAP is supported on current platform
 */
export function isIAPSupported(): boolean {
  return (Platform.OS === "ios" || Platform.OS === "android") && !isExpoGo();
}

/**
 * Returns whether IAP module was successfully loaded
 */
export function getIAPAvailability(): boolean {
  return isIAPAvailable;
}

// ============================================================================
// IAP MODULE LOADING
// ============================================================================

/**
 * Dynamically loads the expo-iap module.
 * Returns null if:
 * - Running on web platform
 * - Running in Expo Go
 * - Native module unavailable
 */
export async function loadIAPModule(): Promise<typeof import("expo-iap") | null> {
  if (iapModule !== null) return iapModule;
  
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    console.log("[StoreKit] IAP not available on web platform");
    return null;
  }
  
  if (isExpoGo()) {
    console.log("[StoreKit] IAP not available in Expo Go - requires development build");
    return null;
  }
  
  try {
    const module = await import("expo-iap");
    iapModule = module;
    isIAPAvailable = true;
    console.log("[StoreKit] IAP module loaded successfully");
    return module;
  } catch (error) {
    console.log("[StoreKit] IAP module not available (requires development build):", error);
    isIAPAvailable = false;
    return null;
  }
}

// ============================================================================
// STOREKIT CONNECTION
// ============================================================================

/**
 * Initializes connection to Apple StoreKit
 */
export async function initializeIAP(): Promise<boolean> {
  if (isIAPInitialized) return true;
  
  const module = await loadIAPModule();
  if (!module) return false;
  
  try {
    const result = await module.initConnection();
    isIAPInitialized = true;
    console.log("[StoreKit] Connection initialized:", result);
    return true;
  } catch (error) {
    console.error("[StoreKit] Failed to initialize connection:", error);
    return false;
  }
}

/**
 * Ends StoreKit connection (call on app unmount)
 */
export async function endIAPConnection(): Promise<void> {
  const module = await loadIAPModule();
  if (!module) return;
  
  try {
    await module.endConnection();
    isIAPInitialized = false;
    console.log("[StoreKit] Connection ended");
  } catch (error) {
    console.error("[StoreKit] Failed to end connection:", error);
  }
}

// ============================================================================
// PRODUCT FETCHING
// ============================================================================

/**
 * Fetches subscription products from App Store Connect.
 * Returns fallback products if StoreKit unavailable.
 */
export async function getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
  const module = await loadIAPModule();
  if (!module) {
    console.log("[StoreKit] Using fallback products (IAP unavailable)");
    return getFallbackProducts();
  }
  
  try {
    await initializeIAP();
    
    const skus = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];
    const products = await module.fetchProducts({ skus, type: "subs" });
    
    if (!products || products.length === 0) {
      console.log("[StoreKit] No products found from App Store, using fallback");
      return getFallbackProducts();
    }
    
    console.log("[StoreKit] Fetched", products.length, "products from App Store");
    
    return products.map((product) => ({
      productId: product.id,
      title: product.title || (product.id.includes("monthly") ? "Monthly" : "Yearly"),
      description: product.description || "",
      price: product.displayPrice || (product.id.includes("monthly") ? "$4.99" : "$19.99"),
      priceValue: product.price ?? (product.id.includes("monthly") ? 4.99 : 19.99),
      currency: product.currency || "USD",
      type: product.id.includes("monthly") ? "monthly" : "yearly",
    }));
  } catch (error) {
    console.error("[StoreKit] Failed to fetch products:", error);
    return getFallbackProducts();
  }
}

/**
 * Returns fallback product info when StoreKit is unavailable
 */
export function getFallbackProducts(): SubscriptionProduct[] {
  return [
    {
      productId: PRODUCT_IDS.MONTHLY,
      title: "Monthly",
      description: "Full access - billed monthly",
      price: "$4.99",
      priceValue: 4.99,
      currency: "USD",
      type: "monthly",
    },
    {
      productId: PRODUCT_IDS.YEARLY,
      title: "Annual",
      description: "Full access - billed yearly",
      price: "$19.99",
      priceValue: 19.99,
      currency: "USD",
      type: "yearly",
    },
  ];
}

// ============================================================================
// PURCHASE FLOW
// ============================================================================

export type PurchaseResult = {
  success: boolean;
  error?: string;
  transactionId?: string;
};

/**
 * Initiates Apple's native payment sheet for a subscription.
 * Handles the complete purchase flow including transaction finishing.
 */
export async function purchaseSubscription(
  productId: string,
  userId?: string
): Promise<PurchaseResult> {
  const module = await loadIAPModule();
  
  if (!module) {
    if (Platform.OS === "web") {
      return { success: false, error: "Purchases are not available on web. Please use the iOS app." };
    }
    return { 
      success: false, 
      error: "In-app purchases require a development build. This feature is not available in Expo Go." 
    };
  }

  try {
    await initializeIAP();
    
    console.log("[StoreKit] Requesting purchase for:", productId);
    
    // Trigger Apple's native payment sheet
    const purchase = await module.requestPurchase({
      request: {
        apple: { sku: productId },
        google: { skus: [productId] },
      },
      type: "subs",
    });
    
    if (!purchase) {
      return { success: false, error: "Purchase was cancelled" };
    }

    const transactionId = Array.isArray(purchase) 
      ? purchase[0]?.transactionId 
      : purchase.transactionId;

    if (!transactionId) {
      return { success: false, error: "Invalid purchase response" };
    }

    console.log("[StoreKit] Purchase successful, transaction:", transactionId);

    // Finish the transaction with Apple
    try {
      await module.finishTransaction({ 
        purchase: Array.isArray(purchase) ? purchase[0] : purchase,
        isConsumable: false,
      });
      console.log("[StoreKit] Transaction finished");
    } catch (finishError) {
      console.error("[StoreKit] Failed to finish transaction:", finishError);
    }

    // Save premium status locally
    await setLocalIsPro(true);

    // Sync to Supabase if user is logged in
    if (userId) {
      await updateSupabasePremiumStatus(userId);
    }

    return { success: true, transactionId };
  } catch (error: any) {
    const errorMessage = error?.message || "Purchase failed";
    
    // Handle user cancellation gracefully
    if (errorMessage.includes("cancelled") || errorMessage.includes("canceled") || error?.code === "user-cancelled") {
      return { success: false, error: "Purchase was cancelled" };
    }

    console.error("[StoreKit] Purchase error:", error);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// RESTORE PURCHASES (Required by App Store Review)
// ============================================================================

export type RestoreResult = {
  success: boolean;
  hasPremium: boolean;
  error?: string;
};

/**
 * Restores previous purchases from App Store.
 * This is REQUIRED by App Store Review Guidelines.
 */
export async function restorePurchasesFromStore(
  userId?: string
): Promise<RestoreResult> {
  const module = await loadIAPModule();
  
  if (!module) {
    if (Platform.OS === "web") {
      return { success: false, hasPremium: false, error: "Restore is not available on web." };
    }
    return { success: false, hasPremium: false, error: "Restore requires a development build." };
  }
  
  try {
    await initializeIAP();
    
    console.log("[StoreKit] Restoring purchases...");
    
    const purchases = await module.getAvailablePurchases();
    
    const hasValidSubscription = purchases.some((purchase) => {
      return (
        purchase.productId === PRODUCT_IDS.MONTHLY ||
        purchase.productId === PRODUCT_IDS.YEARLY
      );
    });
    
    console.log("[StoreKit] Restore complete. Has valid subscription:", hasValidSubscription);
    
    if (hasValidSubscription) {
      // Save premium status locally
      await setLocalIsPro(true);
      
      // Sync to Supabase if user is logged in
      if (userId) {
        await updateSupabasePremiumStatus(userId);
      }
    }
    
    return { success: true, hasPremium: hasValidSubscription };
  } catch (error: any) {
    console.error("[StoreKit] Restore purchases error:", error);
    return { 
      success: false, 
      hasPremium: false, 
      error: error?.message || "Failed to restore purchases" 
    };
  }
}

// ============================================================================
// PREMIUM VALIDATION
// ============================================================================

/**
 * Validates premium access with App Store re-validation.
 * 
 * COMPLIANCE: This function always re-validates with App Store when available,
 * and will REVOKE premium if the subscription is no longer active.
 * 
 * Validation order:
 * 1. App Store (authoritative source - if available)
 * 2. Supabase profile (if authenticated)
 * 3. Local storage (fallback only when App Store unavailable)
 * 
 * @param userId - Optional Supabase user ID
 * @param forceAppStoreCheck - If true, always check App Store (used on app launch)
 */
export async function validatePremiumAccess(
  userId?: string,
  forceAppStoreCheck: boolean = true
): Promise<boolean> {
  const module = await loadIAPModule();
  
  // If App Store is available, it is the authoritative source
  if (module && forceAppStoreCheck) {
    try {
      await initializeIAP();
      const purchases = await module.getAvailablePurchases();
      
      const hasValidSubscription = purchases.some((purchase) => {
        return (
          purchase.productId === PRODUCT_IDS.MONTHLY ||
          purchase.productId === PRODUCT_IDS.YEARLY
        );
      });
      
      if (hasValidSubscription) {
        // Valid subscription - update all sources
        await setLocalIsPro(true);
        if (userId) {
          await updateSupabasePremiumStatus(userId);
        }
        console.log("[StoreKit] Premium VALIDATED from App Store");
        return true;
      } else {
        // No valid subscription - REVOKE premium from all sources
        await setLocalIsPro(false);
        if (userId) {
          await revokeSupabasePremiumStatus(userId);
        }
        console.log("[StoreKit] Premium REVOKED - no active App Store subscription");
        return false;
      }
    } catch (error) {
      console.log("[StoreKit] Error validating with App Store:", error);
      // On error, fall through to other validation methods
    }
  }
  
  // Fallback: Check Supabase subscriptions table if authenticated (for when App Store unavailable)
  if (userId && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("is_active, expires_date")
        .eq("user_id", userId)
        .single();
      
      if (data?.is_active) {
        // Check if subscription hasn't expired
        const isExpired = data.expires_date && new Date(data.expires_date) < new Date();
        if (!isExpired) {
          // Sync to local storage
          await setLocalIsPro(true);
          console.log("[StoreKit] Premium validated from Supabase subscriptions (App Store unavailable)");
          return true;
        }
      }
    } catch (error) {
      console.log("[StoreKit] Error checking Supabase subscription:", error);
    }
  }
  
  // NOTE: Local storage is NOT used as a fallback for validation.
  // Premium access requires either:
  // 1. Valid App Store subscription (when available)
  // 2. Active subscription record in Supabase (when App Store unavailable)
  // This prevents local storage manipulation from granting premium access.
  
  console.log("[StoreKit] No premium access found - requires server validation");
  await setLocalIsPro(false); // Ensure local cache reflects server state
  return false;
}

/**
 * Revokes premium status in Supabase subscriptions table
 */
export async function revokeSupabasePremiumStatus(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase
      .from("subscriptions")
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", userId);
    console.log("[StoreKit] Revoked premium status in Supabase subscriptions");
  } catch (error) {
    console.error("[StoreKit] Failed to revoke Supabase premium status:", error);
  }
}

// ============================================================================
// SUPABASE SYNC
// ============================================================================

/**
 * Updates/creates subscription record in Supabase subscriptions table
 * Called after successful App Store purchase validation
 */
export async function updateSupabasePremiumStatus(userId: string, productId?: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    // Upsert subscription record
    await supabase
      .from("subscriptions")
      .upsert({ 
        user_id: userId,
        product_id: productId || "unknown",
        is_active: true, 
        updated_at: new Date().toISOString(),
        purchase_date: new Date().toISOString(),
      }, { onConflict: "user_id" });
    console.log("[StoreKit] Synced premium status to Supabase subscriptions");
  } catch (error) {
    console.error("[StoreKit] Failed to update Supabase premium status:", error);
  }
}

/**
 * Checks Supabase subscriptions table for premium status
 */
export async function checkSupabasePremiumStatus(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("is_active, expires_date")
      .eq("user_id", userId)
      .single();
    
    if (!data?.is_active) return false;
    
    // Check if subscription hasn't expired
    const isExpired = data.expires_date && new Date(data.expires_date) < new Date();
    return !isExpired;
  } catch (error) {
    console.error("[StoreKit] Failed to check Supabase premium status:", error);
    return false;
  }
}
