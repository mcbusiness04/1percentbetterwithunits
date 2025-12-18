import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, TextInput, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { SettingsRow } from "@/components/SettingsRow";
import { useUnits } from "@/lib/UnitsContext";
import { clearAllData, resetOnboarding } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings, refreshData } = useUnits();
  const [eraseText, setEraseText] = useState("");
  const [showEraseInput, setShowEraseInput] = useState(false);

  const handleHapticsToggle = useCallback(
    (value: boolean) => {
      updateSettings({ hapticsEnabled: value });
    },
    [updateSettings]
  );

  const handleManageSubscription = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    }
  }, []);

  const handleEraseAllData = useCallback(async () => {
    if (eraseText === "ERASE") {
      try {
        await clearAllData();
        await refreshData();
        setShowEraseInput(false);
        setEraseText("");
        Alert.alert("Data Erased", "All your data has been permanently deleted.");
      } catch (error) {
        Alert.alert("Error", "Failed to erase data. Please try again.");
      }
    } else {
      Alert.alert("Incorrect", "Please type ERASE to confirm deletion.");
    }
  }, [eraseText, refreshData]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL("https://example.com/privacy");
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL("https://example.com/terms");
  }, []);

  const handleContactSupport = useCallback(() => {
    Linking.openURL("mailto:support@example.com?subject=Units%20Support");
  }, []);

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
          Subscription
        </ThemedText>
        <SettingsRow
          icon="credit-card"
          title="Manage Subscription"
          onPress={handleManageSubscription}
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
          Data
        </ThemedText>
        {showEraseInput ? (
          <View style={[styles.eraseContainer, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              Type ERASE to confirm deletion
            </ThemedText>
            <TextInput
              value={eraseText}
              onChangeText={setEraseText}
              placeholder="Type ERASE"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              style={[
                styles.eraseInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
            <View style={styles.eraseButtons}>
              <SettingsRow
                icon="x"
                title="Cancel"
                onPress={() => {
                  setShowEraseInput(false);
                  setEraseText("");
                }}
                showChevron={false}
              />
              <SettingsRow
                icon="trash-2"
                title="Confirm Erase"
                onPress={handleEraseAllData}
                destructive
                showChevron={false}
              />
            </View>
          </View>
        ) : (
          <SettingsRow
            icon="trash-2"
            title="Erase All Data"
            onPress={() => setShowEraseInput(true)}
            destructive
          />
        )}
        <SettingsRow
          icon="download"
          title="Export Data"
          subtitle="Export as CSV"
          onPress={() => {
            Alert.alert("Export", "CSV export would be generated here.");
          }}
        />
        <SettingsRow
          icon="cloud"
          title="iCloud Sync"
          subtitle="Coming soon"
          onPress={() => {
            Alert.alert("Coming Soon", "iCloud sync will be available in a future update.");
          }}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Legal
        </ThemedText>
        <SettingsRow icon="shield" title="Privacy Policy" onPress={handlePrivacyPolicy} />
        <SettingsRow icon="file-text" title="Terms of Service" onPress={handleTerms} />
        <SettingsRow icon="mail" title="Contact Support" onPress={handleContactSupport} />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Developer
        </ThemedText>
        <SettingsRow
          icon="refresh-cw"
          title="Reset Onboarding"
          subtitle="View onboarding flow again"
          onPress={async () => {
            await resetOnboarding();
            await refreshData();
            Alert.alert("Reset", "Please restart the app to see the onboarding.");
          }}
        />
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
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  proBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  eraseContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  eraseInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  eraseButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  footer: {
    paddingVertical: Spacing["2xl"],
  },
});
