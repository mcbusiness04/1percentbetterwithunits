import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const MIN_BLOCK_SIZE = 2;
const MAX_BLOCK_SIZE = 20;
const BLOCK_GAP = 1;
const CONTAINER_PADDING = 4;
const MAX_VISIBLE_BLOCKS = 2000;

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
    const gap = size > 6 ? BLOCK_GAP : 0;
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

function PileBlock({ 
  x, 
  y, 
  size, 
  color, 
  isNew,
  glowing 
}: { 
  x: number; 
  y: number; 
  size: number; 
  color: string;
  isNew: boolean;
  glowing?: boolean;
}) {
  const scale = useSharedValue(isNew ? 0 : 1);
  const translateY = useSharedValue(isNew ? -50 : 0);

  useEffect(() => {
    if (isNew) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }
  }, [isNew, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const glowingStyle = glowing ? {
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: `${color}`,
  } : undefined;

  return (
    <Animated.View
      style={[
        styles.pileBlock,
        animatedStyle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: Math.max(1, size / 5),
          backgroundColor: color,
        },
        glowingStyle,
      ]}
    >
      {glowing && size > 4 ? (
        <View style={{
          position: "absolute",
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: Math.max(1, size / 5) + 1,
          borderWidth: 1,
          borderColor: "#FFD70090",
        }} />
      ) : null}
    </Animated.View>
  );
}

export function FallingBlocks({ blocks, containerWidth: propWidth }: FallingBlocksProps) {
  const containerWidth = propWidth || SCREEN_WIDTH - 32;
  const prevCountRef = useRef(0);
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());
  const { theme } = useTheme();

  const totalBlocks = blocks.length;
  const displayBlocks = totalBlocks > MAX_VISIBLE_BLOCKS 
    ? blocks.slice(0, MAX_VISIBLE_BLOCKS) 
    : blocks;
  const hasOverflow = totalBlocks > MAX_VISIBLE_BLOCKS;

  const blockSize = useMemo(() => {
    return calculateOptimalBlockSize(displayBlocks.length, containerWidth, PILE_HEIGHT);
  }, [displayBlocks.length, containerWidth]);

  const gap = blockSize > 6 ? BLOCK_GAP : 0;
  const availableWidth = containerWidth - CONTAINER_PADDING * 2;
  const columns = Math.max(1, Math.floor(availableWidth / (blockSize + gap)));

  useEffect(() => {
    if (blocks.length > prevCountRef.current) {
      const newIds = new Set<string>();
      blocks.slice(prevCountRef.current).forEach(b => newIds.add(b.id));
      setNewBlockIds(newIds);
      
      const timer = setTimeout(() => {
        setNewBlockIds(new Set());
      }, 400);
      
      prevCountRef.current = blocks.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = blocks.length;
  }, [blocks.length, blocks]);

  const positionedBlocks = useMemo(() => {
    return displayBlocks.map((block, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      return {
        ...block,
        x: CONTAINER_PADDING + col * (blockSize + gap),
        y: CONTAINER_PADDING + row * (blockSize + gap),
      };
    });
  }, [displayBlocks, columns, blockSize, gap]);

  const colorGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    blocks.forEach(b => {
      groups[b.color] = (groups[b.color] || 0) + 1;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
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
      {positionedBlocks.map((block) => (
        <PileBlock
          key={block.id}
          x={block.x}
          y={block.y}
          size={blockSize}
          color={block.color}
          isNew={newBlockIds.has(block.id)}
          glowing={block.isTimeBlock}
        />
      ))}
      {hasOverflow ? (
        <View style={styles.overflowBadge}>
          <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", fontSize: 10 }}>
            +{(totalBlocks - MAX_VISIBLE_BLOCKS).toLocaleString()}
          </ThemedText>
        </View>
      ) : null}
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
  pileBlock: {
    position: "absolute",
  },
  overflowBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
