# 🌐 CAKE Engine Browser Compatibility

## Overview

The CAKE Engine (Cognitive AI Knowledge Engine) is designed to run in **both Node.js (backend) and browser (frontend) environments** without code duplication.

This document ensures the engine remains compatible with modern browsers while maintaining full functionality in the backend.

---

## ✅ Browser Compatibility

### Supported Environments

| Environment   | Status | Notes                                |
| ------------- | ------ | ------------------------------------ |
| **Chrome**    | ✅     | 90+                                  |
| **Firefox**   | ✅     | 88+                                  |
| **Safari**    | ✅     | 14+                                  |
| **Edge**      | ✅     | 90+                                  |
| **Node.js**   | ✅     | 16+ (with crypto polyfill if needed) |

---

## ⚠️ API Constraints

### Allowed APIs

✅ **ECMAScript Features**
- `Map`, `Set`, `WeakMap`
- Array methods: `forEach`, `map`, `filter`, `reduce`, `some`, `every`
- Object methods: `keys`, `values`, `entries`
- Template literals
- Spread operator
- Classes (without decorators)

✅ **Global Objects**
- `Math`, `Date`, `JSON`
- `Error` and error subclasses
- `crypto.randomUUID()` (modern browsers + Node 15.7+)

✅ **DOM APIs** (Only in frontend)
- These are NOT used by core engine

---

### Forbidden APIs

❌ **Node.js Specific**
- `fs`, `path`, `os`, `crypto` (except `crypto.randomUUID`)
- `child_process`, `cluster`
- `http`, `https` (use fetch instead)
- `buffer` (use Uint8Array instead)
- `stream`, `net`

❌ **Decorators**
- `@Injectable()`, `@Decorator()`
- TypeScript-only features

❌ **Framework-Specific**
- NestJS providers, modules, decorators
- Angular/React (components are frontend-only)
- Prisma ORM

---

## 🔑 UUID Generation

### Fallback Strategy

The engine uses `crypto.randomUUID()` for generating unique IDs.

**Modern browsers:** Available natively (ES2022)

**Legacy support:**
```typescript
// Fallback in move-generator.service.ts
private generateMoveId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## 📦 Dependencies

### Runtime Dependencies

**NONE.** The engine has zero runtime dependencies.

### Dev Dependencies

- `typescript` — Compilation
- `jest` — Testing
- `ts-jest` — Jest TypeScript support

---

## 🧪 Testing

### Shared Test Suite

Tests run in **both** Node.js and browser environments:

```bash
# Backend (Node.js)
npm test

# Frontend (JSDOM/Puppeteer)
npm test -- --environment=jsdom
```

Same test code, different runtimes.

---

## 🔧 Bundling for Frontend

### Build Target

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"]
  }
}
```

### Expected Bundle Sizes

- **Uncompressed:** ~88 KB
- **Gzipped:** ~18–22 KB
- **Brotli:** ~15–18 KB

### Build Tools

Works with:
- Webpack
- Vite
- Next.js
- Esbuild
- Parcel

---

## 🚫 What Cannot Work in Browser

### Direct Restrictions

- ❌ File I/O (cannot read/write disk)
- ❌ Subprocess control (no shell execution)
- ❌ Direct network access (use fetch/WebSocket)
- ❌ System calls (process, env variables)
- ❌ Database drivers (Prisma, etc.)

### Workaround

These are **not needed** in the CAKE engine:

- All game logic is **in-memory** ✅
- All state management is **immutable** ✅
- All serialization is **JSON** ✅

---

## 🔄 Frontend ↔ Backend Parity

### What's Identical

- **Engine logic:** Same `GameRulesService`, `MoveValidator`, etc.
- **Rules enforcement:** Identical outputs for same inputs
- **Test coverage:** Same tests, same assertions

### What Differs

| Aspect           | Frontend          | Backend          |
| ---------------- | ----------------- | ---------------- |
| **ID generation**| `crypto.randomUUID()`| `crypto.randomUUID()` |
| **Storage**      | Memory only       | Database (Prisma) |
| **Persistence**  | Session/LocalStorage | PostgreSQL |
| **Networking**   | Fetch/WebSocket   | HTTP/WebSocket    |
| **AI execution** | Client-side       | Server-side      |

---

## ✨ Browser-Optimized Patterns

### ✅ Good

```typescript
// Pure functions, no side effects
generateLegalMoves(board: BoardState, player: PlayerColor): Move[] {
  // Works identically in browser and Node.js
}

// Immutable updates
const newBoard = board.movePiece(from, to);

// JSON-serializable types
const moveJson = JSON.stringify(move);
```

### ❌ Avoid

```typescript
// ❌ File operations
const rules = fs.readFileSync('rules.json');

// ❌ Prisma queries in frontend
const game = await prisma.game.findUnique({ where: { id } });

// ❌ Server-side decorators in shared code
@Injectable()  // Don't use in engine
export class GameService {}
```

---

## 🎯 Best Practices

### For Engine Developers

1. **Keep it pure:** No side effects, no I/O
2. **Use JSON:** All types should be JSON-serializable
3. **Avoid globals:** No singletons or shared state
4. **Test both:** Run tests in Node.js and JSDOM
5. **Document assumptions:** Note any browser requirementsRequired

### For Frontend Integrators

1. **Bundle check:** Ensure no backend deps in bundle
2. **Size monitoring:** Watch for bloat (goal: <25KB gzip)
3. **Error handling:** Provide fallbacks for missing APIs
4. **Updates:** Keep engine package in sync with backend

### For Backend Developers

1. **Import carefully:** Use only from `@tzdraft/cake-engine`
2. **Don't modify:** Engine code is immutable
3. **Tests pass:** Ensure parity tests still pass
4. **Versioning:** Update package version when CAKE changes

---

## 🆘 Troubleshooting

### Issue: "crypto is not defined"

**Solution:** Use polyfill

```typescript
import { v4 as uuidv4 } from 'uuid';
// or use fallback strategy (already implemented)
```

### Issue: Bundle includes Prisma/NestJS

**Solution:** Check imports in `src/`

```bash
grep -r "from.*prisma\|from.*@nestjs" packages/cake-engine/src/
# Should return nothing
```

### Issue: TypeScript errors in browser

**Solution:** Check target/lib config

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"]
  }
}
```

---

## 📊 Verification Checklist

Before shipping:

- [ ] `npm run build` succeeds
- [ ] `npm run test` passes (Node.js)
- [ ] No backend imports in bundle
- [ ] Bundle size < 25KB gzip
- [ ] Works in Chrome, Firefox, Safari
- [ ] Deterministic move generation
- [ ] Frontend move list ≡ backend move list

---

## 🚀 Future Improvements

- [ ] Add WASM version for performance
- [ ] Implement transposition table (memoization-friendly)
- [ ] Add board hashing for repetition detection
- [ ] Support offline replay engine

---

**Last Updated:** 2026-02-10

