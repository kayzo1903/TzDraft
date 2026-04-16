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

// ─────────────────────────────────────────────────────────────────────────────
// Emscripten module interface
// ─────────────────────────────────────────────────────────────────────────────

type CcallType = 'number' | 'string' | 'array' | 'boolean' | null;

interface MkaguziWasm {
  ccall(
    ident: string,
    returnType: CcallType,
    argTypes: CcallType[],
    args: unknown[],
  ): unknown;
  cwrap(
    ident: string,
    returnType: CcallType,
    argTypes: CcallType[],
  ): (...args: unknown[]) => unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module state
// ─────────────────────────────────────────────────────────────────────────────

let _module: MkaguziWasm | null = null;
let _initPromise: Promise<void> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the Mkaguzi WASM module.
 *
 * @param wasmJsUrl  URL to the Emscripten glue JS, e.g. '/wasm/mkaguzi_wasm.js'
 *                   The .wasm file must be at the same URL with .js → .wasm.
 */
export async function initEngine(wasmJsUrl: string = '/wasm/mkaguzi_wasm.js'): Promise<void> {
  if (_module) return; // already loaded
  if (_initPromise) return _initPromise; // loading in progress

  _initPromise = (async () => {
    // The Emscripten glue is an ES module (built with -sEXPORT_ES6=1).
    // Use new Function('u','return import(u)') instead of a bare import(url)
    // expression so that:
    //  - Hermes (React Native) can compile this file without errors — it
    //    rejects import(variable) at parse time even if the function is unused.
    //  - Next.js webpack/Turbopack still won't statically bundle the URL.
    const absoluteUrl = new URL(wasmJsUrl, globalThis.location?.href ?? 'http://localhost').href;
    const dynamicImport: (url: string) => Promise<{ default: unknown }> =
      // eslint-disable-next-line no-new-func
      new Function('u', 'return import(u)') as any;
    const { default: factory } = await dynamicImport(absoluteUrl) as {
      default: ((arg?: object) => Promise<MkaguziWasm>) | undefined;
    };
    if (typeof factory !== 'function') {
      throw new Error(
        `Failed to load Mkaguzi WASM from ${wasmJsUrl}: expected a Module factory function`,
      );
    }
    _module = await factory();
    // Call C init function
    _module.ccall('mkz_init', null, [], []);
  })().catch((err) => {
    // Reset so a subsequent initEngine() call can retry (e.g. after HMR).
    _initPromise = null;
    throw err;
  });

  return _initPromise;
}

export function isEngineReady(): boolean {
  return _module !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEN conversion helpers (app convention ↔ Mkaguzi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an app-convention FEN to Mkaguzi-convention FEN.
 * App WHITE = Mkaguzi BLACK (both at PDN 1-12, top of board).
 * Operation is symmetric — applying it twice returns the original.
 */
export function appFenToMkaguziFen(appFen: string): string {
  const stm = appFen[0] === 'W' ? 'B' : 'W';
  const wSqs = appFen.match(/:W([^:]*)/)?.[1] ?? '';
  const bSqs = appFen.match(/:B([^:]*)/)?.[1] ?? '';
  return `${stm}:W${bSqs}:B${wSqs}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw result types returned by the C API
// ─────────────────────────────────────────────────────────────────────────────

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

export type GameResultStatus = 'ongoing' | 'win' | 'draw';

export interface RawGameResult {
  status: GameResultStatus;
  winner?: 'white' | 'black' | 'none';
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

function requireModule(): MkaguziWasm {
  if (!_module) {
    throw new Error(
      'Mkaguzi WASM engine is not loaded. Call initEngine() first and await it.',
    );
  }
  return _module;
}

function ccallStr(mod: MkaguziWasm, fn: string, argTypes: CcallType[], args: unknown[]): string {
  return mod.ccall(fn, 'string', argTypes, args) as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public WASM wrappers (all accept/return app-convention FENs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate all legal moves for the side-to-move in the given app-convention FEN.
 * The FEN's leading W/B character determines whose turn it is.
 */
export function wasmGenerateMoves(appFen: string): RawMove[] {
  const mod = requireModule();
  const mkzFen = appFenToMkaguziFen(appFen);
  const json = ccallStr(mod, 'mkz_generate_moves', ['string'], [mkzFen]);
  const raw: Array<{ from: number; to: number; captures: number[]; promote: boolean }> =
    JSON.parse(json);
  return raw;
}

/**
 * Apply a move and return the resulting position as an app-convention FEN.
 *
 * @param appFen    Current position in app convention
 * @param fromPdn   Source square (PDN 1-32)
 * @param toPdn     Destination square (PDN 1-32)
 * @returns New app-convention FEN, or '' if the move is illegal.
 */
export function wasmApplyMove(appFen: string, fromPdn: number, toPdn: number): string {
  const mod = requireModule();
  const mkzFen = appFenToMkaguziFen(appFen);
  const resultMkzFen = ccallStr(
    mod,
    'mkz_apply_move',
    ['string', 'number', 'number'],
    [mkzFen, fromPdn, toPdn],
  );
  if (!resultMkzFen) return '';
  // Convert result back to the app convention.
  return appFenToMkaguziFen(resultMkzFen);
}

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
export function wasmSearch(
  appFen: string,
  history: string[],
  timeMs: number = 2000,
  depth: number = 0,
  level: number = 19,
  randomness: number = 0,
): RawSearchResult | null {
  const mod = requireModule();
  const mkzFen = appFenToMkaguziFen(appFen);
  const mkzHistory = history.map(appFenToMkaguziFen);
  const historyJson = JSON.stringify(mkzHistory);

  const json = ccallStr(
    mod,
    'mkz_search',
    ['string', 'string', 'number', 'number', 'number', 'number'],
    [mkzFen, historyJson, timeMs, depth, level, randomness],
  );

  const raw = JSON.parse(json) as RawSearchResult;
  if (raw.from === 0 && raw.to === 0) return null; // no legal moves
  return raw;
}

/**
 * Evaluate the game result for the given position.
 *
 * @param appFen            Current position in app convention (side-to-move included)
 * @param fiftyMoves        Reversible-move counter (Art 8.3: 30-move rule)
 * @param threeKingsCount   Moves in 3K-vs-1K endgame (Art 8.5)
 * @param endgameCount      Moves in K+Man vs K / 2K vs K endgame (Art 8.4)
 */
export function wasmGameResult(
  appFen: string,
  fiftyMoves: number = 0,
  threeKingsCount: number = 0,
  endgameCount: number = 0,
): RawGameResult {
  const mod = requireModule();
  const mkzFen = appFenToMkaguziFen(appFen);
  const json = ccallStr(
    mod,
    'mkz_game_result',
    ['string', 'number', 'number', 'number'],
    [mkzFen, fiftyMoves, threeKingsCount, endgameCount],
  );
  return JSON.parse(json) as RawGameResult;
}
