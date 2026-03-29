/**
 * build-worker.mjs
 *
 * Bundles dist/search-worker.js (and its imports) into a single self-contained
 * file at wasm/search-worker.js so it can be served as a Web Worker without
 * needing bare-specifier module resolution in the browser.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [join(__dirname, 'dist/search-worker.js')],
  bundle: true,
  outfile: join(__dirname, 'wasm/search-worker.js'),
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  // wasm-bridge.ts fetches mkaguzi_wasm.js — mark as external (loaded at runtime)
  external: [],
  minify: false,
});

console.log('Built wasm/search-worker.js');
