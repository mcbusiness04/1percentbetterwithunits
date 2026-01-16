/**
 * ============================================================================
 * STOREKIT REACT HOOK
 * ============================================================================
 * 
 * React hook for Apple In-App Purchases.
 * Wraps the storekit.ts module functions for use in React components.
 * 
 * USAGE:
 *   const { 
 *     products,        // Array of available subscription products
 *     loading,         // True while fetching products
 *     purchasing,      // True during purchase/restore flow
 *     error,           // Error message if initialization failed
 *     iapAvailable,    // True if Apple IAP is available (false on web/Expo Go)
 *     purchase,        // Function to purchase a product
 *     restore,         // Function to restore previous purchases
 *     getProductByType // Helper to get monthly or yearly product
 *   } = useStoreKit();
 * 
 * PRODUCT IDS:
 *   - 1better.subscription.monthly ($4.99/month)
 *   - 1better.subscription.yearly ($19.99/year)
 * 
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { 
  PRODUCT_IDS, 
  SubscriptionProduct, 
  getFallbackProducts,
  loadIAPModule,
  initializeIAP,
  endIAPConnection,
  purchaseSubscription,
  restorePurchasesFromStore,
  PurchaseResult,
  RestoreResult,
} from "@/lib/storekit";

/**
 * Return type for the useStoreKit hook
 */
type UseStoreKitReturn = {
  /** Array of available subscription products (monthly and yearly) */
  products: SubscriptionProduct[];
  
  /** True while fetching products from App Store on mount */
  loading: boolean;
  
  /** True during an active purchase or restore operation */
  purchasing: boolean;
  
  /** Error message if IAP initialization failed, null otherwise */
  error: string | null;
  
  /** True if Apple IAP is available (false on web, Expo Go, or if native module failed) */
  iapAvailable: boolean;
  
  /** 
   * Initiates a purchase for the given product ID.
   * Triggers Apple's native payment sheet on iOS.
   * @param productId - The product to purchase (PRODUCT_IDS.MONTHLY or PRODUCT_IDS.YEARLY)
   * @param userId - Optional user ID to sync premium status to Supabase
   * @returns Promise with success status and optional error message
   */
  purchase: (productId: string, userId?: string) => Promise<PurchaseResult>;
  
  /**
   * Restores previous purchases from App Store.
   * Required by App Store Review Guidelines.
   * @param userId - Optional user ID to sync premium status to Supabase
   * @returns Promise with success status and whether user has premium
   */
  restore: (userId?: string) => Promise<RestoreResult>;
  
  /**
   * Helper function to get a product by its type.
   * @param type - "monthly" or "yearly"
   * @returns The matching product or undefined
   */
  getProductByType: (type: "monthly" | "yearly") => SubscriptionProduct | undefined;
};

/**
 * React hook for Apple In-App Purchases
 * 
 * Automatically:
 * - Detects if IAP is available (iOS/Android with dev build)
 * - Initializes StoreKit connection on mount
 * - Fetches product info for monthly and yearly subscriptions
 * - Cleans up connection on unmount
 * 
 * Falls back to placeholder product data on web or Expo Go.
 */
