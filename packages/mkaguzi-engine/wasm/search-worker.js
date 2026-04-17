// dist/wasm-bridge.js
var _module = null;
var _initPromise = null;
async function initEngine(wasmJsUrl = "/wasm/mkaguzi_wasm.js") {
  if (_module)
    return;
  if (_initPromise)
    return _initPromise;
  _initPromise = (async () => {
    const absoluteUrl = new URL(wasmJsUrl, globalThis.location?.href ?? "http://localhost").href;
    const dynamicImport = (
      // eslint-disable-next-line no-new-func
      new Function("u", "return import(u)")
    );
    const { default: factory } = await dynamicImport(absoluteUrl);
    if (typeof factory !== "function") {
      throw new Error(`Failed to load Mkaguzi WASM from ${wasmJsUrl}: expected a Module factory function`);
    }
    _module = await factory();
    _module.ccall("mkz_init", null, [], []);
  })().catch((err) => {
    _initPromise = null;
    throw err;
  });
  return _initPromise;
}
function appFenToMkaguziFen(appFen) {
  const stm = appFen[0] === "W" ? "B" : "W";
  const wSqs = appFen.match(/:W([^:]*)/)?.[1] ?? "";
  const bSqs = appFen.match(/:B([^:]*)/)?.[1] ?? "";
  return `${stm}:W${bSqs}:B${wSqs}`;
}
function requireModule() {
  if (!_module) {
    throw new Error("Mkaguzi WASM engine is not loaded. Call initEngine() first and await it.");
  }
  return _module;
}
function ccallStr(mod, fn, argTypes, args) {
  return mod.ccall(fn, "string", argTypes, args);
}
function wasmSearch(appFen, history, timeMs = 2e3, depth = 0, level = 19, randomness = 0) {
  const mod = requireModule();
  const mkzFen = appFenToMkaguziFen(appFen);
  const mkzHistory = history.map(appFenToMkaguziFen);
  const historyJson = JSON.stringify(mkzHistory);
  const json = ccallStr(mod, "mkz_search", ["string", "string", "number", "number", "number", "number"], [mkzFen, historyJson, timeMs, depth, level, randomness]);
  const raw = JSON.parse(json);
  if (raw.from === 0 && raw.to === 0)
    return null;
  return raw;
}

// dist/search-worker.js
var ready = false;
self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "init") {
    try {
      await initEngine(msg.wasmJsUrl);
      ready = true;
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", id: "init", message: String(err) });
    }
    return;
  }
  if (msg.type === "search") {
    const id = msg.id;
    if (!ready) {
      self.postMessage({ type: "error", id, message: "Engine not initialised" });
      return;
    }
    try {
      const result = wasmSearch(msg.fen, msg.history ?? [], msg.timeMs ?? 2e3, msg.depth ?? 0, msg.level ?? 19, msg.randomness ?? 0);
      self.postMessage({ type: "result", id, move: result });
    } catch (err) {
      self.postMessage({ type: "error", id, message: String(err) });
    }
    return;
  }
};
