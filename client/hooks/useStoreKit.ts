/**
 * ============================================================================
 * STOREKIT REACT HOOK
 * ============================================================================
 * 
 * React hook for Apple In-App Purchases.
 * Wraps the storekit.ts module functions for use in React components.
 * 
 * Usage:
 *   const { products, purchase, restore, iapAvailable } = useStoreKit();
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

type UseStoreKitReturn = {
  products: SubscriptionProduct[];
  loading: boolean;
  purchasing: boolean;
  iapAvailable: boolean;
  purchase: (productId: string, userId?: string) => Promise<PurchaseResult>;
  restore: (userId?: string) => Promise<RestoreResult>;
  getProductByType: (type: "monthly" | "yearly") => SubscriptionProduct | undefined;
};

export function useStoreKit(): UseStoreKitReturn {
  const [products, setProducts] = useState<SubscriptionProduct[]>(getFallbackProducts());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [iapAvailable, setIapAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initIAP() {
      // Skip on web
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        setLoading(false);
        return;
      }

      try {
        const module = await loadIAPModule();
        if (!module || !mounted) {
          setLoading(false);
          return;
        }

        // Check if module functions are available
        if (typeof module.initConnection !== "function") {
          console.log("[useStoreKit] IAP native module not available (Expo Go)");
          setLoading(false);
          return;
        }

        setIapAvailable(true);

        // Initialize connection
        const connected = await initializeIAP();
        if (!connected || !mounted) {
          setLoading(false);
          return;
        }

        // Fetch products from App Store
        const skus = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];
        const fetchedProducts = await module.fetchProducts({ skus, type: "subs" });
        
        if (mounted && fetchedProducts && fetchedProducts.length > 0) {
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
          console.log("[useStoreKit] Loaded", mapped.length, "products from App Store");
        }
      } catch (error) {
        console.log("[useStoreKit] IAP initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initIAP();

    return () => {
      mounted = false;
      // Clean up IAP connection on unmount
      endIAPConnection().catch(() => {});
    };
  }, []);

  /**
   * Purchase a subscription product
   */
  const purchase = useCallback(async (
    productId: string, 
    userId?: string
  ): Promise<PurchaseResult> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Purchases are not available on web. Please use the iOS app." };
    }

    if (!iapAvailable) {
      return { 
        success: false, 
        error: "In-app purchases require a development build. This feature is not available in Expo Go." 
      };
    }

    setPurchasing(true);

    try {
      const result = await purchaseSubscription(productId, userId);
      return result;
    } finally {
      setPurchasing(false);
    }
  }, [iapAvailable]);

  /**
   * Restore previous purchases (required by App Store)
   */
  const restore = useCallback(async (
    userId?: string
  ): Promise<RestoreResult> => {
    if (Platform.OS === "web") {
      return { success: false, hasPremium: false, error: "Restore is not available on web." };
    }

    if (!iapAvailable) {
      return { success: false, hasPremium: false, error: "Restore requires a development build." };
    }

    setPurchasing(true);

    try {
      const result = await restorePurchasesFromStore(userId);
      return result;
    } finally {
      setPurchasing(false);
    }
  }, [iapAvailable]);

  /**
   * Get a product by type (monthly or yearly)
   */
  const getProductByType = useCallback((type: "monthly" | "yearly"): SubscriptionProduct | undefined => {
    return products.find(p => p.type === type);
  }, [products]);

  return {
    products,
    loading,
    purchasing,
    iapAvailable,
    purchase,
    restore,
    getProductByType,
  };
}
