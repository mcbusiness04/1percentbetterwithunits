import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const CONTAINER_PADDING = 4;
const MIN_BLOCK_SIZE = 1;
const MAX_BLOCK_SIZE = 20;

interface BlockData {
  id: string;
  color: string;
  isTimeBlock?: boolean;
}

interface FallingBlocksProps {
  blocks: BlockData[];
  containerWidth?: number;
}

function calculateBlockLayout(count: number, containerWidth: number, containerHeight: number): {
  blockSize: number;
  gap: number;
  columns: number;
  rows: number;
  maxBlocks: number;
  overflow: number;
} {
  if (count === 0) {
    return { blockSize: MAX_BLOCK_SIZE, gap: 1, columns: 1, rows: 0, maxBlocks: 0, overflow: 0 };
  }
  
  const availableWidth = containerWidth - CONTAINER_PADDING * 2;
  const availableHeight = containerHeight - CONTAINER_PADDING * 2;
  
  for (let size = MAX_BLOCK_SIZE; size >= MIN_BLOCK_SIZE; size--) {
    const gap = size > 6 ? 1 : 0;
    const columns = Math.floor(availableWidth / (size + gap));
    if (columns < 1) continue;
    
    const rowsNeeded = Math.ceil(count / columns);
    const requiredHeight = rowsNeeded * (size + gap);
    
    if (requiredHeight <= availableHeight) {
      return { 
        blockSize: size, 
        gap, 
        columns, 
        rows: rowsNeeded, 
        maxBlocks: count, 
        overflow: 0 
      };
    }
  }
  
  const gap = 0;
  const columns = Math.floor(availableWidth / MIN_BLOCK_SIZE);
  const maxRows = Math.floor(availableHeight / MIN_BLOCK_SIZE);
  const maxBlocks = columns * maxRows;
  const overflow = Math.max(0, count - maxBlocks);
  
  return { 
    blockSize: MIN_BLOCK_SIZE, 
    gap, 
    columns, 
    rows: maxRows, 
    maxBlocks, 
    overflow 
  };
}

interface ColorSegment {
  color: string;
  count: number;
  isTimeBlock: boolean;
}

const ColorBar = memo(function ColorBar({ 
  segments, 
  totalUnits,
}: { 
  segments: ColorSegment[];
  totalUnits: number;
}) {
  if (totalUnits === 0) return null;
  
  return (
    <View style={styles.colorBar}>
      {segments.map((segment, i) => {
        const widthPercent = (segment.count / totalUnits) * 100;
        return (
          <View
            key={`${segment.color}-${i}`}
            style={[
              styles.colorSegment,
              {
                width: `${widthPercent}%`,
                backgroundColor: segment.color,
                borderWidth: segment.isTimeBlock ? 1 : 0,
                borderColor: segment.isTimeBlock ? "#FFD700" : undefined,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const GridRow = memo(function GridRow({
  blocks,
  blockSize,
  gap,
}: {
  blocks: { color: string; isTimeBlock: boolean }[];
  blockSize: number;
  gap: number;
}) {
  return (
    <View style={[styles.row, { height: blockSize + gap }]}>
      {blocks.map((block, i) => (
        <View
          key={i}
          style={[
            styles.block,
            {
              width: blockSize,
              height: blockSize,
              marginRight: gap,
              backgroundColor: block.color,
              borderRadius: blockSize > 3 ? Math.max(1, blockSize / 5) : 0,
              borderWidth: block.isTimeBlock && blockSize > 4 ? 1 : 0,
              borderColor: block.isTimeBlock ? "#FFD700" : undefined,
            },
          ]}
        />
      ))}
    </View>
  );
});

export function FallingBlocks({ blocks, containerWidth: propWidth }: FallingBlocksProps) {
  const containerWidth = propWidth || SCREEN_WIDTH - 32;
  const { theme } = useTheme();

  const totalBlocks = blocks.length;

  const { colorCounts, segments } = useMemo(() => {
    const counts = new Map<string, { count: number; isTimeBlock: boolean }>();
    blocks.forEach((block) => {
      const existing = counts.get(block.color);
      if (existing) {
        existing.count++;
      } else {
        counts.set(block.color, { count: 1, isTimeBlock: !!block.isTimeBlock });
      }
    });
    
    const segs: ColorSegment[] = [];
    counts.forEach((data, color) => {
      segs.push({ color, count: data.count, isTimeBlock: data.isTimeBlock });
    });
    
    return { colorCounts: counts, segments: segs };
  }, [blocks]);

  const { blockSize, gap, rows, showColorBar, overflow } = useMemo(() => {
    const MAX_RENDER_BLOCKS = 2000;
    
    if (totalBlocks > MAX_RENDER_BLOCKS) {
      return { blockSize: 0, gap: 0, rows: [], showColorBar: true, overflow: 0 };
    }
    
    const layout = calculateBlockLayout(totalBlocks, containerWidth, PILE_HEIGHT);
    
    const blocksToShow = Math.min(totalBlocks, layout.maxBlocks);
    const displayBlocks = blocks.slice(0, blocksToShow);
    
    const rowsArr: { rowIndex: number; blocks: { color: string; isTimeBlock: boolean }[] }[] = [];
    let currentRow: { color: string; isTimeBlock: boolean }[] = [];
    
    displayBlocks.forEach((block) => {
      currentRow.push({ color: block.color, isTimeBlock: !!block.isTimeBlock });
      
      if (currentRow.length >= layout.columns) {
        rowsArr.push({ rowIndex: rowsArr.length, blocks: currentRow });
        currentRow = [];
      }
    });
    
    if (currentRow.length > 0) {
      rowsArr.push({ rowIndex: rowsArr.length, blocks: currentRow });
    }
    
    return { 
      blockSize: layout.blockSize, 
      gap: layout.gap, 
      rows: rowsArr, 
      showColorBar: false,
      overflow: layout.overflow
    };
  }, [blocks, totalBlocks, containerWidth]);

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
      {showColorBar ? (
        <ColorBar segments={segments} totalUnits={totalBlocks} />
      ) : (
        <View style={styles.gridContainer}>
          {rows.map((row) => (
            <GridRow
              key={row.rowIndex}
              blocks={row.blocks}
              blockSize={blockSize}
              gap={gap}
            />
          ))}
        </View>
      )}
      <View style={styles.badgeContainer}>
        {overflow > 0 ? (
          <View style={styles.overflowBadge}>
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
              +{overflow.toLocaleString()} more
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.totalBadge}>
          <ThemedText type="body" style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>
            {totalBlocks.toLocaleString()}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    flex: 1,
    padding: CONTAINER_PADDING,
    flexDirection: "column",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  block: {},
  colorBar: {
    flexDirection: "row",
    margin: CONTAINER_PADDING,
    height: PILE_HEIGHT - CONTAINER_PADDING * 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  colorSegment: {
    height: "100%",
  },
  badgeContainer: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overflowBadge: {
    backgroundColor: "rgba(255,149,0,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  totalBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