export function useStoreKit(): UseStoreKitReturn {
  // State for product data
  const [products, setProducts] = useState<SubscriptionProduct[]>(getFallbackProducts());
  
  // Loading state - true while fetching products
  const [loading, setLoading] = useState(true);
  
  // Purchasing state - true during purchase/restore operations
  const [purchasing, setPurchasing] = useState(false);
  
  // Error state - set if initialization fails
  const [error, setError] = useState<string | null>(null);
  
  // IAP availability - true only if native module loaded successfully
  const [iapAvailable, setIapAvailable] = useState(false);

  /**
   * Initialize IAP on mount
   * - Load expo-iap module (if available)
   * - Connect to StoreKit
   * - Fetch product info for both subscription tiers
   */
  useEffect(() => {
    let mounted = true;

    async function initIAP() {
      // Platform check: IAP only works on iOS/Android
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        console.log("[useStoreKit] Web platform detected, using fallback products");
        setLoading(false);
        return;
      }

      try {
        // Attempt to load the expo-iap native module
        const module = await loadIAPModule();
        
        if (!module) {
          // Module not available (Expo Go or native module missing)
          if (mounted) {
            console.log("[useStoreKit] IAP module not available, using fallback products");
            setLoading(false);
          }
          return;
        }
        
        if (!mounted) return;

        // Verify native module has required functions
        if (typeof module.initConnection !== "function") {
          console.log("[useStoreKit] IAP native module incomplete (Expo Go?)");
          setLoading(false);
          return;
        }

        // Mark IAP as available
        setIapAvailable(true);

        // Initialize StoreKit connection
        const connected = await initializeIAP();
        if (!connected) {
          if (mounted) {
            setError("Failed to connect to App Store");
            setLoading(false);
          }
          return;
        }
        
        if (!mounted) return;

        // Fetch subscription products from App Store Connect
        const skus = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];
        console.log("[useStoreKit] Fetching products:", skus);
        
        const fetchedProducts = await module.fetchProducts({ skus, type: "subs" });
        
        if (mounted && fetchedProducts && fetchedProducts.length > 0) {
          // Map App Store product data to our format
          const mapped: SubscriptionProduct[] = fetchedProducts.map((product) => ({
            productId: product.id,
            title: product.title || (product.id.includes("monthly") ? "Monthly" : "Yearly"),
            description: product.description || "",
            price: product.displayPrice || (product.id.includes("monthly") ? "$4.99" : "$19.99"),
            priceValue: product.price ?? (product.id.includes("monthly") ? 4.99 : 19.99),
            currency: product.currency || "USD",
            type: product.id.includes("monthly") ? "monthly" : "yearly",
          }));
          
          setProducts(mapped);
          console.log("[useStoreKit] Successfully loaded", mapped.length, "products from App Store");
        } else if (mounted) {
          console.log("[useStoreKit] No products returned from App Store, using fallback");
        }
      } catch (err) {
        console.error("[useStoreKit] IAP initialization error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize purchases");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initIAP();

    // Cleanup: end StoreKit connection on unmount
    return () => {
      mounted = false;
      endIAPConnection().catch((err) => {
        console.log("[useStoreKit] Error ending connection:", err);
      });
    };
  }, []);

  /**
   * Purchase a subscription product
   * 
   * Triggers Apple's native payment sheet. Handles:
   * - Platform validation (web not supported)
   * - IAP availability check
   * - Transaction completion
   * - Error handling for cancellations
   * 
   * @param productId - Product to purchase (use PRODUCT_IDS.MONTHLY or PRODUCT_IDS.YEARLY)
   * @param userId - Optional Supabase user ID to sync premium status
   */
  const purchase = useCallback(async (
    productId: string, 
    userId?: string
  ): Promise<PurchaseResult> => {
    // Platform check
    if (Platform.OS === "web") {
      return { 
        success: false, 
        error: "Purchases are not available on web. Please use the iOS app." 
      };
    }

    // IAP availability check
    if (!iapAvailable) {
      return { 
        success: false, 
        error: "In-app purchases require a development build. This feature is not available in Expo Go." 
      };
    }

    // Set purchasing state to show loading UI
    setPurchasing(true);

    try {
      // Delegate to storekit.ts for actual purchase
      const result = await purchaseSubscription(productId, userId);
      
      if (result.success) {
        console.log("[useStoreKit] Purchase successful:", productId);
      } else if (result.error) {
        console.log("[useStoreKit] Purchase failed:", result.error);
      }
      
      return result;
    } catch (err) {
      console.error("[useStoreKit] Unexpected purchase error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Purchase failed unexpectedly"
      };
    } finally {
      setPurchasing(false);
    }
  }, [iapAvailable]);

  /**
   * Restore previous purchases from App Store
   * 
   * APPLE COMPLIANCE (Guideline 3.1.2):
   * This function ONLY checks if a subscription exists with Apple.
   * It does NOT grant premium access - that requires user binding.
   * 
   * After calling this:
   * 1. If hasSubscription=true, prompt user to sign in
   * 2. After sign-in, call validateAndGrantAccess() to verify ownership
   * 3. Only then is premium access granted
   * 
   * Required by App Store Review Guidelines.
   */
  const restore = useCallback(async (): Promise<RestoreResult> => {
    // Platform check
    if (Platform.OS === "web") {
      return { 
        success: false, 
        hasSubscription: false,
        hasPremium: false, 
        error: "Restore is not available on web." 
      };
    }

    // IAP availability check
    if (!iapAvailable) {
      return { 
        success: false, 
        hasSubscription: false,
        hasPremium: false, 
        error: "Restore requires a development build." 
      };
    }

    // Set purchasing state to show loading UI
    setPurchasing(true);

    try {
      // Delegate to storekit.ts - this only checks App Store, does NOT grant access
      const result = await restorePurchasesFromStore();
      
      if (result.success) {
        console.log("[useStoreKit] Restore check completed. Has subscription:", result.hasSubscription);
      } else if (result.error) {
        console.log("[useStoreKit] Restore check failed:", result.error);
      }
      
      return result;
    } catch (err) {
      console.error("[useStoreKit] Unexpected restore error:", err);
      return {
        success: false,
        hasSubscription: false,
        hasPremium: false,
        error: err instanceof Error ? err.message : "Restore failed unexpectedly"
      };
    } finally {
      setPurchasing(false);
    }
  }, [iapAvailable]);

  /**
   * Get a product by its subscription type
   * 
   * @param type - "monthly" or "yearly"
   * @returns The matching SubscriptionProduct or undefined
   */
  const getProductByType = useCallback((type: "monthly" | "yearly"): SubscriptionProduct | undefined => {
    return products.find(p => p.type === type);
  }, [products]);

  return {
    products,
    loading,
    purchasing,
    error,
    iapAvailable,
    purchase,
    restore,
    getProductByType,
  };
}
