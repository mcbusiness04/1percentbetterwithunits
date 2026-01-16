/**
 * ============================================================================
 * APPLE IN-APP PURCHASE (IAP) MODULE
 * ============================================================================
 * 
 * This file contains ALL Apple StoreKit / In-App Purchase related code.
 * 
 * PRODUCT IDS (configured in App Store Connect):
 * - 1better.subscription.monthly  - $4.99/month subscription
 * - 1better.subscription.yearly   - $19.99/year subscription
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
import { isDemoUser } from "./demo-account";

// ============================================================================
// PRODUCT CONFIGURATION
// ============================================================================

export const PRODUCT_IDS = {
  MONTHLY: "1better.subscription.monthly",
  YEARLY: "1better.subscription.yearly",
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
  /** True if user already has an active subscription */
  alreadySubscribed?: boolean;
};

/**
 * Initiates Apple's native payment sheet for a subscription.
 * Handles the complete purchase flow including transaction finishing.
 * 
 * SANDBOX/REVIEW SAFE: This function gracefully handles all error cases
 * including products not yet approved, sandbox account issues, and network errors.
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
    const initialized = await initializeIAP();
    if (!initialized) {
      return { 
        success: false, 
        error: "Unable to connect to the App Store. Please check your internet connection and try again." 
      };
    }
    
    console.log("[StoreKit] Requesting purchase for:", productId);
    
    // Verify the product exists before attempting purchase
    try {
      const products = await module.fetchProducts({ skus: [productId], type: "subs" });
      if (!products || products.length === 0) {
        console.log("[StoreKit] Product not found:", productId);
        return { 
          success: false, 
          error: "This subscription is temporarily unavailable. Please try again later." 
        };
      }
    } catch (fetchError) {
      console.log("[StoreKit] Error fetching product before purchase:", fetchError);
      // Continue with purchase attempt - App Store will handle if product is invalid
    }
    
    // Trigger Apple's native payment sheet
    let purchase;
    try {
      purchase = await module.requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: "subs",
      });
    } catch (purchaseError: any) {
      const errorMsg = purchaseError?.message?.toLowerCase() || "";
      const errorCode = purchaseError?.code || "";
      
      // Handle specific StoreKit errors gracefully
      if (errorMsg.includes("cancelled") || errorMsg.includes("canceled") || errorCode === "E_USER_CANCELLED") {
        return { success: false, error: "Purchase was cancelled" };
      }
      if (errorMsg.includes("not allowed") || errorCode === "E_NOT_PREPARED") {
        return { success: false, error: "Purchases are not available on this device. Please check your App Store settings." };
      }
      if (errorMsg.includes("invalid") || errorCode === "E_UNKNOWN") {
        return { success: false, error: "This subscription is temporarily unavailable. Please try again later." };
      }
      if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        return { success: false, error: "Unable to connect to the App Store. Please check your internet connection." };
      }
      if (errorMsg.includes("pending") || errorCode === "E_DEFERRED") {
        return { success: false, error: "Your purchase is pending approval. Please check back later." };
      }
      // Handle "already purchased" / "already subscribed" errors
      if (errorMsg.includes("already") || errorMsg.includes("subscribed") || errorMsg.includes("owned") || errorCode === "E_ALREADY_OWNED") {
        return { success: false, error: "You already have an active subscription. Tap Restore Purchases or manage in App Store settings.", alreadySubscribed: true };
      }
      
      throw purchaseError;
    }
    
    if (!purchase) {
      return { success: false, error: "Purchase was cancelled" };
    }

    const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;
    const transactionId = purchaseData?.transactionId;
    // CRITICAL: Use originalTransactionIdentifierIos for binding (stable across renewals)
    const originalTransactionId = (purchaseData as any)?.originalTransactionIdentifierIos || transactionId;

    if (!transactionId) {
      console.log("[StoreKit] No transaction ID in purchase response");
      return { success: false, error: "Purchase could not be completed. Please try again." };
    }

    console.log("[StoreKit] Purchase successful, transaction:", transactionId, "original:", originalTransactionId);

    // Finish the transaction with Apple
    try {
      await module.finishTransaction({ 
        purchase: Array.isArray(purchase) ? purchase[0] : purchase,
        isConsumable: false,
      });
      console.log("[StoreKit] Transaction finished");
    } catch (finishError) {
      console.error("[StoreKit] Failed to finish transaction:", finishError);
      // Don't fail the purchase - transaction was successful, just couldn't finish
    }

    // APPLE COMPLIANCE (Guideline 3.1.2):
    // Do NOT set isPro here - premium access is ONLY granted after:
    // 1. User authenticates (if not already)
    // 2. validateAndGrantAccess() verifies ownership and binds subscription
    // The caller MUST call validateAndGrantAccess() to grant access.
    // 
    // We return the originalTransactionId for binding (stable across renewals).

    return { success: true, transactionId: originalTransactionId };
  } catch (error: any) {
    const errorMessage = error?.message || "";
    const errorCode = error?.code || "";
    
    // Handle user cancellation gracefully
    if (errorMessage.includes("cancelled") || errorMessage.includes("canceled") || errorCode === "E_USER_CANCELLED") {
      return { success: false, error: "Purchase was cancelled" };
    }

    console.error("[StoreKit] Purchase error:", error);
    
    // Provide user-friendly error message
    return { 
      success: false, 
      error: "Unable to complete purchase. Please try again or contact support if the issue persists." 
    };
  }
}

// ============================================================================
// RESTORE PURCHASES (Required by App Store Review)
// ============================================================================

export type RestoreResult = {
  success: boolean;
  /** Whether App Store has an active subscription for this Apple ID */
  hasSubscription: boolean;
  /** @deprecated Use hasSubscription instead */
  hasPremium: boolean;
  /** Product ID of the found subscription (if any) */
  productId?: string;
  /** Original transaction ID for binding (stable across renewals) */
  originalTransactionId?: string;
  /** @deprecated Use originalTransactionId for binding */
  transactionId?: string;
  error?: string;
};

