import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { GoalMeter } from "@/components/GoalMeter";
import { AnimatedBlocks } from "@/components/AnimatedBlocks";
import { useUnits } from "@/lib/UnitsContext";
import { Habit } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HabitRowProps {
  habit: Habit;
}

type RootStackParamList = {
  HabitDetail: { habitId: string };
};

export function HabitRow({ habit }: HabitRowProps) {
  const { theme } = useTheme();
  const { getTodayUnits, addUnits } = useUnits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const todayCount = getTodayUnits(habit.id);
  const scale = useSharedValue(1);

  const handleTap = useCallback(async () => {
    await addUnits(habit.id, 1);
  }, [habit.id, addUnits]);

  const handleNavigate = useCallback(() => {
    navigation.navigate("HabitDetail", { habitId: habit.id });
  }, [navigation, habit.id]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15 });
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15 });
      runOnJS(handleTap)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          {
            backgroundColor: habit.color + "20",
            borderColor: habit.color + "40",
          },
        ]}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: habit.color + "30" }]}>
            <Feather name={habit.icon as any} size={22} color={habit.color} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="body" style={styles.habitName}>
              {habit.name}
            </ThemedText>
            <View style={styles.blocksRow}>
              <AnimatedBlocks count={todayCount} color={habit.color} maxBlocks={8} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                {todayCount} {habit.unitName}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          <GoalMeter
            current={todayCount}
            goal={habit.dailyGoal}
            color={habit.color}
            size="small"
          />
          <Pressable
            onPress={handleNavigate}
            style={({ pressed }) => [
              styles.chevronButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    minHeight: 80,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  habitName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  blocksRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chevronButton: {
    padding: 4,
  },
});
