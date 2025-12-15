import React from "react";
import { View, Pressable, StyleSheet, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HabitActionMenuProps {
  visible: boolean;
  habitName: string;
  habitColor: string;
  unitName: string;
  todayCount: number;
  onAdd1: () => void;
  onAdd5: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function HabitActionMenu({
  visible,
  habitName,
  habitColor,
  unitName,
  todayCount,
  onAdd1,
  onAdd5,
  onDelete,
  onClose,
}: HabitActionMenuProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.backdropFill}
        />
      </Pressable>

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(200)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.menuContainer, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.habitIcon, { backgroundColor: habitColor + "30" }]}>
            <View style={[styles.habitDot, { backgroundColor: habitColor }]} />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="h4">{habitName}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {todayCount} {unitName} today
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onAdd1}
            style={({ pressed }) => [
              styles.actionButton,
              styles.addButton,
              { backgroundColor: habitColor, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={22} color="white" />
            <ThemedText type="body" style={styles.actionButtonText}>
              Add 1
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onAdd5}
            style={({ pressed }) => [
              styles.actionButton,
              styles.addButton,
              { backgroundColor: habitColor + "CC", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus-circle" size={22} color="white" />
            <ThemedText type="body" style={styles.actionButtonText}>
              Add 5
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={todayCount === 0}
            style={({ pressed }) => [
              styles.actionButton,
              styles.deleteButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: todayCount === 0 ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name="minus"
              size={22}
              color={todayCount === 0 ? theme.textSecondary : "#FF4444"}
            />
            <ThemedText
              type="body"
              style={[
                styles.deleteButtonText,
                { color: todayCount === 0 ? theme.textSecondary : "#FF4444" },
              ]}
            >
              Remove 1
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancelButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Cancel
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["4xl"],
    paddingTop: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(128,128,128,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  habitDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  headerText: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: 16,
    gap: 8,
  },
  addButton: {},
  deleteButton: {},
  actionButtonText: {
    color: "white",
    fontWeight: "600",
  },
  deleteButtonText: {
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: 16,
  },
});