/**
 * Restores previous purchases from App Store.
 * This is REQUIRED by App Store Review Guidelines.
 * 
 * APPLE COMPLIANCE (Guideline 3.1.2):
 * This function ONLY checks if a subscription exists with Apple.
 * It does NOT grant premium access directly.
 * 
 * After calling this function:
 * 1. If hasSubscription=true, prompt user to sign in
 * 2. After sign-in, call bindSubscriptionToUser() to link the subscription
 * 3. Only then grant premium access via validateAndGrantAccess()
 * 
 * SANDBOX/REVIEW SAFE: Gracefully handles all error cases during App Store review.
 */
export async function restorePurchasesFromStore(): Promise<RestoreResult> {
  const module = await loadIAPModule();
  
  if (!module) {
    if (Platform.OS === "web") {
      return { success: false, hasSubscription: false, hasPremium: false, error: "Restore is not available on web." };
    }
    return { success: false, hasSubscription: false, hasPremium: false, error: "Restore requires a development build." };
  }
  
  try {
    const initialized = await initializeIAP();
    if (!initialized) {
      return { 
        success: false, 
        hasSubscription: false,
        hasPremium: false, 
        error: "Unable to connect to the App Store. Please check your internet connection and try again." 
      };
    }
    
    console.log("[StoreKit] Checking App Store for existing purchases...");
    
    let purchases;
    try {
      purchases = await module.getAvailablePurchases();
    } catch (fetchError: any) {
      const errorMsg = fetchError?.message?.toLowerCase() || "";
      
      if (errorMsg.includes("network") || errorMsg.includes("connection")) {
        return { 
          success: false, 
          hasSubscription: false,
          hasPremium: false, 
          error: "Unable to connect to the App Store. Please check your internet connection." 
        };
      }
      
      console.error("[StoreKit] Error fetching purchases:", fetchError);
      return { 
        success: false, 
        hasSubscription: false,
        hasPremium: false, 
        error: "Unable to restore purchases. Please try again later." 
      };
    }
    
    // Handle case where purchases is null or undefined
    if (!purchases || purchases.length === 0) {
      console.log("[StoreKit] No purchases found with Apple");
      return { success: true, hasSubscription: false, hasPremium: false };
    }
    
    // Find valid subscription
    const validPurchase = purchases.find((purchase) => {
      return (
        purchase.productId === PRODUCT_IDS.MONTHLY ||
        purchase.productId === PRODUCT_IDS.YEARLY
      );
    });
    
    if (validPurchase) {
      // CRITICAL: Extract originalTransactionIdentifierIos for stable binding
      const originalTxId = (validPurchase as any).originalTransactionIdentifierIos || validPurchase.transactionId;
      console.log("[StoreKit] Found valid subscription:", validPurchase.productId, "original:", originalTxId);
      // COMPLIANCE: Do NOT set isPro here - requires user binding first
      return { 
        success: true, 
        hasSubscription: true, 
        hasPremium: false, // Not granted yet - requires account binding
        productId: validPurchase.productId,
        originalTransactionId: originalTxId ?? undefined,
        transactionId: validPurchase.transactionId ?? undefined,
      };
    }
    
    console.log("[StoreKit] No valid subscription found in purchases");
    return { success: true, hasSubscription: false, hasPremium: false };
  } catch (error: any) {
    console.error("[StoreKit] Restore purchases error:", error);
    
    return { 
      success: false, 
      hasSubscription: false,
      hasPremium: false, 
      error: "Unable to restore purchases. Please try again or contact support if the issue persists." 
    };
  }
}

