import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useUnits } from "@/lib/UnitsContext";

const TOAST_DURATION = 5000;

export function UndoToast() {
  const { theme } = useTheme();
  const { undoAction, undoLastAdd, clearUndo, habits } = useUnits();
  const [visible, setVisible] = useState(false);
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (undoAction) {
      setVisible(true);
      translateY.value = withSpring(0, { damping: 15 });
      opacity.value = withSpring(1);

      const timeout = setTimeout(() => {
        hideToast();
      }, TOAST_DURATION);

      return () => clearTimeout(timeout);
    }
  }, [undoAction]);

  const hideToast = () => {
    translateY.value = withTiming(100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setVisible)(false);
      runOnJS(clearUndo)();
    });
  };

  const handleUndo = async () => {
    await undoLastAdd();
    hideToast();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible || !undoAction) return null;

  const habit = habits.find((h) => h.id === undoAction.habitId);
  const habitName = habit?.name || "habit";

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundTertiary },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <ThemedText type="small">
          Added {undoAction.count} unit{undoAction.count > 1 ? "s" : ""} to {habitName}
        </ThemedText>
      </View>
      <Pressable
        onPress={handleUndo}
        style={({ pressed }) => [
          styles.undoButton,
          { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
          Undo
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
  undoButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
});
