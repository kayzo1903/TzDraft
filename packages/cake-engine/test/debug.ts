import {
  CakeEngine,
  PlayerColor,
} from '../src';

console.log('Testing CAKE Engine');

const board = CakeEngine.createInitialState();
console.log('Initial board created');
console.log('Pieces:', board.getAllPieces().length);

const whiteMoves = CakeEngine.generateLegalMoves(board, PlayerColor.WHITE);
console.log('White moves:', whiteMoves.length);
whiteMoves.forEach((move, i) => {
  console.log(`  Move ${i}: from ${move.from.value} to ${move.to.value} (${move.notation})`);
});

if (whiteMoves.length > 0) {
  const newBoard = CakeEngine.applyMove(board, whiteMoves[0]);
  console.log('Applied move, new piece count:', newBoard.getAllPieces().length);
}
