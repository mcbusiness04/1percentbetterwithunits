import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PILE_HEIGHT = 140;
const MIN_BLOCK_SIZE = 8;
const MAX_BLOCK_SIZE = 24;
const BLOCK_GAP = 2;

interface Block {
  id: string;
  color: string;
  x: number;
  finalY: number;
}

interface FallingBlock {
  id: string;
  color: string;
  x: number;
  startY: number;
  endY: number;
}

interface FallingBlocksProps {
  blocks: Block[];
  newBlock: FallingBlock | null;
  onAnimationComplete?: () => void;
}

function AnimatedFallingBlock({
  block,
  blockSize,
  onComplete,
}: {
  block: FallingBlock;
  blockSize: number;
  onComplete: () => void;
}) {
  const translateY = useSharedValue(block.startY);
  const scale = useSharedValue(1.2);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(block.endY, {
      duration: 500,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
    
    scale.value = withSequence(
      withTiming(1.2, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 180 })
    );

    rotation.value = withSequence(
      withTiming(Math.random() * 15 - 7.5, { duration: 250 }),
      withSpring(0, { damping: 15 })
    );

    const timer = setTimeout(() => {
      runOnJS(onComplete)();
    }, 550);

    return () => clearTimeout(timer);
  }, [block, translateY, scale, rotation, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.fallingBlock,
        animatedStyle,
        {
          left: block.x,
          width: blockSize,
          height: blockSize,
          borderRadius: Math.max(4, blockSize / 4),
          backgroundColor: block.color,
          shadowColor: block.color,
        },
      ]}
    />
  );
}

function PileBlock({ block, blockSize }: { block: Block; blockSize: number }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(Math.random() * 6 - 3);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.pileBlock,
        animatedStyle,
        {
          left: block.x,
          bottom: block.finalY,
          width: blockSize,
          height: blockSize,
          borderRadius: Math.max(3, blockSize / 4),
          backgroundColor: block.color,
          shadowColor: block.color,
        },
      ]}
    />
  );
}

export function FallingBlocks({
  blocks,
  newBlock,
  onAnimationComplete,
}: FallingBlocksProps) {
  const [animatingBlock, setAnimatingBlock] = useState<FallingBlock | null>(null);

  const blockSize = useMemo(() => {
    const count = blocks.length;
    if (count <= 20) return MAX_BLOCK_SIZE;
    if (count <= 50) return 18;
    if (count <= 100) return 14;
    if (count <= 200) return 10;
    return MIN_BLOCK_SIZE;
  }, [blocks.length]);

  useEffect(() => {
    if (newBlock) {
      setAnimatingBlock(newBlock);
    }
  }, [newBlock]);

  const handleAnimationComplete = () => {
    setAnimatingBlock(null);
    onAnimationComplete?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.pileContainer}>
        {blocks.map((block) => (
          <PileBlock key={block.id} block={block} blockSize={blockSize} />
        ))}
      </View>
      
      {animatingBlock ? (
        <AnimatedFallingBlock
          block={animatingBlock}
          blockSize={blockSize}
          onComplete={handleAnimationComplete}
        />
      ) : null}
      
      <View style={styles.ground} />
    </View>
  );
}

export function useFallingBlocks() {
  const [pileBlocks, setPileBlocks] = useState<Block[]>([]);
  const [currentFallingBlock, setCurrentFallingBlock] = useState<FallingBlock | null>(null);
  const [blockCounter, setBlockCounter] = useState(0);

  const getBlockSize = (count: number) => {
    if (count <= 20) return MAX_BLOCK_SIZE;
    if (count <= 50) return 18;
    if (count <= 100) return 14;
    if (count <= 200) return 10;
    return MIN_BLOCK_SIZE;
  };

  const getColumnsForSize = (blockSize: number) => {
    const availableWidth = SCREEN_WIDTH - 80;
    return Math.floor(availableWidth / (blockSize + BLOCK_GAP));
  };

  const dropBlock = (color: string) => {
    const id = `block-${Date.now()}-${blockCounter}`;
    const currentCount = pileBlocks.length;
    const blockSize = getBlockSize(currentCount + 1);
    const columns = getColumnsForSize(blockSize);
    
    const col = currentCount % columns;
    const row = Math.floor(currentCount / columns);
    
    const finalX = 16 + col * (blockSize + BLOCK_GAP);
    const finalY = row * (blockSize + BLOCK_GAP) + 4;
    
    const x = Math.random() * (SCREEN_WIDTH - blockSize * 3) + blockSize;

    const fallingBlock: FallingBlock = {
      id,
      color,
      x,
      startY: -60,
      endY: PILE_HEIGHT - finalY - blockSize - 8,
    };

    setCurrentFallingBlock(fallingBlock);
    setBlockCounter((prev) => prev + 1);

    setTimeout(() => {
      setPileBlocks((prev) => {
        const newCount = prev.length + 1;
        const newBlockSize = getBlockSize(newCount);
        const newColumns = getColumnsForSize(newBlockSize);
        
        const newBlocks = prev.map((block, idx) => {
          const newCol = idx % newColumns;
          const newRow = Math.floor(idx / newColumns);
          return {
            ...block,
            x: 16 + newCol * (newBlockSize + BLOCK_GAP),
            finalY: newRow * (newBlockSize + BLOCK_GAP) + 4,
          };
        });
        
        const newBlockCol = newCount - 1;
        const newBlockRow = Math.floor(newBlockCol / newColumns);
        const newBlockColPos = newBlockCol % newColumns;
        
        return [
          ...newBlocks,
          {
            id,
            color,
            x: 16 + newBlockColPos * (newBlockSize + BLOCK_GAP),
            finalY: newBlockRow * (newBlockSize + BLOCK_GAP) + 4,
          },
        ];
      });
    }, 500);
  };

  const removeBlock = (color: string) => {
    setPileBlocks((prev) => {
      const colorBlocks = prev.filter((b) => b.color === color);
      if (colorBlocks.length === 0) return prev;
      const lastBlock = colorBlocks[colorBlocks.length - 1];
      const filtered = prev.filter((b) => b.id !== lastBlock.id);
      
      const blockSize = getBlockSize(filtered.length);
      const columns = getColumnsForSize(blockSize);
      
      return filtered.map((block, idx) => {
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        return {
          ...block,
          x: 16 + col * (blockSize + BLOCK_GAP),
          finalY: row * (blockSize + BLOCK_GAP) + 4,
        };
      });
    });
  };

  const clearBlocks = () => {
    setPileBlocks([]);
    setCurrentFallingBlock(null);
  };

  return {
    pileBlocks,
    currentFallingBlock,
    dropBlock,
    removeBlock,
    clearBlocks,
  };
}

const styles = StyleSheet.create({
  container: {
    height: PILE_HEIGHT,
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  pileContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PILE_HEIGHT,
  },
  fallingBlock: {
    position: "absolute",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  pileBlock: {
    position: "absolute",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  ground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
  },
});
