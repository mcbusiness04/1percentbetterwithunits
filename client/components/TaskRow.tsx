import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Task, Habit } from "@/lib/storage";

interface TaskRowProps {
  task: Task;
  linkedHabit?: Habit;
  onComplete: () => void;
  onDelete: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TaskRow({ task, linkedHabit, onComplete, onDelete }: TaskRowProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onComplete}
      onLongPress={onDelete}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={500}
      disabled={task.isCompleted}
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          opacity: task.isCompleted ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onComplete}
        disabled={task.isCompleted}
        style={[
          styles.checkbox,
          {
            borderColor: task.isCompleted ? theme.success : theme.border,
            backgroundColor: task.isCompleted ? theme.success : "transparent",
          },
        ]}
      >
        {task.isCompleted ? (
          <Feather name="check" size={14} color="white" />
        ) : null}
      </Pressable>
      <View style={styles.content}>
        <ThemedText
          type="body"
          style={[
            styles.title,
            task.isCompleted && { textDecorationLine: "line-through", opacity: 0.6 },
          ]}
        >
          {task.title}
        </ThemedText>
        {linkedHabit ? (
          <View style={[styles.tag, { backgroundColor: linkedHabit.color + "20" }]}>
            <ThemedText type="small" style={{ color: linkedHabit.color, fontSize: 11 }}>
              {linkedHabit.name}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.units}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {task.unitEstimate} units
        </ThemedText>
      </View>
    </AnimatedPressable>
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  title: {
    fontWeight: "500",
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  units: {
    marginLeft: Spacing.sm,
  },
});
