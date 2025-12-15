import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 130;
const MIN_BLOCK_SIZE = 4;
const MAX_BLOCK_SIZE = 20;
const BLOCK_GAP = 2;
const CONTAINER_PADDING = 8;

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
    const columns = Math.floor(availableWidth / (size + BLOCK_GAP));
    if (columns < 1) continue;
    const rows = Math.ceil(count / columns);
    const requiredHeight = rows * (size + BLOCK_GAP);
    
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
          borderRadius: Math.max(2, size / 5),
          backgroundColor: color,
        },
        glowingStyle,
      ]}
    >
      {glowing ? (
        <View style={{
          position: "absolute",
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: Math.max(2, size / 5) + 1,
          borderWidth: 2,
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

  const blockSize = useMemo(() => {
    return calculateOptimalBlockSize(blocks.length, containerWidth, PILE_HEIGHT);
  }, [blocks.length, containerWidth]);

  const availableWidth = containerWidth - CONTAINER_PADDING * 2;
  const columns = Math.max(1, Math.floor(availableWidth / (blockSize + BLOCK_GAP)));

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
    return blocks.map((block, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      return {
        ...block,
        x: CONTAINER_PADDING + col * (blockSize + BLOCK_GAP),
        y: CONTAINER_PADDING + row * (blockSize + BLOCK_GAP),
      };
    });
  }, [blocks, columns, blockSize]);

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    position: "relative",
  },
  pileBlock: {
    position: "absolute",
  },
});
