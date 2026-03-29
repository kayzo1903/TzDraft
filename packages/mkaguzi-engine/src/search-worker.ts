/**
 * search-worker.ts — Web Worker script for off-main-thread Mkaguzi search.
 *
 * This file is compiled separately and served as a Worker.
 * The main thread spawns it via `new Worker('/wasm/search-worker.js')` and
 * communicates via postMessage.
 *
 * Message protocol (main → worker):
 *   { type: 'init',   wasmJsUrl: string }
 *   { type: 'search', id: string, fen: string, history: string[],
 *                     timeMs: number, depth: number, level: number, randomness: number }
 *
 * Message protocol (worker → main):
 *   { type: 'ready' }
 *   { type: 'result', id: string, move: RawSearchResult | null }
 *   { type: 'error',  id: string, message: string }
 */

import { initEngine, wasmSearch, RawSearchResult } from './wasm-bridge.js';

let ready = false;

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data as Record<string, unknown>;

  if (msg.type === 'init') {
    try {
      await initEngine(msg.wasmJsUrl as string);
      ready = true;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', id: 'init', message: String(err) });
    }
    return;
  }

  if (msg.type === 'search') {
    const id = msg.id as string;
    if (!ready) {
      self.postMessage({ type: 'error', id, message: 'Engine not initialised' });
      return;
    }
    try {
      const result: RawSearchResult | null = wasmSearch(
        msg.fen as string,
        (msg.history as string[]) ?? [],
        (msg.timeMs as number) ?? 2000,
        (msg.depth as number) ?? 0,
        (msg.level as number) ?? 19,
        (msg.randomness as number) ?? 0,
      );
      self.postMessage({ type: 'result', id, move: result });
    } catch (err) {
      self.postMessage({ type: 'error', id, message: String(err) });
    }
    return;
  }
};
