"use client";

import { useEffect } from "react";
import { initEngine } from "@tzdraft/mkaguzi-engine";

/**
 * Kicks off Mkaguzi WASM loading in the background as soon as the client
 * mounts.  Rendered once at the top of the locale layout — no UI output.
 */
export function EngineInit() {
  useEffect(() => {
    initEngine("/wasm/mkaguzi_wasm.js").catch((e) => console.error("[Mkaguzi] WASM init failed:", e));
  }, []);

  return null;
}
