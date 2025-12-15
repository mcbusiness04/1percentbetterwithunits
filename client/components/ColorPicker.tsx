import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, HabitColors } from "@/constants/theme";

interface ColorPickerProps {
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function ColorPicker({ selectedColor, onSelect }: ColorPickerProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Color
      </ThemedText>
      <View style={styles.colorRow}>
        {HabitColors.map((color) => (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={[
              styles.colorButton,
              {
                backgroundColor: color,
                borderColor: selectedColor === color ? theme.text : "transparent",
              },
            ]}
          >
            {selectedColor === color ? (
              <Feather name="check" size={16} color="white" />
            ) : null}
          </Pressable>
        ))}
      </View>
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
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
});
