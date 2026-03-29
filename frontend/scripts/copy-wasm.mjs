/**
 * copy-wasm.mjs
 *
 * Copies WASM artifacts from @tzdraft/mkaguzi-engine/wasm/ into
 * frontend/public/wasm/ so Next.js can serve them as static assets.
 *
 * Run automatically via the predev and prebuild npm hooks.
 */
import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../../packages/mkaguzi-engine/wasm');
const dest = join(__dirname, '../public/wasm');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log('Copied WASM artifacts: packages/mkaguzi-engine/wasm → public/wasm');
