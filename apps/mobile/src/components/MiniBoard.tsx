import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface MiniBoardProps {
  size?: number;
}

export const MiniBoard: React.FC<MiniBoardProps> = ({ size = 60 }) => {
  const squareSize = size / 4;

  const renderSquare = (row: number, col: number) => {
    const isDark = (row + col) % 2 !== 0;
    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            width: squareSize,
            height: squareSize,
            backgroundColor: isDark ? colors.boardDark : colors.boardLight,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.board, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1, 2, 3].map((col) => renderSquare(row, col))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  board: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  row: {
    flexDirection: "row",
  },
  square: {},
});
