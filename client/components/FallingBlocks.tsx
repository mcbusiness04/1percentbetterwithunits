import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 200;
const CONTAINER_PADDING = 6;
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

function calculateGridLayout(
  totalBlocks: number,
  availableWidth: number,
  availableHeight: number
): { columns: number; rows: number; blockSize: number; gap: number } {
  if (totalBlocks === 0) {
    return { columns: 0, rows: 0, blockSize: 0, gap: 0 };
  }

  let bestConfig = { columns: 1, rows: totalBlocks, blockSize: 1, gap: 0 };
  let maxBlockSize = 0;

  const gapOptions = [2, 1, 0];

  for (const gap of gapOptions) {
    for (let cols = 1; cols <= Math.min(totalBlocks, 500); cols++) {
      const rows = Math.ceil(totalBlocks / cols);
      
      const totalGapWidth = (cols - 1) * gap;
      const totalGapHeight = (rows - 1) * gap;
      
      const blockWidth = (availableWidth - totalGapWidth) / cols;
      const blockHeight = (availableHeight - totalGapHeight) / rows;
      const blockSize = Math.floor(Math.min(blockWidth, blockHeight));
      
      if (blockSize >= 1) {
        const actualTotalHeight = rows * blockSize + (rows - 1) * gap;
        const actualTotalWidth = cols * blockSize + (cols - 1) * gap;
        
        if (actualTotalHeight <= availableHeight && actualTotalWidth <= availableWidth) {
          if (blockSize > maxBlockSize) {
            maxBlockSize = blockSize;
            bestConfig = { columns: cols, rows, blockSize, gap };
          }
        }
      }
    }
    
    if (maxBlockSize >= 1) break;
  }

  if (maxBlockSize < 1) {
    const aspectRatio = availableWidth / availableHeight;
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalBlocks * aspectRatio)));
    const rows = Math.ceil(totalBlocks / cols);
    const blockWidth = availableWidth / cols;
    const blockHeight = availableHeight / rows;
    bestConfig = { 
      columns: cols, 
      rows, 
      blockSize: Math.max(1, Math.floor(Math.min(blockWidth, blockHeight))), 
      gap: 0 
    };
  }

  return bestConfig;
}

const UnitBlock = memo(function UnitBlock({
  color,
  size,
  isTimeBlock,
  showEffects,
}: {
  color: string;
  size: number;
  isTimeBlock: boolean;
  showEffects: boolean;
}) {
  const borderRadius = size >= 3 ? Math.max(1, Math.min(size * 0.2, 4)) : 0;
  
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: color,
        borderWidth: isTimeBlock && size >= 3 ? 0.5 : 0,
        borderColor: isTimeBlock ? "#FFD700" : undefined,
      }}
    >
      {showEffects ? (
        <LinearGradient
          colors={["rgba(255,255,255,0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: borderRadius > 0 ? borderRadius - 1 : 0,
          }}
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

    const layout = calculateGridLayout(totalUnits, containerWidth, containerHeight);
    const { columns, rows, blockSize, gap } = layout;
    
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
    
    const showEffects = blockSize >= 6;
    const actualGridHeight = rows * blockSize + (rows - 1) * gap;
    const actualGridWidth = columns * blockSize + (columns - 1) * gap;
    
    return { gridRows, blockSize, gap, showEffects, actualGridHeight, actualGridWidth };
  }, [blocks, containerWidth, containerHeight]);

  if (!gridData || gridData.gridRows.length === 0) return null;

  const { gridRows, blockSize, gap, showEffects, actualGridHeight, actualGridWidth } = gridData;

  return (
    <View style={[
      styles.gridWrapper, 
      { 
        height: actualGridHeight,
        width: actualGridWidth,
      }
    ]}>
      {gridRows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.gridRow, { gap }]}>
          {row.map((cell, cellIdx) => (
            <UnitBlock
              key={cellIdx}
              color={cell.color}
              size={blockSize}
              isTimeBlock={cell.isTimeBlock}
              showEffects={showEffects}
            />
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
    return blocks.slice(0, MAX_VISUAL_BLOCKS);
  }, [blocks, totalBlocks]);

  const extraUnits = totalBlocks > MAX_VISUAL_BLOCKS ? totalBlocks - MAX_VISUAL_BLOCKS : 0;

  if (totalBlocks === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: theme.backgroundDefault + "40" }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary, opacity: 0.6 }}>
          Tap habits to add units
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault + "30" }]}>
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
  gridWrapper: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
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
