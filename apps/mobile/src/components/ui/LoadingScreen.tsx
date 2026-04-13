import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

export const LoadingScreen: React.FC = () => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation (Glow)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Bounce animation (Checker)
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ])
    ).start();

    // Dots animation
    const createDotAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
          Animated.delay(800 - delay),
        ])
      );
    };

    Animated.parallel([
      createDotAnim(dot1Anim, 0),
      createDotAnim(dot2Anim, 150),
      createDotAnim(dot3Anim, 300),
    ]).start();
  }, []);

  const bounceTranslateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const dot1TranslateY = dot1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const dot2TranslateY = dot2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const dot3TranslateY = dot3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        {/* Animated Checker Piece */}
        <Animated.View
          style={[
            styles.checkerContainer,
            {
              transform: [{ translateY: bounceTranslateY }],
            },
          ]}
        >
          <View style={styles.checker}>
            <View style={styles.checkerInner} />
            <View style={styles.checkerRing} />
          </View>
        </Animated.View>

        {/* Dots */}
        <View style={styles.textSection}>
          <View style={styles.dotsRow}>
            <Animated.View
              style={[
                styles.dot,
                { transform: [{ translateY: dot1TranslateY }] },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { transform: [{ translateY: dot2TranslateY }] },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { transform: [{ translateY: dot3TranslateY }] },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020205",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 300,
  },
  glow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#f59e0b",
  },
  checkerContainer: {
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  checker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    borderWidth: 4,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  checkerInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  checkerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#444",
    opacity: 0.5,
  },
  textSection: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
});
