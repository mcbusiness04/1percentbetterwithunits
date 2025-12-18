import React, { useMemo, memo, useState, useCallback } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

export const PILE_HEIGHT = 200;
const CONTAINER_PADDING = 8;
const MAX_VISUAL_BLOCKS = 15000;
const MIN_BLOCK_SIZE = 1;
const MAX_BLOCK_SIZE = 50;

interface BlockData {
  id: string;
  color: string;
  isTimeBlock?: boolean;
}

interface FallingBlocksProps {
  blocks: BlockData[];
}

interface GridLayout {
  columns: number;
  rows: number;
  blockSize: number;
  gap: number;
  totalGridWidth: number;
  totalGridHeight: number;
}

function calculateOptimalLayout(
  totalBlocks: number,
  availableWidth: number,
  availableHeight: number
): GridLayout {
  if (totalBlocks === 0 || availableWidth <= 0 || availableHeight <= 0) {
    return { columns: 0, rows: 0, blockSize: 0, gap: 0, totalGridWidth: 0, totalGridHeight: 0 };
  }

  const gapOptions = [2, 1, 0];
  let bestLayout: GridLayout = { 
    columns: 1, 
    rows: totalBlocks, 
    blockSize: MIN_BLOCK_SIZE, 
    gap: 0,
    totalGridWidth: MIN_BLOCK_SIZE,
    totalGridHeight: totalBlocks * MIN_BLOCK_SIZE
  };
  let maxBlockSize = 0;

  for (const gap of gapOptions) {
    let low = MIN_BLOCK_SIZE;
    let high = Math.min(MAX_BLOCK_SIZE, Math.floor(availableWidth), Math.floor(availableHeight));

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const blockSize = mid;

      const effectiveCellWidth = blockSize + gap;
      const cols = Math.max(1, Math.floor((availableWidth + gap) / effectiveCellWidth));
      const rows = Math.ceil(totalBlocks / cols);

      const totalGridWidth = cols * blockSize + Math.max(0, cols - 1) * gap;
      const totalGridHeight = rows * blockSize + Math.max(0, rows - 1) * gap;

      if (totalGridWidth <= availableWidth && totalGridHeight <= availableHeight) {
        if (blockSize > maxBlockSize) {
          maxBlockSize = blockSize;
          bestLayout = { columns: cols, rows, blockSize, gap, totalGridWidth, totalGridHeight };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (maxBlockSize > 0) break;
  }

  if (maxBlockSize === 0) {
    const aspectRatio = availableWidth / availableHeight;
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalBlocks * aspectRatio)));
    const rows = Math.ceil(totalBlocks / cols);
    const blockSizeW = availableWidth / cols;
    const blockSizeH = availableHeight / rows;
    const blockSize = Math.max(MIN_BLOCK_SIZE, Math.floor(Math.min(blockSizeW, blockSizeH)));
    const totalGridWidth = cols * blockSize;
    const totalGridHeight = rows * blockSize;
    bestLayout = { columns: cols, rows, blockSize, gap: 0, totalGridWidth, totalGridHeight };
  }

  return bestLayout;
}

const UnitBlock = memo(function UnitBlock({
  color,
  size,
  isTimeBlock,
}: {
  color: string;
  size: number;
  isTimeBlock: boolean;
}) {
  const borderRadius = size >= 4 ? Math.max(1, Math.min(size * 0.15, 3)) : 0;
  const showGradient = size >= 8;
  
  if (isTimeBlock && size >= 4) {
    const glowInset = Math.max(1, Math.floor(size * 0.15));
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: "#FFD700",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: glowInset,
            left: glowInset,
            right: glowInset,
            bottom: glowInset,
            borderRadius: Math.max(0, borderRadius - glowInset / 2),
            backgroundColor: color,
          }}
        />
        <LinearGradient
          colors={["rgba(255,215,0,0.6)", "rgba(255,200,0,0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: color,
        overflow: "hidden",
      }}
    >
      {showGradient ? (
        <LinearGradient
          colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.1)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
});

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

    const layout = calculateOptimalLayout(totalUnits, containerWidth, containerHeight);
    const { columns, rows, blockSize, gap, totalGridWidth, totalGridHeight } = layout;

    if (blockSize === 0) return null;

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

    return { gridRows, blockSize, gap, totalGridWidth, totalGridHeight };
  }, [blocks, containerWidth, containerHeight]);

  if (!gridData || gridData.gridRows.length === 0) return null;

  const { gridRows, blockSize, gap, totalGridWidth, totalGridHeight } = gridData;

  return (
    <View
      style={{
        width: totalGridWidth,
        height: totalGridHeight,
        flexDirection: "column",
      }}
    >
      {gridRows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{
            flexDirection: "row",
            marginBottom: rowIdx < gridRows.length - 1 ? gap : 0,
          }}
        >
          {row.map((cell, cellIdx) => (
            <View
              key={cellIdx}
              style={{ marginRight: cellIdx < row.length - 1 ? gap : 0 }}
            >
              <UnitBlock
                color={cell.color}
                size={blockSize}
                isTimeBlock={cell.isTimeBlock}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

function OverflowBadge({ extraUnits }: { extraUnits: number }) {
  return (
    <View style={styles.overflowBadge}>
      <LinearGradient
        colors={["#FFD700", "#FFA500"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.badgeGradient}
      >
        <ThemedText style={styles.badgeText}>
          +{extraUnits.toLocaleString()}
        </ThemedText>
      </LinearGradient>
    </View>
  );
}

export function FallingBlocks({ blocks }: FallingBlocksProps) {
  const { theme } = useTheme();
  const totalBlocks = blocks.length;
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const innerWidth = Math.floor(width - CONTAINER_PADDING * 2);
    const innerHeight = Math.floor(height - CONTAINER_PADDING * 2);
    if (innerWidth > 0 && innerHeight > 0) {
      setDimensions({ width: innerWidth, height: innerHeight });
    }
  }, []);

  const visualBlocks = useMemo(() => {
    if (totalBlocks <= MAX_VISUAL_BLOCKS) {
      return blocks;
    }
    return blocks.slice(0, MAX_VISUAL_BLOCKS);
  }, [blocks, totalBlocks]);

  const extraUnits = totalBlocks > MAX_VISUAL_BLOCKS ? totalBlocks - MAX_VISUAL_BLOCKS : 0;

  if (totalBlocks === 0) {
    return (
      <View 
        style={[styles.container, styles.emptyContainer, { backgroundColor: theme.backgroundDefault + "40" }]}
        onLayout={handleLayout}
      >
        <ThemedText type="small" style={{ color: theme.textSecondary, opacity: 0.6 }}>
          Tap habits to add units
        </ThemedText>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, { backgroundColor: theme.backgroundDefault + "30" }]}
      onLayout={handleLayout}
    >
      <View style={styles.innerContainer}>
        {dimensions ? (
          <BlockGrid
            blocks={visualBlocks}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
          />
        ) : null}
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
    borderRadius: 16,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  innerContainer: {
    flex: 1,
    padding: CONTAINER_PADDING,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  overflowBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
