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
import { initEngine, wasmSearch } from './wasm-bridge.js';
let ready = false;
self.onmessage = async (event) => {
    const msg = event.data;
    if (msg.type === 'init') {
        try {
            await initEngine(msg.wasmJsUrl);
            ready = true;
            self.postMessage({ type: 'ready' });
        }
        catch (err) {
            self.postMessage({ type: 'error', id: 'init', message: String(err) });
        }
        return;
    }
    if (msg.type === 'search') {
        const id = msg.id;
        if (!ready) {
            self.postMessage({ type: 'error', id, message: 'Engine not initialised' });
            return;
        }
        try {
            const result = wasmSearch(msg.fen, msg.history ?? [], msg.timeMs ?? 2000, msg.depth ?? 0, msg.level ?? 19, msg.randomness ?? 0);
            self.postMessage({ type: 'result', id, move: result });
        }
        catch (err) {
            self.postMessage({ type: 'error', id, message: String(err) });
        }
        return;
    }
};
//# sourceMappingURL=search-worker.js.map