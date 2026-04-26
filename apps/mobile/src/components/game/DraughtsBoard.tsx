/**
 * DraughtsBoard.tsx — Skia Canvas renderer
 *
 * Same props interface as the previous View-based version. Drop-in replacement.
 *
 * Architecture:
 *   Animated.View (shake)
 *     GestureDetector (Simultaneous tap + pan)
 *       Canvas  ← single GPU draw pass for squares + highlights + pieces
 *     Animated.View ghost piece (Reanimated UI thread — unchanged from before)
 *
 * Thread contract:
 *   UI thread  — shared values (ghost pos, source fade, forced opacity) drive
 *                canvas repaints directly; no JS round-trip per animation frame.
 *   JS thread  — React state (board, highlights, dragPdn) drives the canvas
 *                JSX tree; reconciles ~once per move or tap, not per frame.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  Text as RNText,
} from "react-native";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { colors } from "../../theme/colors";
import { Piece } from "./Piece";
import type { BoardState } from "@tzdraft/mkaguzi-engine";
import { PlayerColor, PieceType } from "@tzdraft/mkaguzi-engine";

// ─── Grid ──────────────────────────────────────────────────────────────────────
function buildGrid(): (number | null)[][] {
  const grid: (number | null)[][] = [];
  let dark = 0;
  for (let r = 0; r < 8; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 8; c++) {
      row.push((r + c) % 2 !== 0 ? 33 - ++dark : null);
    }
    grid.push(row);
  }
  return grid;
}

const GRID         = buildGrid();
const GRID_FLIPPED = [...GRID].reverse().map((row) => [...row].reverse());

const FILE_LABELS         = ["A", "B", "C", "D", "E", "F", "G", "H"];
const FILE_LABELS_FLIPPED = ["H", "G", "F", "E", "D", "C", "B", "A"];
const RANK_LABELS         = ["8", "7", "6", "5", "4", "3", "2", "1"];
const RANK_LABELS_FLIPPED = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ─── Sizing ────────────────────────────────────────────────────────────────────
const SCREEN_WIDTH   = Dimensions.get("window").width;
const BOARD_PADDING  = 10;
const BOARD_SIZE     = SCREEN_WIDTH - BOARD_PADDING * 2;
const CELL_SIZE      = BOARD_SIZE / 8;
const PIECE_RADIUS   = CELL_SIZE * 0.41;
const BOARD_INSET    = 4.5;
const DRAG_THRESHOLD = 4;

// Crown sizing mirrors Piece.tsx: svg width 24, rendered at diameter * 0.46
const CROWN_SCALE  = (CELL_SIZE * 0.82 * 0.46) / 24;

// ─── Crown path — built once, centered at (0,0), scaled ───────────────────────
// Original SVG "M3 18h18l-1.5-9-4.5 4.5L12 6l-3 7.5L4.5 9 3 18z" in 24×24 box.
// Transform: subtract center (12,12), multiply by CROWN_SCALE.
function buildCrownPath(): ReturnType<typeof Skia.Path.Make> {
  const s = CROWN_SCALE;
  const p = Skia.Path.Make();
  p.moveTo(-9 * s,    6 * s);
  p.lineTo( 9 * s,    6 * s);
  p.lineTo( 7.5 * s, -3 * s);
  p.lineTo( 3 * s,    1.5 * s);
  p.lineTo( 0,       -6 * s);
  p.lineTo(-3 * s,    1.5 * s);
  p.lineTo(-7.5 * s, -3 * s);
  p.close();
  return p;
}
const CROWN_PATH = buildCrownPath();

// ─── PDN → {row, col} maps ─────────────────────────────────────────────────────
function buildPdnToCell(
  grid: (number | null)[][],
): Map<number, { row: number; col: number }> {
  const map = new Map<number, { row: number; col: number }>();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const pdn = grid[r][c];
      if (pdn != null) map.set(pdn, { row: r, col: c });
    }
  return map;
}
const PDN_TO_CELL         = buildPdnToCell(GRID);
const PDN_TO_CELL_FLIPPED = buildPdnToCell(GRID_FLIPPED);

// ─── Types ─────────────────────────────────────────────────────────────────────
export type HighlightType = "selected" | "destination" | "capturable" | "forced";
export interface LastMove  { from: number; to: number; }

interface DraughtsBoardProps {
  board:           BoardState;
  highlights:      Record<number, HighlightType>;
  onSquarePress:   (pdn: number) => void;
  onInvalidPress?: () => void;
  lastMove?:       LastMove | null;
  disabled?:       boolean;
  flipped?:        boolean;
}

// ─── Landing-bounce hook ───────────────────────────────────────────────────────
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

// ─── Board shake hook ──────────────────────────────────────────────────────────
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
    shakeStyle: useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    })),
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function DraughtsBoard({
  board,
  highlights,
  onSquarePress,
  onInvalidPress,
  lastMove  = null,
  disabled  = false,
  flipped   = false,
}: DraughtsBoardProps) {
  const activeGrid = flipped ? GRID_FLIPPED : GRID;
  const pdnToCell  = flipped ? PDN_TO_CELL_FLIPPED : PDN_TO_CELL;
  const rankLabels = flipped ? RANK_LABELS_FLIPPED : RANK_LABELS;
  const fileLabels = flipped ? FILE_LABELS_FLIPPED : FILE_LABELS;

  const { landing, triggerLanding } = useLandingSquare();
  const { shake, shakeStyle }       = useBoardShake();

  // dragPdn: only piece identity for ghost rendering (React state, not shared value)
  const [dragPdn, setDragPdn] = useState<number | null>(null);

  // ── Shared values (UI thread) ────────────────────────────────────────────────
  const ghostX        = useSharedValue(0);
  const ghostY        = useSharedValue(0);
  const ghostScale    = useSharedValue(1);
  const sourceFade    = useSharedValue(1);
  const fromPdnSV     = useSharedValue(-1);
  const flippedSV     = useSharedValue(flipped);
  const forcedOpacity = useSharedValue(1);

  useEffect(() => { flippedSV.value = flipped; }, [flipped, flippedSV]);

  // ── Forced pulse ─────────────────────────────────────────────────────────────
  const hasForcedPieces = useMemo(
    () => Object.values(highlights).some((h) => h === "forced"),
    [highlights],
  );
  useEffect(() => {
    if (hasForcedPieces) {
      forcedOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500 }),
          withTiming(1.0, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      forcedOpacity.value = withTiming(1, { duration: 200 });
    }
    return () => { forcedOpacity.value = 1; };
  }, [hasForcedPieces, forcedOpacity]);

  // ── Piece map ─────────────────────────────────────────────────────────────────
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

  const pieces = useMemo(() => Array.from(pieceMap.entries()), [pieceMap]);

  // JS-only refs — never passed into worklets
  const pieceMapRef   = useRef(pieceMap);
  const highlightsRef = useRef(highlights);
  pieceMapRef.current   = pieceMap;
  highlightsRef.current = highlights;

  // ── Ghost animated style ──────────────────────────────────────────────────────
  const ghostAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value    },
      { translateY: ghostY.value    },
      { scale:      ghostScale.value },
    ],
  }));

  // ── Callbacks ─────────────────────────────────────────────────────────────────
  const handleInvalidPress = useCallback(() => {
    shake();
    onInvalidPress?.();
  }, [shake, onInvalidPress]);

  const handleTap = useCallback((pdn: number) => {
    const h = highlightsRef.current[pdn];
    if (h === "destination" || h === "capturable") triggerLanding(pdn);
    onSquarePress(pdn);
  }, [triggerLanding, onSquarePress]);

  const confirmDrag = useCallback((pdn: number) => {
    if (!pieceMapRef.current.has(pdn)) {
      fromPdnSV.value  = -1;
      ghostScale.value = 1;
      sourceFade.value = 1;
      return;
    }
    setDragPdn(pdn);
    onSquarePress(pdn);
  }, [onSquarePress, fromPdnSV, ghostScale, sourceFade]);

  const resolveDrop = useCallback((fromPdn: number, bx: number, by: number) => {
    setDragPdn(null);
    const grid  = flipped ? GRID_FLIPPED : GRID;
    const col   = Math.floor(bx / CELL_SIZE);
    const row   = Math.floor(by / CELL_SIZE);
    const toPdn = col >= 0 && col <= 7 && row >= 0 && row <= 7
      ? (grid[row]?.[col] ?? null) : null;
    if (toPdn !== null && toPdn !== fromPdn) {
      const h = highlightsRef.current[toPdn];
      if (h === "destination" || h === "capturable") triggerLanding(toPdn);
      onSquarePress(toPdn);
    } else {
      onSquarePress(fromPdn);
      handleInvalidPress();
    }
  }, [flipped, triggerLanding, onSquarePress, handleInvalidPress]);

  const clearDrag = useCallback(() => { setDragPdn(null); }, []);

  // ── Tap gesture ───────────────────────────────────────────────────────────────
  const tap = useMemo(() =>
    Gesture.Tap()
      .enabled(!disabled)
      .maxDistance(DRAG_THRESHOLD)
      .onEnd((e) => {
        "worklet";
        const col = Math.floor(e.x / CELL_SIZE);
        const row = Math.floor(e.y / CELL_SIZE);
        if (col < 0 || col > 7 || row < 0 || row > 7) {
          runOnJS(handleInvalidPress)();
          return;
        }
        const grid = flippedSV.value ? GRID_FLIPPED : GRID;
        const pdn  = grid[row]?.[col];
        if (pdn == null) { runOnJS(handleInvalidPress)(); return; }
        runOnJS(handleTap)(pdn);
      }),
    [disabled, handleInvalidPress, handleTap, flippedSV],
  );

  // ── Pan gesture ───────────────────────────────────────────────────────────────
  const pan = useMemo(() =>
    Gesture.Pan()
      .enabled(!disabled)
      .minDistance(DRAG_THRESHOLD)
      .onBegin((e) => {
        "worklet";
        const col = Math.floor(e.x / CELL_SIZE);
        const row = Math.floor(e.y / CELL_SIZE);
        if (col < 0 || col > 7 || row < 0 || row > 7) return;
        const grid = flippedSV.value ? GRID_FLIPPED : GRID;
        const pdn  = grid[row]?.[col];
        if (pdn == null) return;
        ghostX.value    = col * CELL_SIZE;
        ghostY.value    = row * CELL_SIZE;
        fromPdnSV.value = pdn;
      })
      .onStart(() => {
        "worklet";
        if (fromPdnSV.value < 0) return;
        ghostScale.value = withSpring(1.15, { mass: 0.3, stiffness: 300, damping: 18 });
        sourceFade.value = withTiming(0.22, { duration: 120 });
        runOnJS(confirmDrag)(fromPdnSV.value);
      })
      .onUpdate((e) => {
        "worklet";
        if (fromPdnSV.value < 0) return;
        ghostX.value = e.x - CELL_SIZE / 2;
        ghostY.value = e.y - CELL_SIZE / 2;
      })
      .onEnd((e) => {
        "worklet";
        const from = fromPdnSV.value;
        if (from < 0) return;
        ghostScale.value = withSpring(1, { mass: 0.3, stiffness: 300, damping: 18 });
        sourceFade.value = withTiming(1, { duration: 150 });
        fromPdnSV.value  = -1;
        runOnJS(resolveDrop)(from, e.x, e.y);
      })
      .onFinalize(() => {
        "worklet";
        fromPdnSV.value  = -1;
        ghostScale.value = 1;
        sourceFade.value = 1;
        runOnJS(clearDrag)();
      }),
    [disabled, confirmDrag, resolveDrop, clearDrag, flippedSV,
     ghostX, ghostY, ghostScale, sourceFade, fromPdnSV],
  );

  const gesture = useMemo(
    () => Gesture.Simultaneous(tap, pan),
    [tap, pan],
  );

  const ghostPiece = dragPdn != null ? pieceMap.get(dragPdn) : null;

  // Precompute highlight arrays for rendering (avoids Object.entries() churn in JSX)
  const highlightEntries = useMemo(
    () => Object.entries(highlights).map(([k, v]) => ({ pdn: parseInt(k, 10), type: v })),
    [highlights],
  );

  return (
    <Animated.View style={[styles.outerFrame, shakeStyle]}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.board}>

          {/* ── Squares ── */}
          {activeGrid.map((row, ri) =>
            row.map((_, ci) => {
              const isLight = (ri + ci) % 2 === 0;
              return (
                <Rect
                  key={`sq${ri}${ci}`}
                  x={ci * CELL_SIZE}
                  y={ri * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  color={isLight ? colors.boardLight : colors.boardDark}
                />
              );
            }),
          )}

          {/* ── Last move tints ── */}
          {lastMove && (() => {
            const fc = pdnToCell.get(lastMove.from);
            const tc = pdnToCell.get(lastMove.to);
            return (
              <>
                {fc && <Rect x={fc.col * CELL_SIZE} y={fc.row * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} color="rgba(245,158,11,0.12)" />}
                {tc && <Rect x={tc.col * CELL_SIZE} y={tc.row * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} color="rgba(245,158,11,0.22)" />}
              </>
            );
          })()}

          {/* ── Selection overlay ── */}
          {highlightEntries.map(({ pdn, type }) => {
            if (type !== "selected") return null;
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            return (
              <Rect
                key={`sel${pdn}`}
                x={cell.col * CELL_SIZE} y={cell.row * CELL_SIZE}
                width={CELL_SIZE} height={CELL_SIZE}
                color="rgba(250,204,21,0.35)"
              />
            );
          })}

          {/* ── Legal move dots (empty destination squares) ── */}
          {highlightEntries.map(({ pdn, type }) => {
            if (type !== "destination" || pieceMap.has(pdn)) return null;
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            const cx = cell.col * CELL_SIZE + CELL_SIZE / 2;
            const cy = cell.row * CELL_SIZE + CELL_SIZE / 2;
            return (
              <Circle key={`dot${pdn}`} cx={cx} cy={cy} r={CELL_SIZE * 0.17} color="rgba(52,211,153,0.70)" />
            );
          })}

          {/* ── Drop-zone overlay (during drag) ── */}
          {dragPdn != null && highlightEntries.map(({ pdn, type }) => {
            if (type !== "destination" || pieceMap.has(pdn)) return null;
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            return (
              <Rect
                key={`dz${pdn}`}
                x={cell.col * CELL_SIZE} y={cell.row * CELL_SIZE}
                width={CELL_SIZE} height={CELL_SIZE}
                color="rgba(52,211,153,0.18)"
              />
            );
          })}

          {/* ── Pieces ── */}
          {pieces.map(([pdn, piece]) => {
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            const cx         = cell.col * CELL_SIZE + CELL_SIZE / 2;
            const cy         = cell.row * CELL_SIZE + CELL_SIZE / 2;
            const isWhite    = piece.color === "WHITE";
            const isSelected = highlights[pdn] === "selected";
            const isLanding  = landing === pdn;
            const isDragging = dragPdn === pdn;
            const scale      = isSelected && !isDragging ? 1.12
                             : isLanding  && !isDragging ? 1.08 : 1.0;
            const r          = PIECE_RADIUS * scale;

            return (
              <Group key={`piece${pdn}`} opacity={isDragging ? sourceFade : 1}>
                {/* Drop shadow */}
                <Circle cx={cx} cy={cy + 3} r={r} color={isWhite ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.55)"} />

                {/* Main disc with gradient */}
                <Circle cx={cx} cy={cy} r={r}>
                  <LinearGradient
                    start={vec(cx - r * 0.5, cy - r * 0.5)}
                    end={vec(cx + r * 0.5, cy + r * 0.5)}
                    colors={
                      isWhite
                        ? ["#ffffff", "#e2dfdb", "#c8c3bc"]
                        : ["#4b4742", "#2a2623", "#141210"]
                    }
                  />
                </Circle>

                {/* Rim ring */}
                <Circle
                  cx={cx} cy={cy} r={r * 0.93}
                  style="stroke" strokeWidth={1.5}
                  color={isWhite ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.10)"}
                />

                {/* Specular highlight */}
                <Circle
                  cx={cx - r * 0.12} cy={cy - r * 0.40}
                  r={r * 0.28}
                  color={isWhite ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)"}
                />

                {/* King crown */}
                {piece.isKing && (
                  <Path
                    path={CROWN_PATH}
                    color={isWhite ? "rgba(30,20,5,0.85)" : "rgba(255,220,100,0.90)"}
                    transform={[{ translateX: cx }, { translateY: cy }]}
                  />
                )}

                {/* Selection glow ring */}
                {isSelected && !isDragging && (
                  <Circle
                    cx={cx} cy={cy} r={r}
                    style="stroke" strokeWidth={2.5}
                    color="rgba(250,204,21,0.75)"
                  />
                )}
              </Group>
            );
          })}

          {/* ── Capturable / destination-on-piece rings ── */}
          {highlightEntries.map(({ pdn, type }) => {
            if ((type !== "capturable" && type !== "destination") || !pieceMap.has(pdn)) return null;
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            const cx = cell.col * CELL_SIZE + CELL_SIZE / 2;
            const cy = cell.row * CELL_SIZE + CELL_SIZE / 2;
            return (
              <Circle
                key={`ring${pdn}`}
                cx={cx} cy={cy} r={PIECE_RADIUS}
                style="stroke" strokeWidth={3}
                color="rgba(52,211,153,0.70)"
              />
            );
          })}

          {/* ── Forced piece rings (animated opacity via shared value) ── */}
          {highlightEntries.map(({ pdn, type }) => {
            if (type !== "forced") return null;
            const cell = pdnToCell.get(pdn);
            if (!cell) return null;
            const cx = cell.col * CELL_SIZE + CELL_SIZE / 2;
            const cy = cell.row * CELL_SIZE + CELL_SIZE / 2;
            return (
              <Circle
                key={`forced${pdn}`}
                cx={cx} cy={cy} r={PIECE_RADIUS * 0.92}
                style="stroke" strokeWidth={2}
                color="rgba(251,146,60,0.80)"
                opacity={forcedOpacity}
              />
            );
          })}

        </Canvas>
      </GestureDetector>

      {/* Ghost piece overlay — Reanimated, UI thread, same as before */}
      {ghostPiece && (
        <Animated.View style={[styles.ghost, ghostAnimStyle]} pointerEvents="none">
          <Piece
            color={ghostPiece.color}
            isKing={ghostPiece.isKing}
            isSelected
            size={CELL_SIZE}
          />
        </Animated.View>
      )}

      {/* Board coordinate labels — static RN Text, never re-renders */}
      <View style={styles.rankLabelContainer} pointerEvents="none">
        {rankLabels.map((label, i) => (
          <RNText
            key={i}
            style={[
              styles.rankLabel,
              {
                top:   BOARD_INSET + i * CELL_SIZE + 2,
                color: i % 2 === 0 ? colors.boardDark : colors.boardLight,
              },
            ]}
          >
            {label}
          </RNText>
        ))}
      </View>
      <View style={styles.fileLabelContainer} pointerEvents="none">
        {fileLabels.map((label, i) => (
          <RNText
            key={i}
            style={[
              styles.fileLabel,
              {
                left:  BOARD_INSET + i * CELL_SIZE + CELL_SIZE - 10,
                color: i % 2 === 0 ? colors.boardLight : colors.boardDark,
              },
            ]}
          >
            {label}
          </RNText>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerFrame: {
    width: BOARD_SIZE + 6,
    height: BOARD_SIZE + 6,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "rgba(139,105,20,0.75)",
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
  ghost: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    top: BOARD_INSET,
    left: BOARD_INSET,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabelContainer: {
    position: "absolute",
    top: 0,
    left: BOARD_INSET,
  },
  rankLabel: {
    position: "absolute",
    left: 2,
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 10,
    zIndex: 5,
  },
  fileLabelContainer: {
    position: "absolute",
    bottom: BOARD_INSET,
    left: 0,
  },
  fileLabel: {
    position: "absolute",
    bottom: 2,
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 10,
    zIndex: 5,
  },
});
