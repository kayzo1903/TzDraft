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
export {};
//# sourceMappingURL=search-worker.d.ts.map