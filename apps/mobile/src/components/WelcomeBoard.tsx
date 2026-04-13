import React from "react";
import { View, StyleSheet } from "react-native";

interface WelcomeBoardProps {
  size?: number;
}

export const WelcomeBoard: React.FC<WelcomeBoardProps> = ({ size = 280 }) => {
  const squareSize = size / 8;
  
  const boardColors = {
    light: "#fdba74",
    dark: "#9a3412",
  };

  const isDarkSquare = (row: number, col: number) => (row + col) % 2 !== 0;

  const renderPiece = (row: number, col: number) => {
    const isDark = isDarkSquare(row, col);
    if (!isDark) return null;

    if (row < 3) {
      // Black pieces - Using layered Views for depth
      return (
        <View style={styles.pieceContainer}>
          <View style={[styles.piece, { backgroundColor: "#141210" }]}>
            <View style={styles.specularDot} />
            <View style={[styles.pieceRing, { borderColor: "rgba(255,255,255,0.06)" }]} />
          </View>
        </View>
      );
    }

    if (row > 4) {
      // White pieces - Using layered Views for depth
      return (
        <View style={styles.pieceContainer}>
          <View style={[styles.piece, { backgroundColor: "#ffffff" }]}>
            <View style={[styles.specularDot, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
            <View style={[styles.pieceRing, { borderColor: "rgba(0,0,0,0.1)" }]} />
          </View>
        </View>
      );
    }

    return null;
  };

  const renderSquare = (row: number, col: number) => {
    const isDark = isDarkSquare(row, col);
    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.square,
          {
            width: squareSize,
            height: squareSize,
            backgroundColor: isDark ? boardColors.dark : boardColors.light,
          },
        ]}
      >
        {renderPiece(row, col)}
      </View>
    );
  };

  return (
    <View style={[styles.boardWrapper, { width: size + 16, height: size + 16 }]}>
      <View style={[styles.board, { width: size, height: size }]}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
          <View key={row} style={styles.row}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => renderSquare(row, col))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardWrapper: {
    backgroundColor: "#1e1b18",
    padding: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  board: {
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139, 105, 20, 0.6)",
  },
  row: {
    flexDirection: "row",
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieceContainer: {
    width: "82%",
    height: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  piece: {
    flex: 1,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    position: "relative",
  },
  specularDot: {
    position: "absolute",
    width: "30%",
    height: "20%",
    borderRadius: 100,
    top: "15%",
    left: "20%",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  pieceRing: {
    width: "80%",
    height: "80%",
    borderRadius: 100,
    borderWidth: 1.5,
    opacity: 0.6,
  },
});
