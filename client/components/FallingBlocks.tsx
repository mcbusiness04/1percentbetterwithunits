import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const CONTAINER_PADDING = 4;
const MIN_BLOCK_SIZE = 2;
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

function calculateOptimalBlockSize(count: number, containerWidth: number, containerHeight: number): number {
  if (count === 0) return MAX_BLOCK_SIZE;
  
  const availableWidth = containerWidth - CONTAINER_PADDING * 2;
  const availableHeight = containerHeight - CONTAINER_PADDING * 2;
  
  for (let size = MAX_BLOCK_SIZE; size >= MIN_BLOCK_SIZE; size--) {
    const gap = size > 6 ? 1 : 0;
    const columns = Math.floor(availableWidth / (size + gap));
    if (columns < 1) continue;
    const rows = Math.ceil(count / columns);
    const requiredHeight = rows * (size + gap);
    
    if (requiredHeight <= availableHeight) {
      return size;
    }
  }
  
  return MIN_BLOCK_SIZE;
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
              borderRadius: Math.max(1, blockSize / 5),
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

  const { blockSize, gap, rows, showColorBar } = useMemo(() => {
    const MAX_VIEWS = 500;
    
    if (totalBlocks > MAX_VIEWS) {
      return { blockSize: 0, gap: 0, rows: [], showColorBar: true };
    }
    
    const size = calculateOptimalBlockSize(totalBlocks, containerWidth, PILE_HEIGHT);
    const gapSize = size > 6 ? 1 : 0;
    const availableWidth = containerWidth - CONTAINER_PADDING * 2;
    const columns = Math.max(1, Math.floor(availableWidth / (size + gapSize)));
    
    const rowsArr: { rowIndex: number; blocks: { color: string; isTimeBlock: boolean }[] }[] = [];
    let blockIndex = 0;
    let currentRow: { color: string; isTimeBlock: boolean }[] = [];
    
    blocks.forEach((block) => {
      currentRow.push({ color: block.color, isTimeBlock: !!block.isTimeBlock });
      blockIndex++;
      
      if (currentRow.length >= columns) {
        rowsArr.push({ rowIndex: rowsArr.length, blocks: currentRow });
        currentRow = [];
      }
    });
    
    if (currentRow.length > 0) {
      rowsArr.push({ rowIndex: rowsArr.length, blocks: currentRow });
    }
    
    return { blockSize: size, gap: gapSize, rows: rowsArr, showColorBar: false };
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
      <View style={styles.totalBadge}>
        <ThemedText type="body" style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>
          {totalBlocks.toLocaleString()}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    position: "relative",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    flex: 1,
    padding: CONTAINER_PADDING,
    flexDirection: "column",
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
  totalBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
