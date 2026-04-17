import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

const ORANGE = "#f97316";
const BG = "#1E1E1E";
const PIECE_BG = "#262522";
const PIECE_BORDER = "#3d3d3d";
const RING_BORDER = "#555555";

export const LoadingScreen: React.FC = () => {
  // Checker bounce
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // Glow pulse
  const glowAnim = useRef(new Animated.Value(0)).current;
  // Title pulse
  const titleAnim = useRef(new Animated.Value(1)).current;
  // Dot bounces (staggered)
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Checker bounce — matches web's animate-bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -20,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse — matches web's animate-pulse (slow, 2 s cycle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Title pulse — same as glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleAnim, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered dot bounces — matches web's [animation-delay:-0.3s], [-0.15s], [0]
    const makeDotLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    Animated.parallel([
      makeDotLoop(dot1, 0),
      makeDotLoop(dot2, 150),
      makeDotLoop(dot3, 300),
    ]).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.35],
  });

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {/* Checker piece with glow */}
        <View style={styles.pieceWrapper}>
          {/* Pulsing orange glow behind the piece */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

          {/* Bouncing checker piece */}
          <Animated.View
            style={[
              styles.piece,
              { transform: [{ translateY: bounceAnim }] },
            ]}
          >
            {/* Subtle gradient sheen (top-left highlight) */}
            <View style={styles.pieceSheen} />
            {/* Inner concentric ring */}
            <View style={styles.pieceRing} />
          </Animated.View>
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          {/* "TzDraft" pulsing title */}
          <Animated.Text style={[styles.title, { opacity: titleAnim }]}>
            TzDraft
          </Animated.Text>

          {/* 3 staggered orange dots */}
          <View style={styles.dotsRow}>
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
            />
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
            />
            <Animated.View
              style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  content: {
    alignItems: "center",
    gap: 24,
  },
  // Piece container — matches web's w-24 h-24
  pieceWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  // Orange glow — matches web's bg-orange-500/20 blur-xl animate-pulse
  glow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ORANGE,
  },
  // Checker piece — matches web's w-16 h-16 bg-[#262522] border-4 border-[#3d3d3d]
  piece: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PIECE_BG,
    borderWidth: 4,
    borderColor: PIECE_BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  // Gradient sheen — matches web's bg-gradient-to-br from-white/5
  pieceSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderBottomRightRadius: 32,
  },
  // Inner ring — matches web's w-10 h-10 border-2 border-[#555] opacity-50
  pieceRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: RING_BORDER,
    opacity: 0.5,
  },
  // Text block
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  // "TzDraft" — matches web's text-2xl font-black tracking-tight animate-pulse
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  // Dots row — matches web's flex gap-1
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  // Each dot — matches web's w-2 h-2 bg-orange-500 rounded-full
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
});
