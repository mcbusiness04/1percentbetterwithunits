import React from "react";
import { StyleSheet, View, Pressable, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  toggle,
  toggleValue,
  onToggle,
  destructive,
  showChevron = true,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const textColor = destructive ? "#E15B5B" : theme.text;
  const iconColor = destructive ? "#E15B5B" : theme.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={toggle}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "15" }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <ThemedText type="body" style={{ color: textColor }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.accent }}
        />
      ) : showChevron ? (
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    minHeight: 56,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
});
