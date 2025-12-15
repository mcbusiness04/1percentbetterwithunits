import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  showLegend?: boolean;
}

function PieSliceView({
  slice,
  startAngle,
  sweepAngle,
  size,
  index,
}: {
  slice: PieSlice;
  startAngle: number;
  sweepAngle: number;
  size: number;
  index: number;
}) {
  const animatedRotation = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  useEffect(() => {
    animatedRotation.value = withDelay(
      index * 100,
      withTiming(1, { duration: 600 })
    );
    animatedOpacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: 400 })
    );
  }, [index, animatedRotation, animatedOpacity]);

  const radius = size / 2;
  const innerRadius = radius * 0.6;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
    transform: [
      { rotate: `${startAngle}deg` },
      { scale: 0.9 + animatedRotation.value * 0.1 },
    ],
  }));

  const createSlicePath = () => {
    if (sweepAngle >= 360) {
      return {
        outer: {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: slice.color,
        },
        inner: {
          position: "absolute" as const,
          width: innerRadius * 2,
          height: innerRadius * 2,
          borderRadius: innerRadius,
          top: radius - innerRadius,
          left: radius - innerRadius,
        },
      };
    }

    const percentage = sweepAngle / 360;
    const clipPath = percentage <= 0.5
      ? `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(sweepAngle * Math.PI / 180)}% ${50 - 50 * Math.cos(sweepAngle * Math.PI / 180)}%)`
      : undefined;

    return {
      width: size,
      height: size,
      position: "absolute" as const,
      backgroundColor: slice.color,
      borderRadius: radius,
    };
  };

  const halfCircleStyle = {
    position: "absolute" as const,
    width: size,
    height: size / 2,
    overflow: "hidden" as const,
  };

  const actualSweep = Math.min(sweepAngle, 180);
  const hasSecondHalf = sweepAngle > 180;

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    >
      <View style={[halfCircleStyle, { top: 0 }]}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: slice.color,
            transform: [{ rotate: `${Math.min(actualSweep, 180)}deg` }],
          }}
        />
      </View>
      {hasSecondHalf ? (
        <View style={[halfCircleStyle, { bottom: 0, transform: [{ rotate: "180deg" }] }]}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: slice.color,
              transform: [{ rotate: `${sweepAngle - 180}deg` }],
            }}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

export function PieChart({ data, size = 180, showLegend = true }: PieChartProps) {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.emptyChart,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          <View
            style={[
              styles.innerCircle,
              {
                width: size * 0.6,
                height: size * 0.6,
                borderRadius: size * 0.3,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            No data
          </ThemedText>
        </View>
      </View>
    );
  }

  let currentAngle = -90;
  const slices = data.map((item) => {
    const sweepAngle = (item.value / total) * 360;
    const slice = {
      ...item,
      startAngle: currentAngle,
      sweepAngle,
    };
    currentAngle += sweepAngle;
    return slice;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        {slices.map((slice, index) => (
          <View
            key={slice.label}
            style={[
              styles.sliceContainer,
              {
                width: size,
                height: size,
                transform: [{ rotate: `${slice.startAngle}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.slice,
                {
                  width: size / 2,
                  height: size,
                  borderTopRightRadius: size / 2,
                  borderBottomRightRadius: size / 2,
                  backgroundColor: slice.color,
                  opacity: slice.sweepAngle > 180 ? 1 : slice.sweepAngle / 180,
                },
              ]}
            />
          </View>
        ))}
        <View
          style={[
            styles.innerCircle,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: size * 0.3,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <ThemedText type="h3">{total}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            total
          </ThemedText>
        </View>
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          {data.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={styles.legendText}>
                <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                  {item.label}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  chartContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  sliceContainer: {
    position: "absolute",
    justifyContent: "center",
  },
  slice: {
    position: "absolute",
    right: 0,
  },
  innerCircle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChart: {
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    marginTop: Spacing.xl,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  legendText: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
