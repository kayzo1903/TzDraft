import { EgtbService } from './egtb.service';

// ── Minimal stubs so we don't need NestJS DI in unit tests ──
class StandaloneEgtb extends EgtbService {
  constructor() {
    // NestJS @Injectable omitted here — call super via the class constructor
    super();
  }
}

describe('EgtbService – guards', () => {
  let svc: EgtbService;

  beforeEach(() => {
    svc = new StandaloneEgtb();
  });

  test('returns null when any piece is a MAN', async () => {
    const pieces = [
      { type: 'MAN' as const, color: 'WHITE' as const, position: 1 },
      { type: 'KING' as const, color: 'BLACK' as const, position: 32 },
    ];
    const result = await svc.getBestMove(pieces, 'WHITE', 0);
    expect(result).toBeNull();
  });

  test('returns null when piece count > 6', async () => {
    const pieces = [1, 2, 3, 4]
      .map((p) => ({
        type: 'KING' as const,
        color: 'WHITE' as const,
        position: p,
      }))
      .concat(
        [5, 6, 7].map((p) => ({
          type: 'KING' as const,
          color: 'BLACK' as const,
          position: p,
        })),
      );
    const result = await svc.getBestMove(pieces, 'WHITE', 0);
    expect(result).toBeNull();
  });

  test('returns null when one side has no pieces', async () => {
    const pieces = [
      { type: 'KING' as const, color: 'WHITE' as const, position: 1 },
      { type: 'KING' as const, color: 'WHITE' as const, position: 2 },
    ];
    const result = await svc.getBestMove(pieces, 'WHITE', 0);
    expect(result).toBeNull();
  });
});

describe('EgtbService – position indexing', () => {
  let svc: StandaloneEgtb;

  beforeEach(() => {
    svc = new StandaloneEgtb();
  });

  test('position index is non-negative integer for a simple 2-king position', () => {
    // Access private via any-cast for unit testing
    const pieces = [
      { type: 'KING' as const, color: 'WHITE' as const, position: 1 }, // CAKE sq 1
      { type: 'KING' as const, color: 'BLACK' as const, position: 32 }, // CAKE sq 32
    ];
    const idx = (svc as any).computePositionIndex(pieces, 'WHITE');
    expect(typeof idx).toBe('number');
    expect(idx).toBeGreaterThanOrEqual(0);
    // C(32,1)*C(31,1) = 32*31 = 992 possible positions — index must be in range
    expect(idx).toBeLessThan(32 * 31);
  });

  test('different piece placements give different indices', () => {
    const piecesA = [
      { type: 'KING' as const, color: 'WHITE' as const, position: 1 },
      { type: 'KING' as const, color: 'BLACK' as const, position: 32 },
    ];
    const piecesB = [
      { type: 'KING' as const, color: 'WHITE' as const, position: 2 },
      { type: 'KING' as const, color: 'BLACK' as const, position: 32 },
    ];
    const idxA = (svc as any).computePositionIndex(piecesA, 'WHITE');
    const idxB = (svc as any).computePositionIndex(piecesB, 'WHITE');
    expect(idxA).not.toBe(idxB);
  });

  it('should correctly resolve file path and index for 2 kings', () => {
    const { filePath, posIndex } = (svc as any).resolvePosition(
      [
        { color: 'WHITE', type: 'KING', position: 1 },
        { color: 'BLACK', type: 'KING', position: 32 },
      ],
      'WHITE',
    );
    // New format: pieces-config-side-chunk
    // config: 0011 (0 WM, 0 BM, 1 WK, 1 BK)
    // side: 1 (White)
    // chunk: floor(globalIdx / 65536)
    expect(filePath).toContain('2-0011-1-0');
    expect(posIndex).toBeGreaterThanOrEqual(0);
  });
});
