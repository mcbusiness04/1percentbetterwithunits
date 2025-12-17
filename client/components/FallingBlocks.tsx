import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const CONTAINER_PADDING = 4;

interface BlockData {
  id: string;
  color: string;
  isTimeBlock?: boolean;
}

interface FallingBlocksProps {
  blocks: BlockData[];
  containerWidth?: number;
}

interface HabitSegment {
  color: string;
  count: number;
  isTimeBlock: boolean;
}

const SegmentedBar = memo(function SegmentedBar({ 
  segments, 
  totalUnits,
  containerHeight,
}: { 
  segments: HabitSegment[];
  totalUnits: number;
  containerHeight: number;
}) {
  if (totalUnits === 0 || segments.length === 0) return null;
  
  return (
    <View style={[styles.segmentedBar, { height: containerHeight }]}>
      {segments.map((segment, i) => {
        const widthPercent = (segment.count / totalUnits) * 100;
        if (widthPercent < 0.1) return null;
        
        return (
          <View
            key={`${segment.color}-${i}`}
            style={[
              styles.segment,
              {
                width: `${widthPercent}%`,
                backgroundColor: segment.color,
                borderWidth: segment.isTimeBlock ? 2 : 0,
                borderColor: segment.isTimeBlock ? "#FFD700" : undefined,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

export function FallingBlocks({ blocks, containerWidth: propWidth }: FallingBlocksProps) {
  const containerWidth = propWidth || SCREEN_WIDTH - 32;
  const { theme } = useTheme();

  const totalBlocks = blocks.length;

  const segments = useMemo(() => {
    const counts = new Map<string, { count: number; isTimeBlock: boolean }>();
    blocks.forEach((block) => {
      const existing = counts.get(block.color);
      if (existing) {
        existing.count++;
      } else {
        counts.set(block.color, { count: 1, isTimeBlock: !!block.isTimeBlock });
      }
    });
    
    const segs: HabitSegment[] = [];
    counts.forEach((data, color) => {
      segs.push({ color, count: data.count, isTimeBlock: data.isTimeBlock });
    });
    
    return segs;
  }, [blocks]);

  if (totalBlocks === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <ThemedText type="small" style={{ color: theme.textSecondary, opacity: 0.6 }}>
          Tap habits to add units
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedBar 
        segments={segments} 
        totalUnits={totalBlocks} 
        containerHeight={PILE_HEIGHT - CONTAINER_PADDING * 2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    padding: CONTAINER_PADDING,
    overflow: "hidden",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedBar: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  segment: {
    height: "100%",
  },
});
