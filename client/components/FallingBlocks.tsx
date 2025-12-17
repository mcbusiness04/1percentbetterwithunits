import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

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

    const availableWidth = containerWidth;
    const availableHeight = containerHeight;
    const totalArea = availableWidth * availableHeight;
    
    let areaPerUnit = totalArea / totalUnits;
    let blockSize = Math.floor(Math.sqrt(areaPerUnit));
    
    blockSize = Math.max(1, Math.min(blockSize, 20));
    
    let gap = blockSize >= 6 ? 1 : 0;
    let effectiveSize = blockSize + gap;
    
    let columns = Math.max(1, Math.floor(availableWidth / effectiveSize));
    let rows = Math.max(1, Math.floor(availableHeight / effectiveSize));
    let capacity = columns * rows;
    
    while (capacity < totalUnits && blockSize > 1) {
      blockSize--;
      gap = blockSize >= 6 ? 1 : 0;
      effectiveSize = blockSize + gap;
      columns = Math.max(1, Math.floor(availableWidth / effectiveSize));
      rows = Math.max(1, Math.floor(availableHeight / effectiveSize));
      capacity = columns * rows;
    }
    
    if (capacity < totalUnits) {
      columns = Math.max(1, Math.floor(availableWidth / 1));
      rows = Math.max(1, Math.floor(availableHeight / 1));
      capacity = columns * rows;
      blockSize = 1;
      gap = 0;
    }
    
    const displayBlocks = blocks.slice(0, capacity);
    
    const gridRows: { color: string; isTimeBlock: boolean }[][] = [];
    let currentRow: { color: string; isTimeBlock: boolean }[] = [];
    
    displayBlocks.forEach((block) => {
      currentRow.push({ color: block.color, isTimeBlock: !!block.isTimeBlock });
      if (currentRow.length >= columns) {
        gridRows.push(currentRow);
        currentRow = [];
      }
    });
    if (currentRow.length > 0) {
      gridRows.push(currentRow);
    }
    
    return { gridRows, blockSize, gap, columns };
  }, [blocks, containerWidth, containerHeight]);

  if (!gridData || gridData.gridRows.length === 0) return null;

  const { gridRows, blockSize, gap } = gridData;
  const borderRadius = blockSize >= 3 ? Math.max(1, Math.floor(blockSize / 4)) : 0;

  return (
    <View style={styles.gridWrapper}>
      {gridRows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((cell, cellIdx) => (
            <View
              key={cellIdx}
              style={{
                width: blockSize,
                height: blockSize,
                backgroundColor: cell.color,
                borderRadius: borderRadius,
                marginRight: gap,
                marginBottom: gap,
                borderWidth: cell.isTimeBlock && blockSize >= 4 ? 1 : 0,
                borderColor: cell.isTimeBlock ? "#FFD700" : undefined,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

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
    const sampled: BlockData[] = [];
    
    // Count blocks per color to maintain proportions
    const colorCounts: Record<string, { blocks: BlockData[]; count: number }> = {};
    blocks.forEach((block) => {
      if (!colorCounts[block.color]) {
        colorCounts[block.color] = { blocks: [], count: 0 };
      }
      colorCounts[block.color].blocks.push(block);
      colorCounts[block.color].count++;
    });
    
    // Sample proportionally from each color
    Object.values(colorCounts).forEach(({ blocks: colorBlocks, count }) => {
      const sampleCount = Math.max(1, Math.round(count * sampleRatio));
      for (let i = 0; i < sampleCount && i < colorBlocks.length; i++) {
        sampled.push(colorBlocks[i]);
      }
    });
    
    return sampled.slice(0, MAX_VISUAL_BLOCKS);
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
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <View style={styles.innerContainer}>
          <BlockGrid
            blocks={visualBlocks}
            containerWidth={innerWidth}
            containerHeight={innerHeight}
          />
        </View>
      </View>
      {extraUnits > 0 ? (
        <View style={styles.extraUnitsContainer}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            +{extraUnits.toLocaleString()} units
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: "100%",
  },
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    overflow: "hidden",
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
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  gridRow: {
    flexDirection: "row",
  },
  extraUnitsContainer: {
    alignItems: "center",
    paddingVertical: 4,
  },
});
