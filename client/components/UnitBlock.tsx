import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { BorderRadius } from "@/constants/theme";

interface UnitBlockProps {
  color: string;
  size?: number;
  delay?: number;
  bundle?: number;
}

const springConfig: WithSpringConfig = {
  damping: 12,
  mass: 0.5,
  stiffness: 120,
};

export function UnitBlock({ color, size = 16, delay = 0, bundle }: UnitBlockProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      translateY.value = withSpring(0, springConfig);
      opacity.value = withSpring(1, springConfig);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width: size,
          height: size * 0.7,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    >
      {bundle && bundle > 1 ? (
        <View style={styles.bundleIndicator}>
          <Animated.Text style={styles.bundleText}>{bundle}</Animated.Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: BorderRadius.xs / 2,
    margin: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bundleIndicator: {
    position: "absolute",
  },
  bundleText: {
    fontSize: 8,
    color: "white",
    fontWeight: "600",
  },
});
