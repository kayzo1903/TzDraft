/**
 * bridge-types.ts
 * Raw result shapes returned by the Mkaguzi WASM C API (via WebView bridge).
 * Mirrors the types defined in packages/mkaguzi-engine/src/wasm-bridge.ts.
 */

export interface RawMove {
  from: number;       // PDN 1-based
  to: number;         // PDN 1-based
  captures: number[]; // PDN 1-based captured squares
  promote: boolean;
}

export interface RawSearchResult extends RawMove {
  score: number;
  depth: number;
  nodes: number;
}

export type GameResultStatus = "ongoing" | "win" | "draw";

export interface RawGameResult {
  status: GameResultStatus;
  winner?: "white" | "black" | "none";
  reason?: string;
}
