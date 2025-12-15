import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

interface AnimatedBlocksProps {
  count: number;
  color: string;
  maxBlocks?: number;
}

export function AnimatedBlocks({ count, color, maxBlocks = 10 }: AnimatedBlocksProps) {
  const displayCount = Math.min(count, maxBlocks);
  const hasMore = count > maxBlocks;
  
  const blocks = [];
  for (let i = 0; i < displayCount; i++) {
    blocks.push(
      <Animated.View
        key={i}
        entering={FadeIn.delay(i * 50).springify()}
        style={[
          styles.block,
          {
            backgroundColor: color,
            marginLeft: i > 0 ? -8 : 0,
            zIndex: displayCount - i,
            shadowColor: color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 4,
          },
        ]}
      >
        <View style={styles.blockHighlight} />
        <View style={styles.blockShadow} />
      </Animated.View>
    );
  }

  if (hasMore) {
    blocks.push(
      <View key="more" style={styles.moreIndicator}>
        <View style={[styles.moreDot, { backgroundColor: color }]} />
        <View style={[styles.moreDot, { backgroundColor: color }]} />
        <View style={[styles.moreDot, { backgroundColor: color }]} />
      </View>
    );
  }

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  block: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  blockHighlight: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
  },
  blockShadow: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
  },
  moreIndicator: {
    flexDirection: "row",
    marginLeft: 6,
    gap: 2,
  },
  moreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
