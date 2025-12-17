import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 140;
const CONTAINER_PADDING = 12;
const BLOCK_GAP = 3;
const MIN_BLOCK_SIZE = 8;
const MAX_BLOCK_SIZE = 36;
const MAX_VISUAL_BLOCKS = 500;

interface BlockData {
  id: string;
  color: string;
  isTimeBlock?: boolean;
}

interface FallingBlocksProps {
  blocks: BlockData[];
  containerWidth?: number;
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
  const borderRadius = Math.max(2, Math.min(size * 0.25, 8));
  const showDetails = size >= 10;
  
  return (
    <View
      style={[
        styles.block,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: color,
          borderWidth: isTimeBlock ? 1.5 : 0,
          borderColor: isTimeBlock ? "#FFD700" : undefined,
          shadowColor: color,
          shadowOffset: { width: 0, height: size >= 16 ? 2 : 1 },
          shadowOpacity: 0.4,
          shadowRadius: size >= 16 ? 3 : 2,
          elevation: 3,
        },
      ]}
    >
      {showDetails ? (
        <LinearGradient
          colors={["rgba(255,255,255,0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.blockGradient,
            {
              borderRadius: borderRadius - 1,
            },
          ]}
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

    const availableWidth = containerWidth;
    const availableHeight = containerHeight;

    let bestConfig = { columns: 1, rows: totalUnits, blockSize: MIN_BLOCK_SIZE };
    let maxBlockSize = 0;

    for (let cols = 1; cols <= Math.min(totalUnits, 80); cols++) {
      const rows = Math.ceil(totalUnits / cols);
      
      const blockWidth = (availableWidth - (cols - 1) * BLOCK_GAP) / cols;
      const blockHeight = (availableHeight - (rows - 1) * BLOCK_GAP) / rows;
      const blockSize = Math.floor(Math.min(blockWidth, blockHeight));
      
      if (blockSize > maxBlockSize && blockSize >= 2) {
        maxBlockSize = blockSize;
        bestConfig = { columns: cols, rows, blockSize: Math.min(blockSize, MAX_BLOCK_SIZE) };
      }
    }
    
    if (maxBlockSize < 2) {
      const cols = Math.ceil(Math.sqrt(totalUnits * (availableWidth / availableHeight)));
      const rows = Math.ceil(totalUnits / cols);
      const blockWidth = (availableWidth - (cols - 1) * BLOCK_GAP) / cols;
      const blockHeight = (availableHeight - (rows - 1) * BLOCK_GAP) / rows;
      bestConfig = { 
        columns: cols, 
        rows, 
        blockSize: Math.max(2, Math.floor(Math.min(blockWidth, blockHeight)))
      };
    }

    const { columns, rows, blockSize } = bestConfig;
    
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
    
    return { gridRows, blockSize, columns };
  }, [blocks, containerWidth, containerHeight]);

  if (!gridData || gridData.gridRows.length === 0) return null;

  const { gridRows, blockSize } = gridData;

  return (
    <View style={styles.gridWrapper}>
      {gridRows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.gridRow, { gap: BLOCK_GAP }]}>
          {row.map((cell, cellIdx) => (
            <UnitBlock
              key={cellIdx}
              color={cell.color}
              size={blockSize}
              isTimeBlock={cell.isTimeBlock}
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
          +{extraUnits.toLocaleString()} more
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
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: BLOCK_GAP,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  block: {
    position: "relative",
    overflow: "hidden",
  },
  blockGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
