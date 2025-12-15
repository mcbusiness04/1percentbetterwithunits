import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  blurred?: boolean;
}

export function StatCard({ title, value, subtitle, color, blurred }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {title}
      </ThemedText>
      <ThemedText
        type="h2"
        style={[
          styles.value,
          { color: color || theme.text },
          blurred && styles.blurred,
        ]}
      >
        {blurred ? "---" : value}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {subtitle}
        </ThemedText>
      ) : null}
      {blurred ? (
        <ThemedText type="small" style={{ color: theme.accent, marginTop: Spacing.xs }}>
          Unlock with Pro
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  value: {
    marginVertical: Spacing.xs,
  },
  blurred: {
    opacity: 0.3,
  },
});
