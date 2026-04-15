/**
 * DraughtsBoard.tsx
 *
 * 8×8 Tanzania Draughts board for React Native.
 * Feature-parity with the web Board component:
 *   - 3D pieces via Piece.tsx
 *   - Rank/file labels (A-H, 1-8)
 *   - Last-move amber tint (from + to squares)
 *   - Selected highlight: yellow/amber overlay
 *   - Legal move: dark neutral dot on empty squares
 *   - Capture target: emerald ring on occupied squares
 *   - Forced-piece: orange pulse (opacity animation)
 *   - Invalid-move: board shake (Animated)
 *   - Board outer frame with gold border + inner vignette
 *
 * PDN layout — WHITE at bottom (app FEN convention):
 *   Row 0 (top, BLACK's back): PDN 29-32
 *   …
 *   Row 7 (bottom, WHITE's back): PDN 1-4
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Text,
} from "react-native";
import { colors } from "../../theme/colors";
import { Piece } from "./Piece";
import type { BoardState } from "@tzdraft/mkaguzi-engine";
import { PlayerColor, PieceType } from "@tzdraft/mkaguzi-engine";

// ─── PDN grid ─────────────────────────────────────────────────────────────────
// Map every (row, col) to a PDN number, or null for light squares.
// Board orientation (unflipped): row 0 = top (PDN 29-32), row 7 = bottom (PDN 1-4).
// When flipped the grid is reversed 180° so that the human player's pieces
// always appear at the bottom — matching the web Board component's `flipped` prop.
function buildGrid(): (number | null)[][] {
  const grid: (number | null)[][] = [];
  let darkCount = 0;
  for (let r = 0; r < 8; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        darkCount++;
        // PDN 1 is bottom-left dark square → 33 - position
        row.push(33 - darkCount);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

const GRID = buildGrid();
// Pre-built flipped grid: rows and columns both reversed (180° rotation).
// PDN numbers are preserved — only the visual position changes.
const GRID_FLIPPED: (number | null)[][] = [...GRID]
  .reverse()
  .map((row) => [...row].reverse());

// ─── Board coordinate labels ─────────────────────────────────────────────────
// Unflipped: Files A→H left-to-right; ranks 8→1 top-to-bottom.
// Flipped:   Files H→A left-to-right; ranks 1→8 top-to-bottom.
const FILE_LABELS =         ["A", "B", "C", "D", "E", "F", "G", "H"];
const FILE_LABELS_FLIPPED = ["H", "G", "F", "E", "D", "C", "B", "A"];
const RANK_LABELS =         ["8", "7", "6", "5", "4", "3", "2", "1"];
const RANK_LABELS_FLIPPED = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ─── Sizing ───────────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get("window").width;
const BOARD_PADDING = 10; // outer frame padding
const BOARD_SIZE = SCREEN_WIDTH - BOARD_PADDING * 2;
const CELL_SIZE = BOARD_SIZE / 8;
const LABEL_SIZE = 10; // font size for rank/file labels

// ─── Types ────────────────────────────────────────────────────────────────────
export type HighlightType = "selected" | "destination" | "capturable" | "forced";

export interface LastMove {
  from: number;
  to: number;
}

interface DraughtsBoardProps {
  board: BoardState;
  highlights: Record<number, HighlightType>;
  onSquarePress: (pdn: number) => void;
  onInvalidPress?: () => void; // triggers board shake
  lastMove?: LastMove | null;
  landingSquare?: number | null; // PDN square that just received a piece
  disabled?: boolean;
  /**
   * When true the board is rendered 180° rotated so the human player's
   * pieces appear at the bottom — mirrors the web Board component's `flipped`
   * prop.  Convention (matching web): flip when playerColor === WHITE.
   */
  flipped?: boolean;
}

