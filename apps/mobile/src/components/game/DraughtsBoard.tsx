/**
 * DraughtsBoard.tsx
 *
 * Gesture engine: RNGH Pan + Reanimated 3.
 *
 * Thread contract
 * ───────────────
 * UI thread (worklet)   — shared values + module-level constants only.
 *                         No refs, no React state reads.
 * JS thread (runOnJS)   — React state updates, onSquarePress calls,
 *                         reads JS-only refs (pieceMapRef, highlightsRef).
 *
 * Drag/tap separation
 * ───────────────────
 * onBegin  — fires on any touch: pre-positions ghost, stores fromPdnSV.
 *             Does NOT call onSquarePress (avoids double-select on taps).
 * onStart  — fires only after minDistance: it IS a drag. Shows ghost (scale
 *             spring), fades source, calls JS confirmDrag.
 * onEnd    — if fromPdnSV < 0 (never confirmed as drag): no-op, let
 *             TouchableOpacity handle it. Otherwise resolves the move.
 * onFinalize — always cleans up shared state.
 *
 * Why no refs in worklets
 * ───────────────────────
 * Reanimated serialises worklet closures. Ref objects frozen — any .current
 * mutation triggers "Tried to modify key `current`" warning. Only shared
 * values and module-level constants cross the thread boundary.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";
import { Piece } from "./Piece";
import type { BoardState } from "@tzdraft/mkaguzi-engine";
import { PlayerColor, PieceType } from "@tzdraft/mkaguzi-engine";

// ─── PDN grid ─────────────────────────────────────────────────────────────────
function buildGrid(): (number | null)[][] {
  const grid: (number | null)[][] = [];
  let darkCount = 0;
  for (let r = 0; r < 8; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        darkCount++;
        row.push(33 - darkCount);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

const GRID         = buildGrid();
const GRID_FLIPPED = [...GRID].reverse().map((row) => [...row].reverse());

// ─── Labels ───────────────────────────────────────────────────────────────────
const FILE_LABELS         = ["A", "B", "C", "D", "E", "F", "G", "H"];
const FILE_LABELS_FLIPPED = ["H", "G", "F", "E", "D", "C", "B", "A"];
const RANK_LABELS         = ["8", "7", "6", "5", "4", "3", "2", "1"];
const RANK_LABELS_FLIPPED = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ─── Sizing ───────────────────────────────────────────────────────────────────
const SCREEN_WIDTH   = Dimensions.get("window").width;
const BOARD_PADDING  = 10;
const BOARD_SIZE     = SCREEN_WIDTH - BOARD_PADDING * 2;
const CELL_SIZE      = BOARD_SIZE / 8;
const LABEL_SIZE     = 10;
// outerFrame border (3) + padding (1.5) = 4.5 px offset to board origin
const BOARD_INSET    = 4.5;
// Shorter threshold → ghost tracks sooner; taps stay < 4 px on most devices
const DRAG_THRESHOLD = 4;

// ─── Types ────────────────────────────────────────────────────────────────────
export type HighlightType = "selected" | "destination" | "capturable" | "forced";
export interface LastMove { from: number; to: number; }

interface DraughtsBoardProps {
  board:           BoardState;
  highlights:      Record<number, HighlightType>;
  onSquarePress:   (pdn: number) => void;
  onInvalidPress?: () => void;
  lastMove?:       LastMove | null;
  disabled?:       boolean;
  flipped?:        boolean;
}

// ─── Landing-bounce hook ──────────────────────────────────────────────────────
function useLandingSquare() {
  const [landing, setLanding] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLanding = useCallback((pdn: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLanding(pdn);
    timerRef.current = setTimeout(() => { setLanding(null); timerRef.current = null; }, 220);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { landing, triggerLanding };
}

// ─── Forced-piece pulse ───────────────────────────────────────────────────────
function useForcedPulse(active: boolean) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500 }),
          withTiming(1.0, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
    return () => { opacity.value = 1; };
  }, [active, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── Board shake ──────────────────────────────────────────────────────────────
function useBoardShake() {
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    translateX.value = withSequence(
      withTiming( 8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming( 6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming( 0, { duration: 50 }),
    );
  }, [translateX]);

  return {
    shake,
    shakeStyle: useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function DraughtsBoard({
  board,
  highlights,
  onSquarePress,
  onInvalidPress,
  lastMove = null,
  disabled = false,
  flipped  = false,
}: DraughtsBoardProps) {
  const activeGrid = flipped ? GRID_FLIPPED : GRID;
  const rankLabels = flipped ? RANK_LABELS_FLIPPED : RANK_LABELS;
  const fileLabels = flipped ? FILE_LABELS_FLIPPED : FILE_LABELS;

  const { landing, triggerLanding } = useLandingSquare();

  const pieceMap = useMemo(() => {
    const map = new Map<number, { color: "WHITE" | "BLACK"; isKing: boolean }>();
    board.getAllPieces().forEach((piece) => {
      map.set(piece.position.value, {
        color:  piece.color === PlayerColor.WHITE ? "WHITE" : "BLACK",
        isKing: piece.type  === PieceType.KING,
      });
    });
    return map;
  }, [board]);

  const hasForcedPieces = useMemo(
    () => Object.values(highlights).some((h) => h === "forced"),
    [highlights],
  );
  const forcedPulseStyle = useForcedPulse(hasForcedPieces);
  const { shake, shakeStyle } = useBoardShake();

  // ── Drag React state (JS thread only) ─────────────────────────────────────
  // Drives ghost Piece rendering and source piece identity.
  const [dragInfo, setDragInfo] = useState<{
    pdn: number; color: "WHITE" | "BLACK"; isKing: boolean;
  } | null>(null);

  // ── Shared values (UI thread) ─────────────────────────────────────────────
  const ghostX        = useSharedValue(0);
  const ghostY        = useSharedValue(0);
  // Scale drives the "lift" feel — spring from 1.0 → 1.15 on drag start.
  const ghostScale    = useSharedValue(1);
  // Source piece opacity — fades on UI thread independently of React renders.
  const sourceFade    = useSharedValue(1);
  // Bridge: worklet stores fromPdn here; JS reads it back in callbacks.
  // Negative = no active confirmed drag.
  const fromPdnSV     = useSharedValue(-1);
  // Replaces activeGridRef — never put a ref in a worklet.
  const flippedSV     = useSharedValue(flipped);

  useEffect(() => { flippedSV.value = flipped; }, [flipped, flippedSV]);

  // ── JS-only refs (never passed into worklets) ─────────────────────────────
  const pieceMapRef   = useRef(pieceMap);
  const highlightsRef = useRef(highlights);
  pieceMapRef.current   = pieceMap;
  highlightsRef.current = highlights;

  const handleInvalidPress = useCallback(() => {
    shake();
    onInvalidPress?.();
  }, [shake, onInvalidPress]);

  // ── runOnJS callbacks ─────────────────────────────────────────────────────

  // Called from onStart worklet — confirms this is a real drag.
  const confirmDrag = useCallback(
    (pdn: number) => {
      const info = pieceMapRef.current.get(pdn);
      if (!info) {
        // Dark square but no piece — reset
        fromPdnSV.value = -1;
        ghostScale.value = 1;
        sourceFade.value = 1;
        return;
      }
      setDragInfo({ pdn, ...info });
      onSquarePress(pdn); // select
    },
    [onSquarePress, fromPdnSV, ghostScale, sourceFade],
  );

  // Called from onEnd worklet — resolves the drop.
  const resolveDrop = useCallback(
    (fromPdn: number, bx: number, by: number) => {
      setDragInfo(null);

      const col   = Math.floor(bx / CELL_SIZE);
      const row   = Math.floor(by / CELL_SIZE);
      const toPdn =
        col >= 0 && col <= 7 && row >= 0 && row <= 7
          ? (activeGrid[row]?.[col] ?? null)
          : null;

      if (toPdn !== null && toPdn !== fromPdn) {
        const h = highlightsRef.current[toPdn];
        if (h === "destination" || h === "capturable") triggerLanding(toPdn);
        onSquarePress(toPdn);
      } else {
        onSquarePress(fromPdn); // deselect
        handleInvalidPress();
      }
    },
    [activeGrid, triggerLanding, onSquarePress, handleInvalidPress],
  );

  // Called from onFinalize — always clears React drag state.
  const clearDrag = useCallback(() => { setDragInfo(null); }, []);

  // ── Pan gesture ───────────────────────────────────────────────────────────
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .minDistance(DRAG_THRESHOLD)

        // onBegin: fires on ANY touch. Pre-positions ghost and stores PDN.
        // Does NOT call onSquarePress — taps go through TouchableOpacity only.
        .onBegin((e) => {
          "worklet";
          const col = Math.floor(e.x / CELL_SIZE);
          const row = Math.floor(e.y / CELL_SIZE);
          if (col < 0 || col > 7 || row < 0 || row > 7) return;

          const grid = flippedSV.value ? GRID_FLIPPED : GRID;
          const pdn  = grid[row]?.[col];
          if (pdn == null) return;

          // Snap ghost to square centre — visible only after onStart confirms
          ghostX.value = col * CELL_SIZE;
          ghostY.value = row * CELL_SIZE;
          fromPdnSV.value = pdn;
        })

        // onStart: fires only after minDistance → it IS a drag.
        // Trigger the lift animation and confirm on JS thread.
        .onStart(() => {
          "worklet";
          if (fromPdnSV.value < 0) return;

          // Lift: scale spring feels natural and immediate (UI thread, ~0 lag)
          ghostScale.value = withSpring(1.15, { mass: 0.3, stiffness: 300, damping: 18 });
          // Source piece fades out on UI thread — no JS round-trip needed
          sourceFade.value = withTiming(0.22, { duration: 120 });

          runOnJS(confirmDrag)(fromPdnSV.value);
        })

        // onUpdate: track ghost with finger.
        .onUpdate((e) => {
          "worklet";
          if (fromPdnSV.value < 0) return;
          ghostX.value = e.x - CELL_SIZE / 2;
          ghostY.value = e.y - CELL_SIZE / 2;
        })

        // onEnd: resolve the drop if a drag was active; otherwise no-op
        // (tap path — TouchableOpacity.onPress handles it).
        .onEnd((e) => {
          "worklet";
          const from = fromPdnSV.value;
          if (from < 0) return; // was a tap, not a drag

          // Land animation: spring back to 1× scale
          ghostScale.value = withSpring(1, { mass: 0.3, stiffness: 300, damping: 18 });
          sourceFade.value = withTiming(1, { duration: 150 });
          fromPdnSV.value  = -1;

          runOnJS(resolveDrop)(from, e.x, e.y);
        })

        // onFinalize: safety net — always resets shared values.
        .onFinalize(() => {
          "worklet";
          fromPdnSV.value  = -1;
          ghostScale.value = 1;
          sourceFade.value = 1;
          runOnJS(clearDrag)();
        }),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, confirmDrag, resolveDrop, clearDrag],
  );

  // ── Animated styles ───────────────────────────────────────────────────────

  // Ghost: position + scale spring. Visibility controlled by React (dragInfo).
  // No opacity fade — ghost appears the same frame as the Piece renders.
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
      { scale: ghostScale.value },
    ],
  }));

  // Source fade: applied only to the cell being dragged (isDraggingThis check).
  const sourceFadeStyle = useAnimatedStyle(() => ({
    opacity: sourceFade.value,
  }));

  // ── Tap handler ────────────────────────────────────────────────────────────
  const handlePress = useCallback(
    (pdn: number) => {
      if (disabled) return;
      const h = highlights[pdn];
      if (h === "destination" || h === "capturable") triggerLanding(pdn);
      onSquarePress(pdn);
    },
    [disabled, highlights, triggerLanding, onSquarePress],
  );

  const boardRef = useRef<View>(null);

  return (
    <Animated.View style={[styles.outerFrame, shakeStyle]}>
      <GestureDetector gesture={pan}>
        <View
          ref={boardRef}
          style={styles.board}
          onLayout={() => { boardRef.current?.measure(() => {}); }}
        >
          {activeGrid.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((pdn, colIdx) => {
                const isLight        = (rowIdx + colIdx) % 2 === 0;
                const highlight      = pdn != null ? highlights[pdn] : undefined;
                const piece          = pdn != null ? pieceMap.get(pdn) : undefined;
                const isLastMoveFrom = lastMove != null && pdn === lastMove.from;
                const isLastMoveTo   = lastMove != null && pdn === lastMove.to;
                const isLandingHere  = landing  != null && pdn === landing;
                const isForced       = highlight === "forced";
                const isSelected     = highlight === "selected";
                const isDestination  = highlight === "destination";
                const isCapturable   = highlight === "capturable";
                // React state — always current, no stale closure risk
                const isDraggingThis = dragInfo?.pdn === pdn;

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
                    {colIdx === 0 && (
                      <Text style={[styles.rankLabel, { color: isLight ? colors.boardDark : colors.boardLight }]}>
                        {rankLabels[rowIdx]}
                      </Text>
                    )}
                    {rowIdx === 7 && (
                      <Text style={[styles.fileLabel, { color: isLight ? colors.boardDark : colors.boardLight }]}>
                        {fileLabels[colIdx]}
                      </Text>
                    )}

                    {(isLastMoveFrom || isLastMoveTo) && !isLight && (
                      <View
                        style={[StyleSheet.absoluteFill, isLastMoveTo ? styles.lastMoveToTint : styles.lastMoveFromTint]}
                        pointerEvents="none"
                      />
                    )}
                    {isSelected && !isLight && (
                      <View style={[StyleSheet.absoluteFill, styles.selectedOverlay]} pointerEvents="none" />
                    )}
                    {isDestination && !piece && (
                      <View style={styles.legalMoveIndicator} pointerEvents="none" />
                    )}
                    {dragInfo != null && isDestination && !piece && (
                      <View style={[StyleSheet.absoluteFill, styles.dropZoneOverlay]} pointerEvents="none" />
                    )}
                    {piece && isForced && (
                      <Animated.View
                        style={[StyleSheet.absoluteFill, styles.forcedRing, forcedPulseStyle]}
                        pointerEvents="none"
                      />
                    )}
                    {piece && (
                      // sourceFadeStyle animates on UI thread; isDraggingThis gates it
                      <Animated.View
                        style={isDraggingThis ? sourceFadeStyle : undefined}
                        pointerEvents="none"
                      >
                        <Piece
                          color={piece.color}
                          isKing={piece.isKing}
                          isSelected={isSelected && !isDraggingThis}
                          isLanding={isLandingHere && !isDraggingThis}
                          size={CELL_SIZE}
                        />
                      </Animated.View>
                    )}
                    {isCapturable && piece && (
                      <View style={[StyleSheet.absoluteFill, styles.capturableRing]} pointerEvents="none" />
                    )}
                    {isDestination && piece && (
                      <View style={[StyleSheet.absoluteFill, styles.destinationOnPiece]} pointerEvents="none" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={styles.vignette} pointerEvents="none" />
        </View>
      </GestureDetector>

      {/* Ghost — outside overflow:hidden, never clips.
          Rendered only when dragInfo is set (guarantees Piece is mounted
          before ghost is visible — no empty-ghost flash). */}
      {dragInfo && (
        <Animated.View style={[styles.ghost, ghostStyle]} pointerEvents="none">
          <Piece
            color={dragInfo.color}
            isKing={dragInfo.isKing}
            isSelected
            size={CELL_SIZE}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerFrame: {
    width: BOARD_SIZE + 6, height: BOARD_SIZE + 6,
    borderRadius: 10, borderWidth: 3,
    borderColor: "rgba(139,105,20,0.75)",
    backgroundColor: "#1e1b18",
    padding: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 12,
    elevation: 10,
    alignSelf: "center",
  },
  board: {
    width: BOARD_SIZE, height: BOARD_SIZE,
    borderRadius: 6, overflow: "hidden",
  },
  row:  { flexDirection: "row" },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: "center", justifyContent: "center",
  },
  rankLabel: {
    position: "absolute", top: 2, left: 2,
    fontSize: LABEL_SIZE, fontWeight: "bold", lineHeight: LABEL_SIZE, zIndex: 5,
  },
  fileLabel: {
    position: "absolute", bottom: 2, right: 2,
    fontSize: LABEL_SIZE, fontWeight: "bold", lineHeight: LABEL_SIZE, zIndex: 5,
  },
  lastMoveFromTint:   { backgroundColor: "rgba(245,158,11,0.12)" },
  lastMoveToTint:     { backgroundColor: "rgba(245,158,11,0.22)" },
  selectedOverlay:    { backgroundColor: "rgba(250,204,21,0.35)" },
  dropZoneOverlay:    { backgroundColor: "rgba(52,211,153,0.18)" },
  legalMoveIndicator: {
    width: "34%", height: "34%", borderRadius: 100,
    backgroundColor: "rgba(52,211,153,0.70)",
  },
  capturableRing: {
    borderRadius: CELL_SIZE / 2, borderWidth: 3,
    borderColor: "rgba(52,211,153,0.70)",
  },
  destinationOnPiece: {
    borderRadius: CELL_SIZE / 2, borderWidth: 3,
    borderColor: "rgba(52,211,153,0.70)",
  },
  forcedRing: {
    borderRadius: CELL_SIZE * 0.42, borderWidth: 2,
    borderColor: "rgba(251,146,60,0.80)",
    shadowColor: "rgba(251,146,60,1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 7,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 24,
  },
  ghost: {
    position: "absolute",
    width: CELL_SIZE, height: CELL_SIZE,
    top: BOARD_INSET, left: BOARD_INSET,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7, shadowRadius: 24,
    elevation: 24,
    alignItems: "center", justifyContent: "center",
  },
});
