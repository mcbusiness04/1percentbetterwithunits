import React, { useMemo, memo } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import { Canvas, Rect, Group, RoundedRect } from "@shopify/react-native-skia";
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

interface SkiaBlocksProps {
  blocks: BlockData[];
  containerWidth: number;
}

const SkiaBlocks = memo(function SkiaBlocks({ blocks, containerWidth }: SkiaBlocksProps) {
  const totalBlocks = blocks.length;
  
  const { blockSize, gap, columns, positions } = useMemo(() => {
    const size = calculateOptimalBlockSize(totalBlocks, containerWidth, PILE_HEIGHT);
    const gapSize = size > 6 ? 1 : 0;
    const availableWidth = containerWidth - CONTAINER_PADDING * 2;
    const cols = Math.max(1, Math.floor(availableWidth / (size + gapSize)));
    
    const posArr: { x: number; y: number; color: string; isTimeBlock: boolean }[] = [];
    blocks.forEach((block, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      posArr.push({
        x: CONTAINER_PADDING + col * (size + gapSize),
        y: CONTAINER_PADDING + row * (size + gapSize),
        color: block.color,
        isTimeBlock: !!block.isTimeBlock,
      });
    });
    
    return { blockSize: size, gap: gapSize, columns: cols, positions: posArr };
  }, [blocks, totalBlocks, containerWidth]);

  const radius = Math.max(1, blockSize / 5);

  return (
    <Canvas style={{ width: containerWidth, height: PILE_HEIGHT }}>
      <Group>
        {positions.map((pos, i) => (
          <RoundedRect
            key={i}
            x={pos.x}
            y={pos.y}
            width={blockSize}
            height={blockSize}
            r={radius}
            color={pos.color}
          />
        ))}
      </Group>
    </Canvas>
  );
});

const FallbackBlocks = memo(function FallbackBlocks({ blocks, containerWidth }: SkiaBlocksProps) {
  const totalBlocks = blocks.length;
  
  const colorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    blocks.forEach((block) => {
      counts.set(block.color, (counts.get(block.color) || 0) + 1);
    });
    return counts;
  }, [blocks]);

  const segments = useMemo(() => {
    const result: { color: string; percent: number }[] = [];
    colorCounts.forEach((count, color) => {
      result.push({ color, percent: (count / totalBlocks) * 100 });
    });
    return result;
  }, [colorCounts, totalBlocks]);

  return (
    <View style={[styles.colorBar, { width: containerWidth - CONTAINER_PADDING * 2 }]}>
      {segments.map((seg, i) => (
        <View
          key={`${seg.color}-${i}`}
          style={[
            styles.colorSegment,
            {
              width: `${seg.percent}%`,
              backgroundColor: seg.color,
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
  const useSkia = Platform.OS !== "web";

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
      {useSkia ? (
        <SkiaBlocks blocks={blocks} containerWidth={containerWidth} />
      ) : (
        <FallbackBlocks blocks={blocks} containerWidth={containerWidth} />
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
