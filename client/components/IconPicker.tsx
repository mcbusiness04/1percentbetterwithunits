import React from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, HABIT_ICONS } from "@/constants/theme";

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
  color: string;
}

export function IconPicker({ selectedIcon, onSelect, color }: IconPickerProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Icon
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {HABIT_ICONS.map((icon) => (
          <Pressable
            key={icon}
            onPress={() => onSelect(icon)}
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  selectedIcon === icon ? color + "20" : theme.backgroundDefault,
                borderColor: selectedIcon === icon ? color : theme.border,
              },
            ]}
          >
            <Feather
              name={icon as any}
              size={20}
              color={selectedIcon === icon ? color : theme.textSecondary}
            />
          </Pressable>
        ))}
      </ScrollView>
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
  scrollContent: {
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
