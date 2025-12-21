import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, Linking, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { useUnits } from "@/lib/UnitsContext";
import { useAuth } from "@/lib/AuthContext";
import { useStoreKit } from "@/hooks/useStoreKit";
import { clearAllData } from "@/lib/storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const APPLE_SUBSCRIPTION_URL = "https://apps.apple.com/account/subscriptions";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { settings, updateSettings, setIsPro, isPro } = useUnits();
  const { user, signOut } = useAuth();
  const { restore, purchasing, iapAvailable } = useStoreKit();
  const [restoring, setRestoring] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleHapticsToggle = useCallback(
    (value: boolean) => {
      updateSettings({ hapticsEnabled: value });
    },
    [updateSettings]
  );

  const handleManageSubscription = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL(APPLE_SUBSCRIPTION_URL);
    } else if (Platform.OS === "android") {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    } else {
      Alert.alert("Not Available", "Subscription management is only available on iOS.");
    }
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Restore purchases is only available on iOS.");
      return;
    }

    if (!iapAvailable) {
      Alert.alert(
        "Not Available",
        "Restore purchases requires a development or production build."
      );
      return;
    }

    setRestoring(true);
    try {
      const result = await restore(user?.id);
      
      if (result.success && result.hasPremium) {
        await setIsPro(true);
        Alert.alert("Restored", "Your subscription has been restored successfully.");
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
  }, [iapAvailable, restore, user?.id, setIsPro]);

  const handleCancelMembership = useCallback(() => {
    Alert.alert(
      "Cancel Membership",
      "This will permanently delete your account and all your data. You will then be redirected to Apple's subscription page to cancel your billing.\n\nThis action cannot be undone.",
      [
        { text: "Keep Membership", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              // Step 1: Delete user data from Supabase
              if (user?.id && isSupabaseConfigured) {
                // Delete user's habits
                await supabase.from("habits").delete().eq("user_id", user.id);
                // Delete user's unit logs
                await supabase.from("unit_logs").delete().eq("user_id", user.id);
                // Delete user's bad habits
                await supabase.from("bad_habits").delete().eq("user_id", user.id);
                // Delete user's bad habit logs
                await supabase.from("bad_habit_logs").delete().eq("user_id", user.id);
                // Delete user's profile
                await supabase.from("profiles").delete().eq("id", user.id);
              }

              // Step 2: Clear all local data
              await clearAllData();

              // Step 3: Sign out
              await signOut();

              // Step 4: Redirect to Apple subscription management
              Alert.alert(
                "Account Deleted",
                "Your account has been deleted. You will now be redirected to Apple to cancel your subscription billing.",
                [
                  {
                    text: "Continue",
                    onPress: () => {
                      Linking.openURL(APPLE_SUBSCRIPTION_URL);
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Cancel membership error:", error);
              Alert.alert("Error", "Failed to delete account. Please try again or contact support.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }, [user?.id, signOut]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const handleContactSupport = useCallback(() => {
    Linking.openURL("mailto:support@example.com?subject=Units%20Support");
  }, []);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  }, [signOut]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Account
        </ThemedText>
        <View style={[styles.accountCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.accountInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {user?.email ?? "Not signed in"}
            </ThemedText>
            <ThemedText type="small" style={{ color: isPro ? "#FFD700" : theme.textSecondary }}>
              {isPro ? "Premium Member" : "Free Account"}
            </ThemedText>
          </View>
        </View>
        <SettingsRow
          icon="log-out"
          title="Sign Out"
          onPress={handleSignOut}
          destructive
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Subscription
        </ThemedText>
        <SettingsRow
          icon="refresh-cw"
          title="Restore Purchases"
          subtitle={restoring || purchasing ? "Restoring..." : undefined}
          onPress={restoring || purchasing ? undefined : handleRestorePurchases}
        />
        <SettingsRow
          icon="credit-card"
          title="Manage Subscription"
          subtitle="Opens App Store"
          onPress={handleManageSubscription}
        />
        <SettingsRow
          icon="user-x"
          title="Cancel Membership"
          subtitle={cancelling ? "Deleting..." : "Delete account and data"}
          onPress={cancelling ? undefined : handleCancelMembership}
          destructive
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Preferences
        </ThemedText>
        <SettingsRow
          icon="smartphone"
          title="Haptics"
          toggle
          toggleValue={settings.hapticsEnabled}
          onToggle={handleHapticsToggle}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Legal
        </ThemedText>
        <SettingsRow icon="file-text" title="Terms of Use" onPress={handleTerms} />
        <SettingsRow icon="shield" title="Privacy Policy" onPress={handlePrivacyPolicy} />
        <SettingsRow icon="mail" title="Contact Support" onPress={handleContactSupport} />
      </View>

      <View style={styles.footer}>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
          Units v1.0.0
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accountCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  accountInfo: {
    gap: 4,
  },
  footer: {
    paddingVertical: Spacing["2xl"],
  },
});