// ─── Landing-bounce hook ──────────────────────────────────────────────────────
function useLandingSquare() {
  const [landing, setLanding] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLanding = useCallback((pdn: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLanding(pdn);
    timerRef.current = setTimeout(() => {
      setLanding(null);
      timerRef.current = null;
    }, 220);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { landing, triggerLanding };
}

// ─── Forced-piece pulse ───────────────────────────────────────────────────────
function useForcedPulse() {
  const anim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ]),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      anim.setValue(1);
    }
    return () => { loopRef.current?.stop(); };
  }, [active, anim]);

  return { pulseOpacity: anim, setActive };
}

// ─── Board shake ─────────────────────────────────────────────────────────────
function useBoardShake() {
  const shakeX = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue:  8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeX]);

  return { shakeX, shake };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DraughtsBoard({
  board,
  highlights,
  onSquarePress,
  onInvalidPress,
  lastMove = null,
  disabled = false,
  flipped = false,
}: DraughtsBoardProps) {
  // Select the correct grid and label arrays based on the flip state.
  const activeGrid   = flipped ? GRID_FLIPPED   : GRID;
  const rankLabels   = flipped ? RANK_LABELS_FLIPPED : RANK_LABELS;
  const fileLabels   = flipped ? FILE_LABELS_FLIPPED : FILE_LABELS;
  const { landing, triggerLanding } = useLandingSquare();
  const { pulseOpacity, setActive: setPulseActive } = useForcedPulse();
  const { shakeX, shake } = useBoardShake();

  // Activate forced-piece pulse whenever there are forced pieces highlighted
  const hasForcedPieces = useMemo(
    () => Object.values(highlights).some((h) => h === "forced"),
    [highlights],
  );
  useEffect(() => { setPulseActive(hasForcedPieces); }, [hasForcedPieces, setPulseActive]);

  // Expose shake to parent via onInvalidPress
  const handleInvalidPress = useCallback(() => {
    shake();
    onInvalidPress?.();
  }, [shake, onInvalidPress]);

  // PDN → piece lookup
  const pieceMap = useMemo(() => {
    const map = new Map<number, { color: "WHITE" | "BLACK"; isKing: boolean }>();
    board.getAllPieces().forEach((piece) => {
      map.set(piece.position.value, {
        color: piece.color === PlayerColor.WHITE ? "WHITE" : "BLACK",
        isKing: piece.type === PieceType.KING,
      });
    });
    return map;
  }, [board]);

  const handlePress = useCallback(
    (pdn: number) => {
      if (disabled) return;
      const h = highlights[pdn];
      if (h === "destination" || h === "capturable") {
        triggerLanding(pdn);
      }
      onSquarePress(pdn);
    },
    [disabled, highlights, triggerLanding, onSquarePress],
  );

  return (
    <Animated.View
      style={[
        styles.outerFrame,
        { transform: [{ translateX: shakeX }] },
      ]}
    >
      {/* Inner board grid */}
      <View style={styles.board}>
        {activeGrid.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((pdn, colIdx) => {
              const isLight = (rowIdx + colIdx) % 2 === 0;
              const highlight = pdn != null ? highlights[pdn] : undefined;
              const piece = pdn != null ? pieceMap.get(pdn) : undefined;
              const isLastMoveFrom = lastMove != null && pdn === lastMove.from;
              const isLastMoveTo = lastMove != null && pdn === lastMove.to;
              const isLandingHere = landing != null && pdn === landing;
              const isForced = highlight === "forced";
              const isSelected = highlight === "selected";
              const isDestination = highlight === "destination";
              const isCapturable = highlight === "capturable";

              return (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.cell,
                    { backgroundColor: isLight ? colors.boardLight : colors.boardDark },
                  ]}
                  onPress={() => {
                    if (pdn != null) handlePress(pdn);
                    else handleInvalidPress();
                  }}
                  activeOpacity={pdn != null && !disabled ? 0.75 : 1}
                  disabled={pdn == null || disabled}
                >
                  {/* Rank label — left edge */}
                  {colIdx === 0 && (
                    <Text
                      style={[
                        styles.rankLabel,
                        { color: isLight ? colors.boardDark : colors.boardLight },
                      ]}
                    >
                      {rankLabels[rowIdx]}
                    </Text>
                  )}

                  {/* File label — bottom edge */}
                  {rowIdx === 7 && (
                    <Text
                      style={[
                        styles.fileLabel,
                        { color: isLight ? colors.boardDark : colors.boardLight },
                      ]}
                    >
                      {fileLabels[colIdx]}
                    </Text>
                  )}

                  {/* Last-move tint */}
                  {(isLastMoveFrom || isLastMoveTo) && !isLight && (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        isLastMoveTo
                          ? styles.lastMoveToTint
                          : styles.lastMoveFromTint,
                      ]}
                      pointerEvents="none"
                    />
                  )}

                  {/* Selected highlight */}
                  {isSelected && !isLight && (
                    <View
                      style={[StyleSheet.absoluteFill, styles.selectedOverlay]}
                      pointerEvents="none"
                    />
                  )}

                  {/* Legal move — full square glow */}
                  {isDestination && !piece && (
                    <View style={styles.moveGlow} pointerEvents="none" />
                  )}

                  {/* Forced piece pulse ring */}
                  {piece && isForced && (
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        styles.forcedRing,
                        { opacity: pulseOpacity },
                      ]}
                      pointerEvents="none"
                    />
                  )}

                  {/* Piece */}
                  {piece && (
                    <Piece
                      color={piece.color}
                      isKing={piece.isKing}
                      isSelected={isSelected}
                      isLanding={isLandingHere}
                      size={CELL_SIZE}
                    />
                  )}

                  {/* Capture target ring — rendered on top of piece */}
                  {isCapturable && piece && (
                    <View
                      style={[StyleSheet.absoluteFill, styles.capturableRing]}
                      pointerEvents="none"
                    />
                  )}

                  {/* Capture move dot (destination with opponent piece to jump to) */}
                  {isDestination && piece && (
                    <View
                      style={[StyleSheet.absoluteFill, styles.destinationOnPiece]}
                      pointerEvents="none"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Vignette — inner shadow */}
        <View style={styles.vignette} pointerEvents="none" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerFrame: {
    width: BOARD_SIZE + 6,
    height: BOARD_SIZE + 6,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "rgba(139, 105, 20, 0.75)", // amber/gold frame
    backgroundColor: "#1e1b18",
    padding: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    alignSelf: "center",
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  rankLabel: {
    position: "absolute",
    top: 2,
    left: 2,
    fontSize: LABEL_SIZE,
    fontWeight: "bold",
    lineHeight: LABEL_SIZE,
    zIndex: 5,
  },
  fileLabel: {
    position: "absolute",
    bottom: 2,
    right: 2,
    fontSize: LABEL_SIZE,
    fontWeight: "bold",
    lineHeight: LABEL_SIZE,
    zIndex: 5,
  },
  lastMoveFromTint: {
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  lastMoveToTint: {
    backgroundColor: "rgba(245,158,11,0.22)",
  },
  selectedOverlay: {
    backgroundColor: "rgba(250,204,21,0.35)",
  },
  moveGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,20,0.40)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.60,
    shadowRadius: 8,
    elevation: 6,
  },
  destinationOnPiece: {
    borderRadius: CELL_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(52,211,153,0.65)", // emerald
  },
  capturableRing: {
    borderRadius: CELL_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(52,211,153,0.65)", // emerald — matches web
  },
  forcedRing: {
    borderRadius: CELL_SIZE * 0.42,
    borderWidth: 2,
    borderColor: "rgba(251,146,60,0.80)", // orange
    shadowColor: "rgba(251,146,60,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 7,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    // Inner vignette: achieved by using a solid transparent background with
    // an elevation-less shadow inset. On Android we rely on the frame shadow.
  },
});
