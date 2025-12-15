import React, { useCallback, useMemo } from "react";
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
import { useUnits } from "@/lib/UnitsContext";
import { Habit } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface HabitRowProps {
  habit: Habit;
  onDropBlock?: (color: string) => void;
}

type RootStackParamList = {
  HabitDetail: { habitId: string };
};

export function HabitRow({ habit, onDropBlock }: HabitRowProps) {
  const { theme } = useTheme();
  const { getTodayUnits, addUnits } = useUnits();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const todayCount = getTodayUnits(habit.id);
  const scale = useSharedValue(1);

  const statusColor = useMemo(() => {
    if (todayCount === 0) {
      return "#FF4444";
    } else if (todayCount < habit.dailyGoal) {
      return "#FFB800";
    } else {
      return "#34C759";
    }
  }, [todayCount, habit.dailyGoal]);

  const handleTap = useCallback(async () => {
    const success = await addUnits(habit.id, 1);
    if (success && onDropBlock) {
      onDropBlock(habit.color);
    }
  }, [habit.id, habit.color, addUnits, onDropBlock]);

  const handleNavigate = useCallback(() => {
    navigation.navigate("HabitDetail", { habitId: habit.id });
  }, [navigation, habit.id]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.96, { damping: 15 });
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
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: statusColor + "50",
          borderLeftColor: statusColor,
          borderLeftWidth: 4,
        },
      ]}
    >
      <GestureDetector gesture={tapGesture}>
        <View style={styles.tappableArea}>
          <View style={[styles.iconContainer, { backgroundColor: habit.color + "20" }]}>
            <Feather name={habit.icon as any} size={20} color={habit.color} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="body" style={styles.habitName} numberOfLines={1}>
              {habit.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {habit.unitName}
            </ThemedText>
          </View>
          <View style={styles.countContainer}>
            <ThemedText type="h4" style={{ color: statusColor }}>
              {todayCount}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              /{habit.dailyGoal}
            </ThemedText>
          </View>
        </View>
      </GestureDetector>

      <Pressable
        onPress={handleNavigate}
        style={({ pressed }) => [
          styles.chevronButton,
          { 
            opacity: pressed ? 0.6 : 1,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      >
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    minHeight: 60,
  },
  tappableArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  habitName: {
    fontWeight: "600",
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginRight: Spacing.sm,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
