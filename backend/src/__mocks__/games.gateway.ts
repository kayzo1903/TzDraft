export class GamesGateway {
  emitGameStateUpdate = jest.fn();
  emitGameOver = jest.fn();
  emitMatchFound = jest.fn();
  emitTournamentMatchCompleted = jest.fn();
  emitNotification = jest.fn();
  emitPlayerJoined = jest.fn();
  emitPlayerLeft = jest.fn();
  afterInit = jest.fn();
}
