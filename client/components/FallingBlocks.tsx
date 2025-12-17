import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import { useEffect } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const CONTAINER_PADDING = 8;
const MAX_VISUAL_BLOCKS = 15000;

interface BlockData {
  id: string;
  color: string;
  isTimeBlock?: boolean;
}

interface FallingBlocksProps {
  blocks: BlockData[];
  containerWidth?: number;
}

const BlockGrid = memo(function BlockGrid({
  blocks,
  containerWidth,
  containerHeight,
}: {
  blocks: BlockData[];
  containerWidth: number;
  containerHeight: number;
}) {
  const gridData = useMemo(() => {
    const totalUnits = blocks.length;
    if (totalUnits === 0) return null;

    // Calculate optimal grid to fill container completely
    const aspectRatio = containerWidth / containerHeight;
    
    // Calculate columns and rows to fill space
    let columns = Math.ceil(Math.sqrt(totalUnits * aspectRatio));
    let rows = Math.ceil(totalUnits / columns);
    
    // Recalculate to minimize empty cells
    while (columns * (rows - 1) >= totalUnits && rows > 1) {
      rows--;
    }
    while ((columns - 1) * rows >= totalUnits && columns > 1) {
      columns--;
    }
    
    // Calculate block dimensions to fill container exactly
    const blockWidth = containerWidth / columns;
    const blockHeight = containerHeight / rows;
    
    // Use smaller dimension for square blocks, or stretch to fill
    const blockSize = Math.min(blockWidth, blockHeight);
    
    // For very large counts, use the calculated dimensions directly
    const finalBlockWidth = Math.max(1, Math.floor(blockWidth));
    const finalBlockHeight = Math.max(1, Math.floor(blockHeight));
    
    // Build grid rows
    const gridRows: { color: string; isTimeBlock: boolean }[][] = [];
    let blockIndex = 0;
    
    for (let r = 0; r < rows && blockIndex < totalUnits; r++) {
      const row: { color: string; isTimeBlock: boolean }[] = [];
      for (let c = 0; c < columns && blockIndex < totalUnits; c++) {
        const block = blocks[blockIndex];
        row.push({ color: block.color, isTimeBlock: !!block.isTimeBlock });
        blockIndex++;
      }
      gridRows.push(row);
    }
    
    return { gridRows, blockWidth: finalBlockWidth, blockHeight: finalBlockHeight, columns };
  }, [blocks, containerWidth, containerHeight]);

  if (!gridData || gridData.gridRows.length === 0) return null;

  const { gridRows, blockWidth, blockHeight } = gridData;
  const borderRadius = Math.min(blockWidth, blockHeight) >= 3 ? 1 : 0;

  return (
    <View style={styles.gridWrapper}>
      {gridRows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((cell, cellIdx) => (
            <View
              key={cellIdx}
              style={{
                width: blockWidth,
                height: blockHeight,
                backgroundColor: cell.color,
                borderRadius: borderRadius,
                borderWidth: cell.isTimeBlock && blockWidth >= 4 ? 1 : 0,
                borderColor: cell.isTimeBlock ? "#FFD700" : undefined,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

function OverflowBadge({ extraUnits }: { extraUnits: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.85, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.overflowBadge, animatedStyle]}>
      <LinearGradient
        colors={["#FFD700", "#FFA500", "#FF8C00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badgeGradient}
      >
        <Feather name="alert-circle" size={14} color="#FFF" style={styles.badgeIcon} />
        <ThemedText style={styles.badgeText}>
          +{extraUnits.toLocaleString()}
        </ThemedText>
      </LinearGradient>
    </Animated.View>
  );
}

export function FallingBlocks({ blocks, containerWidth: propWidth }: FallingBlocksProps) {
  const containerWidth = propWidth || SCREEN_WIDTH - 32;
  const { theme } = useTheme();
  const totalBlocks = blocks.length;

  const innerWidth = containerWidth - CONTAINER_PADDING * 2;
  const innerHeight = PILE_HEIGHT - CONTAINER_PADDING * 2;

  const visualBlocks = useMemo(() => {
    if (totalBlocks <= MAX_VISUAL_BLOCKS) {
      return blocks;
    }
    
    // Sample blocks proportionally from all habits to represent the distribution
    const sampleRatio = MAX_VISUAL_BLOCKS / totalBlocks;
    
    // Count blocks per color to maintain proportions
    const colorGroups: Record<string, BlockData[]> = {};
    blocks.forEach((block) => {
      if (!colorGroups[block.color]) {
        colorGroups[block.color] = [];
      }
      colorGroups[block.color].push(block);
    });
    
    // Sample proportionally from each color and interleave
    const sampled: BlockData[] = [];
    const colors = Object.keys(colorGroups);
    const targetCounts = colors.map(c => Math.max(1, Math.round(colorGroups[c].length * sampleRatio)));
    const indices = colors.map(() => 0);
    
    // Interleave colors for better visual distribution
    let added = 0;
    while (added < MAX_VISUAL_BLOCKS) {
      let addedThisRound = false;
      for (let i = 0; i < colors.length && added < MAX_VISUAL_BLOCKS; i++) {
        const color = colors[i];
        if (indices[i] < targetCounts[i] && indices[i] < colorGroups[color].length) {
          sampled.push(colorGroups[color][indices[i]]);
          indices[i]++;
          added++;
          addedThisRound = true;
        }
      }
      if (!addedThisRound) break;
    }
    
    return sampled;
  }, [blocks, totalBlocks]);

  const extraUnits = totalBlocks > MAX_VISUAL_BLOCKS ? totalBlocks - MAX_VISUAL_BLOCKS : 0;

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
      <View style={styles.innerContainer}>
        <BlockGrid
          blocks={visualBlocks}
          containerWidth={innerWidth}
          containerHeight={innerHeight}
        />
      </View>
      {extraUnits > 0 ? <OverflowBadge extraUnits={extraUnits} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  innerContainer: {
    flex: 1,
    margin: CONTAINER_PADDING,
    overflow: "hidden",
  },
  gridWrapper: {
    flex: 1,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  gridRow: {
    flexDirection: "row",
  },
  overflowBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeIcon: {
    marginRight: 2,
  },
  badgeText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
