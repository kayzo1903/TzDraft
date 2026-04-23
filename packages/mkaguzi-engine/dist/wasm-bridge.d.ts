/**
 * wasm-bridge.ts
 *
 * Loads the Mkaguzi WASM module and provides typed wrappers around the
 * exported C functions (mkz_*).
 *
 * Convention note
 * ───────────────
 * The app uses a top-oriented board convention: WHITE pieces start at
 * PDN 1-12 (top) and promote at PDN 29-32 (bottom).
 * Mkaguzi uses the "International" orientation: WHITE pieces start at PDN
 * 21-32 (bottom) and promote at PDN 1-4 (top).
 *
 * The square NUMBERS (1-32) refer to the same physical squares in both
 * systems, but the COLOR LABELS are inverted.  Fix: swap W↔B and flip the
 * side-to-move before passing any FEN to the WASM, then swap back on output.
 * The move from/to square numbers need NO conversion — they're just PDN 1-32.
 *
 * Public API
 * ──────────
 * initEngine(wasmJsUrl)      — load the module once; must be called before any op
 * isEngineReady()            — true after initEngine resolves
 * wasmGenerateMoves(fen)     — all legal moves for the current side-to-move
 * wasmApplyMove(fen,f,t)     — apply move, return new FEN (app convention)
 * wasmSearch(...)            — best move from Mkaguzi search
 * wasmGameResult(...)        — win/draw/ongoing result
 */
/**
 * Load the Mkaguzi WASM module.
 *
 * @param wasmJsUrl  URL to the Emscripten glue JS, e.g. '/wasm/mkaguzi_wasm.js'
 *                   The .wasm file must be at the same URL with .js → .wasm.
 */
export declare function initEngine(wasmJsUrl?: string): Promise<void>;
export declare function isEngineReady(): boolean;
/**
 * Convert an app-convention FEN to Mkaguzi-convention FEN.
 * App WHITE = Mkaguzi BLACK (both at PDN 1-12, top of board).
 * Operation is symmetric — applying it twice returns the original.
 */
export declare function appFenToMkaguziFen(appFen: string): string;
export interface RawMove {
    from: number;
    to: number;
    captures: number[];
    promote: boolean;
}
export interface RawSearchResult extends RawMove {
    score: number;
    depth: number;
    nodes: number;
}
export type GameResultStatus = 'ongoing' | 'win' | 'draw';
export interface RawGameResult {
    status: GameResultStatus;
    winner?: 'white' | 'black' | 'none';
    reason?: string;
}
/**
 * Generate all legal moves for the side-to-move in the given app-convention FEN.
 * The FEN's leading W/B character determines whose turn it is.
 */
export declare function wasmGenerateMoves(appFen: string): RawMove[];
/**
 * Apply a move and return the resulting position as an app-convention FEN.
 *
 * @param appFen    Current position in app convention
 * @param fromPdn   Source square (PDN 1-32)
 * @param toPdn     Destination square (PDN 1-32)
 * @returns New app-convention FEN, or '' if the move is illegal.
 */
export declare function wasmApplyMove(appFen: string, fromPdn: number, toPdn: number): string;
/**
 * Run a search and return the best move.
 *
 * @param appFen        Current position in app convention
 * @param history       Array of prior app-convention FENs (for repetition detection)
 * @param timeMs        Time budget in ms (0 = use depth)
 * @param depth         Max search depth (0 = use timeMs, default 20)
 * @param level         Strength 15-19 (19 = max)
 * @param randomness    Eval noise in centipawns (0 = deterministic)
 * @returns Best move, or null if no legal moves.
 */
export declare function wasmSearch(appFen: string, history: string[], timeMs?: number, depth?: number, level?: number, randomness?: number): RawSearchResult | null;
/**
 * Evaluate the game result for the given position.
 *
 * @param appFen            Current position in app convention (side-to-move included)
 * @param fiftyMoves        Reversible-move counter (Art 8.3: 30-move rule)
 * @param threeKingsCount   Moves in 3K-vs-1K endgame (Art 8.5)
 * @param endgameCount      Moves in K+Man vs K / 2K vs K endgame (Art 8.4)
 */
export declare function wasmGameResult(appFen: string, fiftyMoves?: number, threeKingsCount?: number, endgameCount?: number): RawGameResult;
//# sourceMappingURL=wasm-bridge.d.ts.map