import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, Linking, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useUnits } from "@/lib/UnitsContext";
import { useAuth } from "@/lib/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useStoreKit } from "@/hooks/useStoreKit";
import { PRODUCT_IDS, validatePremiumAccess } from "@/lib/storekit";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenRouteProp = RouteProp<RootStackParamList, "Paywall">;

const FEATURES = [
  { icon: "layers", text: "Unlimited habits" },
  { icon: "trending-up", text: "Track every day, forever" },
  { icon: "bar-chart-2", text: "Deep insights & analytics" },
  { icon: "shield", text: "Stay accountable daily" },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { setIsPro } = useUnits();
  const { user, signOut } = useAuth();
  const { products, purchasing, iapAvailable, purchase, restore, getProductByType } = useStoreKit();
  const reason = route.params?.reason ?? "onboarding";

  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [restoring, setRestoring] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const monthlyProduct = getProductByType("monthly");
  const yearlyProduct = getProductByType("yearly");

  const handleSubscribe = useCallback(async () => {
    const productId = selectedPlan === "annual" ? PRODUCT_IDS.YEARLY : PRODUCT_IDS.MONTHLY;
    
    if (Platform.OS === "web" || !iapAvailable) {
      // Web/dev bypass - set isPro directly
      await setIsPro(true);
      return;
    }

    const result = await purchase(productId, user?.id);
    
    if (result.success) {
      // After successful purchase, validate with server to confirm subscription
      if (user?.id) {
        const isValid = await validatePremiumAccess(user.id);
        if (isValid) {
          await setIsPro(true);
        } else {
          // Purchase succeeded but server validation failed
          // Show error - user should try restore or contact support
          Alert.alert(
            "Verification Issue",
            "Your purchase was successful but we couldn't verify it. Please try 'Restore Purchases' or contact support if the issue persists."
          );
          // Don't set isPro - validation failed
        }
      } else {
        // No user yet, set premium optimistically (will be validated after auth)
        await setIsPro(true);
      }
    } else if (result.error && !result.error.includes("cancelled")) {
      Alert.alert("Purchase Failed", result.error);
    }
  }, [selectedPlan, iapAvailable, purchase, setIsPro, user?.id]);

  const handleRestorePurchases = useCallback(async () => {
    if (Platform.OS === "web" || !iapAvailable) {
      // Web/dev bypass - set isPro directly
      await setIsPro(true);
      return;
    }

    setRestoring(true);
    try {
      const result = await restore(user?.id);
      
      if (result.success && result.hasPremium) {
        // After successful restore, validate with server to confirm subscription
        if (user?.id) {
          const isValid = await validatePremiumAccess(user.id);
          if (isValid) {
            await setIsPro(true);
            Alert.alert("Restored", "Your subscription has been restored successfully.");
          } else {
            // Restore found purchases but server validation failed
            // This could mean subscription expired - don't grant access
            Alert.alert("Subscription Expired", "Your previous subscription has expired. Please subscribe again to continue.");
          }
        } else {
          // No user yet, set premium optimistically (will be validated after auth)
          await setIsPro(true);
          Alert.alert("Restored", "Your subscription has been restored successfully.");
        }
      } else if (result.success && !result.hasPremium) {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases to restore.");
      } else if (result.error) {
        Alert.alert("Restore Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  }, [iapAvailable, restore, setIsPro, user?.id]);

  const handleSignIn = useCallback(() => {
    navigation.navigate("Auth", { fromPaywall: true });
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handlePrivacy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const isSubscriptionRequired = reason === "subscription_required";

  const getSubtitle = () => {
    if (user) {
      return `Signed in as ${user.email}. Subscribe to continue using Units.`;
    }
    if (isSubscriptionRequired) {
      return "Your subscription is required to continue using Units. Please subscribe or restore your purchase.";
    }
    return "Start your journey to better habits with Units";
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      <Animated.View entering={FadeIn} style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isSubscriptionRequired ? theme.warning + "20" : theme.accent + "20" }]}>
          <Feather name={isSubscriptionRequired ? "alert-circle" : "star"} size={48} color={isSubscriptionRequired ? theme.warning : theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          {isSubscriptionRequired ? "Subscription\nRequired" : "Unlock Your\nFull Potential"}
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {getSubtitle()}
        </ThemedText>

        <Animated.View entering={FadeInUp.delay(100)} style={styles.features}>
          {FEATURES.map((feature, index) => (
            <Animated.View key={feature.text} entering={FadeInDown.delay(150 + index * 50)} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: theme.accent + "15" }]}>
                <Feather name={feature.icon as any} size={18} color={theme.accent} />
              </View>
              <ThemedText type="body">{feature.text}</ThemedText>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.plansContainer}>
          <Pressable
            onPress={() => setSelectedPlan("annual")}
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === "annual" ? theme.accent + "15" : theme.backgroundDefault,
                borderColor: selectedPlan === "annual" ? theme.accent : theme.border,
                borderWidth: selectedPlan === "annual" ? 2 : 1,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>
                Annual
              </ThemedText>
              <View style={[styles.bestValueBadge, { backgroundColor: theme.accent }]}>
                <ThemedText type="small" style={{ color: "white", fontWeight: "700", fontSize: 10 }}>
                  BEST VALUE
                </ThemedText>
              </View>
            </View>
            <View style={styles.planPricing}>
              <ThemedText type="h3" style={{ color: selectedPlan === "annual" ? theme.accent : theme.text }}>
                {yearlyProduct?.price || "$19.99"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>/year</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {yearlyProduct ? `Just ${(yearlyProduct.priceValue / 12).toFixed(2)}/month` : "Best value"}
            </ThemedText>
            {selectedPlan === "annual" ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                <Feather name="check" size={14} color="white" />
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setSelectedPlan("monthly")}
            style={[
              styles.planCard,
              {
                backgroundColor: selectedPlan === "monthly" ? theme.accent + "15" : theme.backgroundDefault,
                borderColor: selectedPlan === "monthly" ? theme.accent : theme.border,
                borderWidth: selectedPlan === "monthly" ? 2 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              Monthly
            </ThemedText>
            <View style={styles.planPricing}>
              <ThemedText type="h3" style={{ color: selectedPlan === "monthly" ? theme.accent : theme.text }}>
                {monthlyProduct?.price || "$4.99"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>/month</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Cancel anytime
            </ThemedText>
            {selectedPlan === "monthly" ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.accent }]}>
                <Feather name="check" size={14} color="white" />
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </Animated.View>

      <View style={styles.footer}>
        <Button onPress={handleSubscribe} disabled={purchasing || restoring || signingOut}>
          {purchasing 
            ? "Processing..." 
            : selectedPlan === "annual" 
              ? `Start for ${yearlyProduct?.price || "$19.99"}/year` 
              : `Start for ${monthlyProduct?.price || "$4.99"}/month`}
        </Button>

        <View style={styles.actionRow}>
          <Pressable onPress={handleRestorePurchases} disabled={restoring || purchasing || signingOut}>
            <ThemedText type="body" style={[styles.actionText, { color: restoring ? theme.textSecondary : theme.accent }]}>
              {restoring ? "Restoring..." : "Restore Purchases"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          {user ? (
            <Pressable onPress={handleLogout} disabled={signingOut || purchasing || restoring}>
              <ThemedText type="body" style={[styles.actionText, { color: signingOut ? theme.textSecondary : theme.warning }]}>
                {signingOut ? "Signing Out..." : "Sign Out"}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={handleSignIn} disabled={purchasing || restoring}>
              <ThemedText type="body" style={[styles.actionText, { color: theme.accent }]}>
                Already subscribed? Sign In
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.legalRow}>
          <Pressable onPress={handleTerms}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Terms
            </ThemedText>
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{" | "}</ThemedText>
          <Pressable onPress={handlePrivacy}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Privacy
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" style={[styles.disclaimer, { color: theme.textSecondary }]}>
          Subscription auto-renews. Cancel anytime in App Store settings.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 36,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  features: {
    alignSelf: "stretch",
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  plansContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    alignSelf: "stretch",
  },
  planCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    position: "relative",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bestValueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginBottom: Spacing.xs,
  },
  checkCircle: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionRow: {
    alignItems: "center",
  },
  actionText: {
    fontWeight: "600",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 11,
  },
});
