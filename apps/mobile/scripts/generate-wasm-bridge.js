#!/usr/bin/env node
/**
 * generate-wasm-bridge.js
 *
 * Reads the Mkaguzi WASM binary + JS glue and produces a self-contained HTML
 * string (wasm-bridge-html.ts) for loading inside a hidden React Native WebView.
 *
 * Key insight: the JS glue is an ES module that uses `import.meta.url` and
 * `export default`.  Dynamic import() of blob URLs is unreliable (and often
 * blocked) inside WKWebView / Android WebView.
 *
 * Fix: strip ES-module syntax from the glue and inline it as a plain <script>
 * tag — `import.meta.url` is replaced with "" (safe because we supply
 * `wasmBinary` directly, so Emscripten never fetches the .wasm file).
 *
 * Run: node scripts/generate-wasm-bridge.js
 * Output: src/lib/game/wasm-bridge-html.ts  (commit this file)
 */

const fs = require("fs");
const path = require("path");

const WASM_JS   = path.resolve(__dirname, "../../../frontend/public/wasm/mkaguzi_wasm.js");
const WASM_BIN  = path.resolve(__dirname, "../../../frontend/public/wasm/mkaguzi_wasm.wasm");
const OUT_FILE  = path.resolve(__dirname, "../src/lib/game/wasm-bridge-html.ts");

if (!fs.existsSync(WASM_JS) || !fs.existsSync(WASM_BIN)) {
  console.error("WASM files not found. Expected at:");
  console.error("  " + WASM_JS);
  console.error("  " + WASM_BIN);
  process.exit(1);
}

let jsGlue = fs.readFileSync(WASM_JS, "utf8");
const wasmBin = fs.readFileSync(WASM_BIN);
const wasmB64 = wasmBin.toString("base64");

console.log(`JS glue: ${(jsGlue.length / 1024).toFixed(1)} KB`);
console.log(`WASM binary: ${(wasmBin.length / 1024).toFixed(1)} KB  →  base64: ${(wasmB64.length / 1024).toFixed(1)} KB`);

// ── Patch ES-module syntax ────────────────────────────────────────────────────
// 1. import.meta.url → "http://localhost/"
//    Must be a valid URL so new URL(".", base) doesn't throw.
//    The actual path doesn't matter — we supply wasmBinary directly so
//    Emscripten never fetches the .wasm file from scriptDirectory.
jsGlue = jsGlue.replace(/import\.meta\.url/g, '"http://localhost/"');

// 2. export default MkaguziModule → window.__MkaguziFactory = MkaguziModule
jsGlue = jsGlue.replace(
  /export\s+default\s+(\w+)\s*;?/,
  "window.__MkaguziFactory = $1;",
);

console.log("Patched: import.meta.url → \"http://localhost/\", export default → window.__MkaguziFactory");

// ── Build the self-contained HTML ─────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
${jsGlue}
</script>
<script>
(async function() {
  try {
    // ── 1. Decode inlined WASM binary ───────────────────────────────────────
    function b64ToArrayBuffer(b64) {
      var bin = atob(b64);
      var buf = new ArrayBuffer(bin.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
      return buf;
    }
    var wasmBinary = b64ToArrayBuffer("${wasmB64}");

    // ── 2. Instantiate with inlined binary (no fetch needed) ────────────────
    var factory = window.__MkaguziFactory;
    if (typeof factory !== "function") {
      throw new Error("MkaguziFactory not found — glue patch may have failed");
    }
    var mkaguzi = await factory({ wasmBinary: wasmBinary });

    // ── 3. Init engine ───────────────────────────────────────────────────────
    mkaguzi.ccall("mkz_init", null, [], []);

    // ── 4. FEN conversion (app ↔ Mkaguzi — symmetric swap) ──────────────────
    function appFenToMkaguziFen(appFen) {
      var stm = appFen[0] === "W" ? "B" : "W";
      var wSqs = (appFen.match(/:W([^:]*)/)||["",""])[1];
      var bSqs = (appFen.match(/:B([^:]*)/)||["",""])[1];
      return stm + ":W" + bSqs + ":B" + wSqs;
    }

    // ── 5. Handler implementations ───────────────────────────────────────────
    function handleGenerateMoves(payload) {
      var mkzFen = appFenToMkaguziFen(payload.fen);
      var json = mkaguzi.ccall("mkz_generate_moves", "string", ["string"], [mkzFen]);
      return JSON.parse(json);
    }

    function handleApplyMove(payload) {
      var mkzFen = appFenToMkaguziFen(payload.fen);
      var resultMkzFen = mkaguzi.ccall(
        "mkz_apply_move", "string",
        ["string","number","number"],
        [mkzFen, payload.from, payload.to]
      );
      if (!resultMkzFen) return "";
      return appFenToMkaguziFen(resultMkzFen);
    }

    function handleSearch(payload) {
      var mkzFen = appFenToMkaguziFen(payload.fen);
      var mkzHistory = (payload.history || []).map(appFenToMkaguziFen);
      var histJson = JSON.stringify(mkzHistory);
      var json = mkaguzi.ccall(
        "mkz_search", "string",
        ["string","string","number","number","number","number"],
        [mkzFen, histJson, payload.timeMs||2000, payload.depth||0, payload.level||19, payload.randomness||0]
      );
      var raw = JSON.parse(json);
      if (raw.from === 0 && raw.to === 0) return null;
      return raw;
    }

    function handleGameResult(payload) {
      var mkzFen = appFenToMkaguziFen(payload.fen);
      var json = mkaguzi.ccall(
        "mkz_game_result", "string",
        ["string","number","number","number"],
        [mkzFen, payload.fiftyMoves||0, payload.threeKingsCount||0, payload.endgameCount||0]
      );
      return JSON.parse(json);
    }

    // ── 6. postMessage protocol ──────────────────────────────────────────────
    var HANDLERS = {
      generateMoves: handleGenerateMoves,
      applyMove:     handleApplyMove,
      search:        handleSearch,
      gameResult:    handleGameResult,
    };

    function onMessage(event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch(e) { return; }
      if (!msg || !msg.id || !msg.type) return;
      var handler = HANDLERS[msg.type];
      if (!handler) return;
      try {
        var result = handler(msg.payload || {});
        window.ReactNativeWebView.postMessage(JSON.stringify({ id: msg.id, result: result }));
      } catch(err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ id: msg.id, error: err.message }));
      }
    }

    // Android fires on document, iOS on window
    document.addEventListener("message", onMessage);
    window.addEventListener("message", onMessage);

    // ── 7. Signal ready ──────────────────────────────────────────────────────
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ready" }));

  } catch(err) {
    window.ReactNativeWebView &&
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "error", message: String(err) }));
  }
})();
</script>
</body>
</html>`;

// Write TypeScript output
const tsContent = `// AUTO-GENERATED — do not edit manually.
// Run: node scripts/generate-wasm-bridge.js
// Source: frontend/public/wasm/mkaguzi_wasm.{js,wasm}

export const BRIDGE_HTML = ${JSON.stringify(HTML)};
`;

fs.writeFileSync(OUT_FILE, tsContent, "utf8");
const outSize = fs.statSync(OUT_FILE).size;
console.log(`\nWrote: ${path.relative(process.cwd(), OUT_FILE)}`);
console.log(`Total output size: ${(outSize / 1024).toFixed(1)} KB`);
console.log("Done.");
