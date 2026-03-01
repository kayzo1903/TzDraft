import { PlayerColor } from '../../../shared/constants/game.constants';
export declare class CreateInviteGameDto {
    color: PlayerColor | 'RANDOM';
    timeMs?: number;
}
export declare class JoinInviteGameDto {
}
export declare class CreatePvPGameDto {
    whitePlayerId: string;
    blackPlayerId: string;
    whiteElo?: number;
    blackElo?: number;
}
export declare class CreatePvEGameDto {
    playerId: string;
    playerColor: PlayerColor;
    playerElo?: number;
    aiLevel: number;
    initialTimeMs?: number;
}
