import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SoftFloorStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function SoftFloorStepper({
  value,
  onChange,
  min = 0,
  max = 30,
}: SoftFloorStepperProps) {
  const { theme } = useTheme();

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Soft floor (minimum healthy pace per week)
      </ThemedText>
      <View style={styles.row}>
        <Pressable
          onPress={handleDecrement}
          disabled={value <= min}
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: value <= min ? 0.5 : 1,
            },
          ]}
        >
          <Feather name="minus" size={20} color={theme.text} />
        </Pressable>
        <View style={[styles.valueContainer, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4">{value}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            units/week
          </ThemedText>
        </View>
        <Pressable
          onPress={handleIncrement}
          disabled={value >= max}
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: value >= max ? 0.5 : 1,
            },
          ]}
        >
          <Feather name="plus" size={20} color={theme.text} />
        </Pressable>
      </View>
      <ThemedText type="small" style={[styles.helper, { color: theme.textSecondary }]}>
        Yellow when under pace. No streaks.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  helper: {
    marginTop: Spacing.sm,
    fontStyle: "italic",
    opacity: 0.7,
  },
});
