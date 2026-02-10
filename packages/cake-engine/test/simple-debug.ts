import { CakeEngine } from '../src/engine';
import { PlayerColor } from '../src/constants';

console.log('=== Simple Debug Test ===\n');

// Step 1: Create initial state
console.log('Step 1: Creating initial board state...');
const board = CakeEngine.createInitialState();
const pieces = board.getAllPieces();
console.log(`  Board created with ${pieces.length} pieces`);
console.log(`  White pieces: ${board.getPiecesByColor(PlayerColor.WHITE).length}`);
console.log(`  Black pieces: ${board.getPiecesByColor(PlayerColor.BLACK).length}`);

// Step 2: Try to generate moves
console.log('\nStep 2: Generating legal moves for WHITE...');
const moves = CakeEngine.generateLegalMoves(board, PlayerColor.WHITE, 0);
console.log(`  Generated ${moves.length} moves`);
if (moves.length === 0) {
  console.log('  ERROR: No moves generated! Expected at least 7 opening moves.');
} else {
  moves.slice(0, 3).forEach((move, idx) => {
    console.log(`    Move ${idx + 1}: ${move.notation}`);
  });
}

// Step 3: Try evaluating game result
console.log('\nStep 3: Evaluating game result...');
const result = CakeEngine.evaluateGameResult(board, PlayerColor.WHITE);
console.log(`  Game result: ${result ? `Winner: ${result.winner}, Reason: ${result.reason}` : 'Game ongoing'}`);
if (result) {
  console.log('  ERROR: Game should be ongoing at initial state!');
}
