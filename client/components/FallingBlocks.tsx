import React, { useEffect, useState } from "react";
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
const BLOCK_SIZE = 24;
const PILE_HEIGHT = 100;
const MAX_PILE_BLOCKS = 30;

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
  onComplete,
}: {
  block: FallingBlock;
  onComplete: () => void;
}) {
  const translateY = useSharedValue(block.startY);
  const scale = useSharedValue(1.2);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withTiming(block.endY, {
      duration: 600,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
    
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 8, stiffness: 150 })
    );

    rotation.value = withSequence(
      withTiming(Math.random() * 20 - 10, { duration: 300 }),
      withSpring(0, { damping: 15 })
    );

    const timer = setTimeout(() => {
      runOnJS(onComplete)();
    }, 650);

    return () => clearTimeout(timer);
  }, [block, translateY, scale, rotation, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.fallingBlock,
        animatedStyle,
        {
          left: block.x,
          backgroundColor: block.color,
          shadowColor: block.color,
        },
      ]}
    />
  );
}

function PileBlock({ block, index }: { block: Block; index: number }) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(Math.random() * 10 - 5);

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

  useEffect(() => {
    if (newBlock) {
      setAnimatingBlock(newBlock);
    }
  }, [newBlock]);

  const handleAnimationComplete = () => {
    setAnimatingBlock(null);
    onAnimationComplete?.();
  };

  const visibleBlocks = blocks.slice(-MAX_PILE_BLOCKS);

  return (
    <View style={styles.container}>
      <View style={styles.pileContainer}>
        {visibleBlocks.map((block, index) => (
          <PileBlock key={block.id} block={block} index={index} />
        ))}
      </View>
      
      {animatingBlock ? (
        <AnimatedFallingBlock
          block={animatingBlock}
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

  const dropBlock = (color: string) => {
    const id = `block-${Date.now()}-${blockCounter}`;
    const x = Math.random() * (SCREEN_WIDTH - BLOCK_SIZE * 4) + BLOCK_SIZE;
    
    const row = Math.floor(pileBlocks.length / 8);
    const col = pileBlocks.length % 8;
    const finalY = row * (BLOCK_SIZE - 4) + 4;
    const finalX = col * (BLOCK_SIZE + 4) + 20;

    const fallingBlock: FallingBlock = {
      id,
      color,
      x,
      startY: -100,
      endY: PILE_HEIGHT - finalY - BLOCK_SIZE,
    };

    setCurrentFallingBlock(fallingBlock);
    setBlockCounter((prev) => prev + 1);

    setTimeout(() => {
      setPileBlocks((prev) => {
        const newBlocks = [...prev, { id, color, x: finalX, finalY }];
        if (newBlocks.length > MAX_PILE_BLOCKS) {
          return newBlocks.slice(-MAX_PILE_BLOCKS);
        }
        return newBlocks;
      });
    }, 600);
  };

  const removeBlock = (color: string) => {
    setPileBlocks((prev) => {
      const colorBlocks = prev.filter((b) => b.color === color);
      if (colorBlocks.length === 0) return prev;
      const lastBlock = colorBlocks[colorBlocks.length - 1];
      return prev.filter((b) => b.id !== lastBlock.id);
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
    height: PILE_HEIGHT + 20,
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
    width: BLOCK_SIZE,
    height: BLOCK_SIZE,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  pileBlock: {
    position: "absolute",
    width: BLOCK_SIZE,
    height: BLOCK_SIZE,
    borderRadius: 6,
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
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
  },
});
