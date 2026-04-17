/**
 * mkaguzi-mobile.ts
 *
 * WebView-based bridge to the Mkaguzi WASM engine.
 *
 * Usage:
 *   1. Mount <MkaguziProvider> once near the root of the app (in _layout.tsx).
 *      It renders a hidden WebView that hosts the WASM engine.
 *   2. In any game screen, call useMkaguzi() to get typed engine methods.
 *
 * Protocol:
 *   RN → WebView:  JSON string  { id, type, payload }
 *   WebView → RN:  JSON string  { id, result }
 *                               { type: "ready" }
 *                               { type: "error", message }
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { BRIDGE_HTML } from "./wasm-bridge-html";
import type { RawMove, RawSearchResult, RawGameResult } from "./bridge-types";

// ─── Re-export bridge types so callers don't need a second import ─────────────
export type { RawMove, RawSearchResult, RawGameResult };

// ─── Simple counter-based ID generator (no uuid dep needed) ──────────────────
let _msgId = 0;
function nextId(): string {
  return String(++_msgId);
}

// ─── Pending promise map ──────────────────────────────────────────────────────
type Resolver = { resolve: (v: unknown) => void; reject: (e: Error) => void };
const pending = new Map<string, Resolver>();

const REQUEST_TIMEOUT_MS = 15_000;

// ─── Context ──────────────────────────────────────────────────────────────────
interface MkaguziContextValue {
  isReady: boolean;
  initError: string | null;
  generateMoves: (fen: string) => Promise<RawMove[]>;
  applyMove: (fen: string, from: number, to: number) => Promise<string>;
  search: (
    fen: string,
    history: string[],
    timeMs: number,
    depth: number,
    level: number,
    randomness: number,
  ) => Promise<RawSearchResult | null>;
  gameResult: (
    fen: string,
    fiftyMoves: number,
    threeKingsCount: number,
    endgameCount: number,
  ) => Promise<RawGameResult>;
}

const MkaguziContext = createContext<MkaguziContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MkaguziProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const send = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    <T,>(type: string, payload: Record<string, unknown>): Promise<T> => {
      const id = nextId();
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        const timeoutHandle = setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error(`Mkaguzi request "${type}" timed out`));
          }
        }, REQUEST_TIMEOUT_MS);
        // Wrap timeout cleanup into resolve/reject
        const originalResolve = resolve;
        const originalReject = reject;
        pending.set(id, {
          resolve: (v) => { clearTimeout(timeoutHandle); originalResolve(v as T); },
          reject:  (e) => { clearTimeout(timeoutHandle); originalReject(e); },
        });
        webViewRef.current?.postMessage(JSON.stringify({ id, type, payload }));
      });
    },
    [],
  );

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (msg.type === "ready") {
      setIsReady(true);
      return;
    }
    if (msg.type === "error") {
      const errMsg = String(msg.message ?? "unknown error");
      console.error("[MkaguziBridge] Engine init error:", errMsg);
      setInitError(errMsg);
      return;
    }

    const id = msg.id as string;
    const cb = pending.get(id);
    if (!cb) return;
    pending.delete(id);

    if ("error" in msg) {
      cb.reject(new Error(msg.error as string));
    } else {
      cb.resolve(msg.result);
    }
  }, []);

  const generateMoves = useCallback(
    (fen: string) => send<RawMove[]>("generateMoves", { fen }),
    [send],
  );

  const applyMove = useCallback(
    (fen: string, from: number, to: number) =>
      send<string>("applyMove", { fen, from, to }),
    [send],
  );

  const search = useCallback(
    (
      fen: string,
      history: string[],
      timeMs: number,
      depth: number,
      level: number,
      randomness: number,
    ) =>
      send<RawSearchResult | null>("search", {
        fen,
        history,
        timeMs,
        depth,
        level,
        randomness,
      }),
    [send],
  );

  const gameResult = useCallback(
    (
      fen: string,
      fiftyMoves: number,
      threeKingsCount: number,
      endgameCount: number,
    ) =>
      send<RawGameResult>("gameResult", {
        fen,
        fiftyMoves,
        threeKingsCount,
        endgameCount,
      }),
    [send],
  );

  const value: MkaguziContextValue = {
    isReady,
    initError,
    generateMoves,
    applyMove,
    search,
    gameResult,
  };

  return (
    <MkaguziContext.Provider value={value}>
      {/* Hidden WebView — positioned behind all app content */}
      <View style={styles.hidden} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ html: BRIDGE_HTML }}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={["*"]}
          // Suppress white flash on Android during load
          style={{ backgroundColor: "transparent" }}
        />
      </View>
      {children}
    </MkaguziContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMkaguzi(): MkaguziContextValue {
  const ctx = useContext(MkaguziContext);
  if (!ctx) {
    throw new Error("useMkaguzi must be used inside <MkaguziProvider>");
  }
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    // zIndex -1 avoids GPU layer on Android; opacity:0 would still composite
    zIndex: -1,
  },
});
