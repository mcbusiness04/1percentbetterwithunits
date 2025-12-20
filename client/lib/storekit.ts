import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase, isSupabaseConfigured } from "./supabase";

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

let iapModule: typeof import("expo-iap") | null = null;
let isIAPAvailable = false;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export async function loadIAPModule(): Promise<typeof import("expo-iap") | null> {
  if (iapModule !== null) return iapModule;
  
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    console.log("IAP not available on web platform");
    return null;
  }
  
  if (isExpoGo()) {
    console.log("IAP not available in Expo Go - requires development build");
    return null;
  }
  
  try {
    const module = await import("expo-iap");
    iapModule = module;
    isIAPAvailable = true;
    return module;
  } catch (error) {
    console.log("IAP module not available (requires development build):", error);
    isIAPAvailable = false;
    return null;
  }
}

export async function initializeIAP(): Promise<boolean> {
  const module = await loadIAPModule();
  if (!module) return false;
  
  try {
    const result = await module.initConnection();
    console.log("IAP connection initialized:", result);
    return true;
  } catch (error) {
    console.error("Failed to initialize IAP connection:", error);
    return false;
  }
}

export async function endIAPConnection(): Promise<void> {
  const module = await loadIAPModule();
  if (!module) return;
  
  try {
    await module.endConnection();
  } catch (error) {
    console.error("Failed to end IAP connection:", error);
  }
}

export async function getSubscriptionProducts(): Promise<SubscriptionProduct[]> {
  const module = await loadIAPModule();
  if (!module) {
    return getFallbackProducts();
  }
  
  try {
    const skus = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY];
    const products = await module.fetchProducts({ skus, type: "subs" });
    
    if (!products || products.length === 0) {
      console.log("No products found from StoreKit, using fallback");
      return getFallbackProducts();
    }
    
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
    console.error("Failed to fetch subscription products:", error);
    return getFallbackProducts();
  }
}

function getFallbackProducts(): SubscriptionProduct[] {
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

export async function updateSupabasePremiumStatus(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  
  try {
    await supabase
      .from("profiles")
      .update({ 
        is_premium: true, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", userId);
  } catch (error) {
    console.error("Failed to update premium status in Supabase:", error);
  }
}

export async function restorePurchasesFromStore(
  userId?: string
): Promise<{ success: boolean; hasPremium: boolean; error?: string }> {
  const module = await loadIAPModule();
  
  if (!module) {
    if (Platform.OS === "web") {
      return { success: false, hasPremium: false, error: "Restore is not available on web." };
    }
    return { success: false, hasPremium: false, error: "Restore requires a development build." };
  }
  
  try {
    const purchases = await module.getAvailablePurchases();
    
    const hasValidSubscription = purchases.some((purchase) => {
      return (
        purchase.productId === PRODUCT_IDS.MONTHLY ||
        purchase.productId === PRODUCT_IDS.YEARLY
      );
    });
    
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
  }
}

export function isIAPSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export function getIAPAvailability(): boolean {
  return isIAPAvailable;
}

export { getFallbackProducts };
