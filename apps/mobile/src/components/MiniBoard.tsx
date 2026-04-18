import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface MiniBoardProps {
  size?: number;
}

// Starting draughts position on a 4×4 preview:
// Black pieces on dark squares of rows 0–1, white pieces on rows 2–3
const BLACK_SQUARES: Record<string, "black" | "white"> = {
  "0-1": "black",
  "0-3": "black",
  "1-0": "black",
  "1-2": "black",
  "2-1": "white",
  "2-3": "white",
  "3-0": "white",
  "3-2": "white",
};

export const MiniBoard: React.FC<MiniBoardProps> = ({ size = 60 }) => {
  const squareSize = size / 4;
  const pieceSize = squareSize * 0.72;
  const pieceOffset = (squareSize - pieceSize) / 2;

  const renderSquare = (row: number, col: number) => {
    const isDark = (row + col) % 2 !== 0;
    const piece = BLACK_SQUARES[`${row}-${col}`];

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
      >
        {piece && (
          <View
            style={[
              styles.piece,
              {
                width: pieceSize,
                height: pieceSize,
                borderRadius: pieceSize / 2,
                top: pieceOffset,
                left: pieceOffset,
                backgroundColor:
                  piece === "black" ? colors.pieceBlack : colors.pieceWhite,
                borderColor:
                  piece === "black"
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(0,0,0,0.25)",
              },
            ]}
          />
        )}
      </View>
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
  square: {
    position: "relative",
  },
  piece: {
    position: "absolute",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
});
