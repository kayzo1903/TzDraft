import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

export type PieceColor = "WHITE" | "BLACK";

interface PieceProps {
  color: PieceColor;
  isKing?: boolean;
  isSelected?: boolean;
  /** True during landing — plays a subtle scale bounce (visual only, no Reanimated) */
  isLanding?: boolean;
  size: number;
}

export function Piece({ color, isKing, isSelected, isLanding, size }: PieceProps) {
  const isWhite = color === "WHITE";
  const diameter = size * 0.82;
  const radius = diameter / 2;
  const specularW = diameter * 0.30;
  const specularH = diameter * 0.18;

  const outerScale = isSelected ? 1.12 : isLanding ? 1.08 : 1.0;

  return (
    <View
      style={[
        styles.wrapper,
        { width: size, height: size },
      ]}
    >
      <View
        style={[
          {
            width: diameter,
            height: diameter,
            borderRadius: radius,
            transform: [{ scale: outerScale }],
            // Outer shadow for depth
            shadowColor: "#000",
            shadowOffset: { width: 0, height: isSelected ? 6 : 3 },
            shadowOpacity: isWhite ? 0.35 : 0.60,
            shadowRadius: isSelected ? 10 : 5,
            elevation: isSelected ? 12 : 6,
          },
        ]}
      >
        {/* Main disc body — linear gradient approximates the web's radial gradient */}
        <LinearGradient
          colors={
            isWhite
              ? ["#ffffff", "#e2dfdb", "#c8c3bc"]
              : ["#4b4742", "#2a2623", "#141210"]
          }
          start={{ x: 0.28, y: 0.18 }}
          end={{ x: 0.9, y: 0.95 }}
          style={[styles.disc, { borderRadius: radius }]}
        >
          {/* Rim highlight ring */}
          <View
            style={[
              styles.rim,
              {
                borderRadius: radius * 0.93,
                borderColor: isWhite
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(255,255,255,0.10)",
              },
            ]}
          />

          {/* Top specular dot — simulates light glint */}
          <View
            style={[
              styles.specular,
              {
                width: specularW,
                height: specularH,
                borderRadius: specularW / 2,
                backgroundColor: isWhite
                  ? "rgba(255,255,255,0.90)"
                  : "rgba(255,255,255,0.18)",
              },
            ]}
          />

          {/* King crown — SVG path matching the web version */}
          {isKing && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg
                viewBox="0 0 24 24"
                width={diameter * 0.46}
                height={diameter * 0.46}
                style={styles.crown}
              >
                <Path
                  d="M3 18h18l-1.5-9-4.5 4.5L12 6l-3 7.5L4.5 9 3 18z"
                  fill={
                    isWhite
                      ? "rgba(30,20,5,0.85)"
                      : "rgba(255,220,100,0.90)"
                  }
                  stroke={
                    isWhite
                      ? "rgba(0,0,0,0.2)"
                      : "rgba(200,160,0,0.6)"
                  }
                  strokeWidth="0.5"
                />
              </Svg>
            </View>
          )}
        </LinearGradient>

        {/* Selection glow ring */}
        {isSelected && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius,
                borderWidth: 2.5,
                borderColor: "rgba(250,204,21,0.75)",
                shadowColor: "rgba(250,204,21,1)",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 8,
              },
            ]}
            pointerEvents="none"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rim: {
    position: "absolute",
    top: "7%",
    left: "7%",
    right: "7%",
    bottom: "7%",
    borderWidth: 1.5,
  },
  specular: {
    position: "absolute",
    top: "16%",
    left: "22%",
    opacity: 0.9,
  },
  crown: {
    position: "absolute",
    alignSelf: "center",
    top: "27%",
  },
});