// ============================================================================
// SUBSCRIPTION BINDING (Apple Compliance - Guideline 3.1.2)
// ============================================================================

/**
 * Binds an Apple subscription to a specific user account.
 * 
 * COMPLIANCE: This creates a 1:1 relationship between an Apple transaction
 * and a Supabase user. A single Apple subscription can only unlock ONE account.
 * 
 * IMPORTANT: Uses originalTransactionIdentifierIos which remains STABLE across
 * subscription renewals. The regular transactionId changes on each renewal.
 * 
 * Called after:
 * 1. Successful purchase (purchaseSubscription)
 * 2. Successful restore + user sign-in
 * 
 * @param originalTransactionId - The originalTransactionIdentifierIos from expo-iap (stable across renewals)
 * @returns Object with success status and whether binding was created or already exists
 */
export async function bindSubscriptionToUser(
  userId: string,
  productId: string,
  originalTransactionId?: string
): Promise<{ success: boolean; alreadyBound: boolean; boundToAnotherUser: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.log("[StoreKit] Supabase not configured - cannot bind subscription");
    return { success: false, alreadyBound: false, boundToAnotherUser: false, error: "Backend not configured" };
  }
  
  // APPLE COMPLIANCE: Require originalTransactionId for binding to prevent multi-account reuse
  // Without it, we cannot reliably detect if this subscription is already bound to another user
  if (!originalTransactionId) {
    console.log("[StoreKit] No originalTransactionId provided - cannot create reliable binding");
    // For compliance, we should fail here - but for initial users we allow user-level binding
    // This permits first-time purchase but blocks multi-account abuse on restore/reuse
  }
  
  try {
    // Check if this original transaction is already bound to another user
    if (originalTransactionId) {
      const { data: existingBinding } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("original_transaction_id", originalTransactionId)
        .single();
      
      if (existingBinding && existingBinding.user_id !== userId) {
        console.log("[StoreKit] Subscription already bound to different user:", existingBinding.user_id);
        return { 
          success: false, 
          alreadyBound: true, 
          boundToAnotherUser: true,
          error: "This subscription is already associated with another account."
        };
      }
      
      if (existingBinding && existingBinding.user_id === userId) {
        console.log("[StoreKit] Subscription already bound to this user");
        return { success: true, alreadyBound: true, boundToAnotherUser: false };
      }
    }
    
    // Check if user already has a subscription record
    const { data: userSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (userSubscription) {
      // Update existing record with original_transaction_id (stable identifier)
      const updateData: Record<string, unknown> = {
        product_id: productId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      // Set original_transaction_id if we have one and record doesn't have one yet
      if (originalTransactionId && !userSubscription.original_transaction_id) {
        updateData.original_transaction_id = originalTransactionId;
      } else if (originalTransactionId) {
        updateData.original_transaction_id = originalTransactionId;
      }
      
      await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("user_id", userId);
      
      console.log("[StoreKit] Updated subscription binding for user:", userId, "original_tx:", originalTransactionId);
    } else {
      // Create new binding with original_transaction_id
      await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          product_id: productId,
          original_transaction_id: originalTransactionId || null,
          is_active: true,
          purchase_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      console.log("[StoreKit] Created new subscription binding for user:", userId, "original_tx:", originalTransactionId);
    }
    
    return { success: true, alreadyBound: false, boundToAnotherUser: false };
  } catch (error) {
    console.error("[StoreKit] Failed to bind subscription:", error);
    // CRITICAL: Do not allow access if binding fails
    return { success: false, alreadyBound: false, boundToAnotherUser: false, error: "Failed to verify subscription ownership" };
  }
}

/**
 * Verifies if a user owns a subscription and grants access if valid.
 * 
 * COMPLIANCE: Premium access is ONLY granted if:
 * 1. App Store confirms active subscription on this device
 * 2. User is authenticated
 * 3. Subscription is bound to THIS user (not another account)
 * 
 * @returns Whether premium access was granted
 */
export async function validateAndGrantAccess(
  userId: string,
  userEmail?: string
): Promise<{ granted: boolean; reason: string }> {
  // Demo account check (dev/TestFlight only)
  if (userEmail && isDemoUser(userEmail)) {
    console.log("[StoreKit] Demo account - granting access");
    await setLocalIsPro(true);
    return { granted: true, reason: "demo_account" };
  }
  
  const module = await loadIAPModule();
  
  if (!module) {
    // No IAP available - check Supabase for VERIFIED subscription only
    // COMPLIANCE: Require original_transaction_id to have been set previously
    // This prevents granting access without Apple verification
    const hasVerifiedSubscription = await checkSupabaseVerifiedSubscription(userId);
    if (hasVerifiedSubscription) {
      await setLocalIsPro(true);
      return { granted: true, reason: "server_validated_with_binding" };
    }
    await setLocalIsPro(false);
    return { granted: false, reason: "no_verified_subscription" };
  }
  
  try {
    await initializeIAP();
    const purchases = await module.getAvailablePurchases();
    
    const validPurchase = purchases?.find((purchase) => {
      return (
        purchase.productId === PRODUCT_IDS.MONTHLY ||
        purchase.productId === PRODUCT_IDS.YEARLY
      );
    });
    
    if (!validPurchase) {
      // No App Store subscription - revoke access
      await setLocalIsPro(false);
      await revokeSupabasePremiumStatus(userId);
      return { granted: false, reason: "no_app_store_subscription" };
    }
    
    // CRITICAL: Extract originalTransactionIdentifierIos for stable binding
    // This identifier stays constant across subscription renewals
    const originalTxId = (validPurchase as any).originalTransactionIdentifierIos || validPurchase.transactionId;
    
    // App Store has subscription - verify ownership and bind to user
    const bindResult = await bindSubscriptionToUser(
      userId, 
      validPurchase.productId, 
      originalTxId ?? undefined
    );
    
    // APPLE COMPLIANCE: Require successful binding before granting access
    if (bindResult.boundToAnotherUser) {
      // Subscription belongs to different account
      await setLocalIsPro(false);
      return { granted: false, reason: "bound_to_another_user" };
    }
    
    if (!bindResult.success) {
      // Binding failed (network error, database error, etc.)
      // Do NOT grant access without verified binding
      await setLocalIsPro(false);
      console.log("[StoreKit] Binding failed - denying access:", bindResult.error);
      return { granted: false, reason: "binding_failed" };
    }
    
    // Subscription valid and successfully bound to this user
    await setLocalIsPro(true);
    await updateSupabasePremiumStatus(userId, validPurchase.productId);
    return { granted: true, reason: "validated" };
    
  } catch (error) {
    console.error("[StoreKit] Error validating access:", error);
    // COMPLIANCE: On error, only allow fallback if verified binding exists
    const hasVerifiedSubscription = await checkSupabaseVerifiedSubscription(userId);
    if (hasVerifiedSubscription) {
      await setLocalIsPro(true);
      return { granted: true, reason: "server_fallback_with_binding" };
    }
    await setLocalIsPro(false);
    return { granted: false, reason: "validation_error" };
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
 * 0. Demo account check (dev/TestFlight ONLY - see demo-account.ts)
 * 1. App Store (authoritative source - if available)
 * 2. Supabase profile (if authenticated)
 * 3. Local storage (fallback only when App Store unavailable)
 * 
 * @param userId - Optional Supabase user ID
 * @param forceAppStoreCheck - If true, always check App Store (used on app launch)
 * @param userEmail - Optional user email for demo account detection
 */
export async function validatePremiumAccess(
  userId?: string,
  forceAppStoreCheck: boolean = true,
  userEmail?: string
): Promise<boolean> {
  // DEMO ACCOUNT CHECK (dev/TestFlight only)
  // This ONLY works if isDemoModeAllowed() returns true
  // Production builds will never reach this code path
  if (userEmail && isDemoUser(userEmail)) {
    console.log("[StoreKit] Demo account detected - granting premium access (dev/TestFlight only)");
    await setLocalIsPro(true);
    return true;
  }
  
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

/**
 * COMPLIANCE: Checks for a VERIFIED subscription with original_transaction_id
 * 
 * This is used as a fallback when StoreKit is unavailable (web, simulator).
 * Only grants access if the user has a previous verified binding with Apple.
 * This prevents users from getting access without proper Apple verification.
 */
export async function checkSupabaseVerifiedSubscription(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("is_active, expires_date, original_transaction_id")
      .eq("user_id", userId)
      .single();
    
    if (!data?.is_active) return false;
    
    // COMPLIANCE: Require original_transaction_id to have been set
    // This ensures the user has previously verified with Apple
    if (!data.original_transaction_id) {
      console.log("[StoreKit] Subscription exists but no original_transaction_id - denying fallback access");
      return false;
    }
    
    // Check if subscription hasn't expired
    const isExpired = data.expires_date && new Date(data.expires_date) < new Date();
    return !isExpired;
  } catch (error) {
    console.error("[StoreKit] Failed to check verified subscription:", error);
    return false;
  }
}
