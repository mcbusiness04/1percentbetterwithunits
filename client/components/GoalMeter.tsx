import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

interface GoalMeterProps {
  current: number;
  goal: number;
  color: string;
  size?: "small" | "large";
}

export function GoalMeter({ current, goal, color, size = "small" }: GoalMeterProps) {
  const progress = goal > 0 ? Math.min(current / goal, 1.5) : 0;
  const isGoalMet = current >= goal && goal > 0;
  const isSurpassed = current > goal && goal > 0;
  
  const glowOpacity = useSharedValue(0.4);
  const scaleValue = useSharedValue(1);

  useEffect(() => {
    if (isGoalMet) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
      scaleValue.value = withSpring(1.05, { damping: 15 });
    } else {
      glowOpacity.value = withTiming(0.4, { duration: 300 });
      scaleValue.value = withSpring(1, { damping: 15 });
    }
  }, [isGoalMet, glowOpacity, scaleValue]);

  const containerSize = size === "large" ? 64 : 40;
  const strokeWidth = size === "large" ? 6 : 4;

  const progressStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const meterColor = isSurpassed ? "#FFD700" : isGoalMet ? "#FFD700" : "#FF4444";
  const fillPercent = Math.min(progress, 1);

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {isGoalMet ? (
        <Animated.View
          style={[
            styles.glow,
            glowStyle,
            {
              backgroundColor: "#FFD700",
              width: containerSize + 12,
              height: containerSize + 12,
              borderRadius: (containerSize + 12) / 2,
            },
          ]}
        />
      ) : null}
      <Animated.View style={[styles.meterContainer, progressStyle]}>
        <View
          style={[
            styles.backgroundCircle,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              borderWidth: strokeWidth,
              borderColor: "rgba(255,255,255,0.15)",
            },
          ]}
        />
        <View
          style={[
            styles.progressCircle,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              borderWidth: strokeWidth,
              borderColor: meterColor,
              borderTopColor: fillPercent > 0.25 ? meterColor : "transparent",
              borderRightColor: fillPercent > 0.5 ? meterColor : "transparent",
              borderBottomColor: fillPercent > 0.75 ? meterColor : "transparent",
              borderLeftColor: fillPercent > 0 ? meterColor : "transparent",
              transform: [{ rotate: "-90deg" }],
            },
          ]}
        />
        <View
          style={[
            styles.innerCircle,
            {
              width: containerSize - strokeWidth * 2 - 4,
              height: containerSize - strokeWidth * 2 - 4,
              borderRadius: (containerSize - strokeWidth * 2 - 4) / 2,
              backgroundColor: isSurpassed ? "rgba(255,215,0,0.2)" : "transparent",
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
  },
  meterContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundCircle: {
    position: "absolute",
  },
  progressCircle: {
    position: "absolute",
  },
  innerCircle: {
    position: "absolute",
  },
});
