import { useState, useEffect, useCallback } from "react";
import { Platform, Alert } from "react-native";
import { 
  PRODUCT_IDS, 
  SubscriptionProduct, 
  getFallbackProducts,
  updateSupabasePremiumStatus,
  loadIAPModule,
} from "@/lib/storekit";

type UseStoreKitReturn = {
  products: SubscriptionProduct[];
  loading: boolean;
  purchasing: boolean;
  iapAvailable: boolean;
  purchase: (productId: string, userId?: string) => Promise<{ success: boolean; error?: string }>;
  restore: (userId?: string) => Promise<{ success: boolean; hasPremium: boolean; error?: string }>;
  getProductByType: (type: "monthly" | "yearly") => SubscriptionProduct | undefined;
};

export function useStoreKit(): UseStoreKitReturn {
  const [products, setProducts] = useState<SubscriptionProduct[]>(getFallbackProducts());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [iapAvailable, setIapAvailable] = useState(false);
  const [iapHook, setIapHook] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    async function initIAP() {
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

        if (typeof module.initConnection !== "function") {
          console.log("IAP native module not available (Expo Go)");
          setLoading(false);
          return;
        }

        setIapAvailable(true);

        const connected = await module.initConnection();
        if (!connected || !mounted) {
          setLoading(false);
          return;
        }

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
        }

        cleanup = () => {
          module.endConnection().catch(() => {});
        };
      } catch (error) {
        console.log("IAP initialization error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initIAP();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  const purchase = useCallback(async (
    productId: string, 
    userId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, error: "Purchases are not available on web. Please use the iOS or Android app." };
    }

    const module = await loadIAPModule();
    if (!module) {
      return { success: false, error: "In-app purchases require a development build. This feature is not available in Expo Go." };
    }

    setPurchasing(true);

    try {
      if (typeof module.requestPurchase !== "function") {
        return { 
          success: false, 
          error: "In-app purchases require a development build. Expo Go does not support StoreKit." 
        };
      }
      
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

      if (userId) {
        await updateSupabasePremiumStatus(userId);
      }

      try {
        await module.finishTransaction({ 
          purchase: Array.isArray(purchase) ? purchase[0] : purchase,
          isConsumable: false,
        });
      } catch (finishError) {
        console.error("Failed to finish transaction:", finishError);
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Purchase failed";
      
      if (errorMessage.includes("cancelled") || errorMessage.includes("canceled") || error?.code === "user-cancelled") {
        return { success: false, error: "Purchase was cancelled" };
      }

      console.error("Purchase error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async (
    userId?: string
  ): Promise<{ success: boolean; hasPremium: boolean; error?: string }> => {
    if (Platform.OS === "web") {
      return { success: false, hasPremium: false, error: "Restore is not available on web." };
    }

    const module = await loadIAPModule();
    if (!module) {
      return { success: false, hasPremium: false, error: "Restore requires a development build." };
    }

    setPurchasing(true);

    try {
      const purchases = await module.getAvailablePurchases();
      
      const hasValidSubscription = purchases.some((p) => 
        p.productId === PRODUCT_IDS.MONTHLY || 
        p.productId === PRODUCT_IDS.YEARLY
      );

      if (hasValidSubscription && userId) {
        await updateSupabasePremiumStatus(userId);
      }

      return { success: true, hasPremium: hasValidSubscription };
    } catch (error: any) {
      console.error("Restore purchases error:", error);
      return { 
        success: false, 
        hasPremium: false, 
        error: error?.message || "Failed to restore purchases" 
      };
    } finally {
      setPurchasing(false);
    }
  }, []);

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
