"use client";

import { io, Socket } from 'socket.io-client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
// import { useSocket } from '@/hooks/useSocket'; // Disabled to use local socket
import { Board } from '@/components/game/Board';
import { LoadingBoard } from '@/components/game/LoadingBoard';
import { gameService } from '@/services/game.service';
import { getBotByLevel } from '@/lib/game/bots';
import { User } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth/auth-store';
import { getOrCreateGuestId } from '@/lib/auth/guest-id';
import { useRouter } from '@/i18n/routing';
import { GameNotFound } from '@/components/game/GameNotFound';
import { boardIndexToPosition, displayIndexToBoardIndex, positionToBoardIndex, serverPosToUiPos, uiPosToServerPos } from '@/lib/game/board-coords';
import { applyOptimisticUiMove, computeUiLegalMoves, type BackendPiece } from '@/lib/game/ui-legal-moves';
import { BoardState, CakeEngine, Piece, PieceType, PlayerColor, Position } from '@tzdraft/cake-engine';

type Rating = number | { rating: number };

type PlayerRecord = {
    username?: string;
    rating?: Rating;
};

type PlayersResponse = {
    white?: PlayerRecord;
    black?: PlayerRecord;
};

type ClockInfo = {
    whiteTimeMs: number;
    blackTimeMs: number;
    lastMoveAt?: string;
};

type ClockSnapshot = {
    whiteTimeMs: number;
    blackTimeMs: number;
    currentTurn: 'WHITE' | 'BLACK';
    lastPerfMs: number;
};

type GameResponse = {
    status?: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
    whitePlayerId: string | null;
    blackPlayerId: string | null;
    whiteGuestName?: string;
    blackGuestName?: string;
    currentTurn?: 'WHITE' | 'BLACK';
    gameType: 'RANKED' | 'CASUAL' | 'AI';
    aiLevel?: number;
    clockInfo?: ClockInfo;
    winner?: 'WHITE' | 'BLACK' | 'DRAW' | null;
    endReason?: string | null;
    board?: Record<number, unknown>;
};

type GameOverEvent = {
    winner?: 'WHITE' | 'BLACK' | 'DRAW' | null;
    reason?: string;
    endedBy?: string;
    noMoves?: boolean;
};

type ResultCardState = {
    outcome: 'WIN' | 'LOSS' | 'DRAW';
    title: string;
    detail: string;
};

function ColorBadge({ color }: { color: 'WHITE' | 'BLACK' }) {
    const isWhite = color === 'WHITE';
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">
            <span
                className={
                    isWhite
                        ? "h-2.5 w-2.5 rounded-full border border-neutral-300 bg-neutral-100"
                        : "h-2.5 w-2.5 rounded-full border border-neutral-500 bg-neutral-800"
                }
            />
            {isWhite ? "White" : "Black"}
        </span>
    );
}

export default function GamePage() {
    const { id: gameId } = useParams<{ id: string }>();
    const router = useRouter();
    // const socket = useSocket();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user, isHydrated } = useAuthStore();
    const [guestId, setGuestId] = useState<string | null>(null);
    const participantId = user?.id ?? guestId;
    const [game, setGame] = useState<GameResponse | null>(null);
    const [players, setPlayers] = useState<PlayersResponse | null>(null);
    const [viewerColor, setViewerColor] = useState<'WHITE' | 'BLACK'>('WHITE');
    const [actionLoading, setActionLoading] = useState<'resign' | 'abort' | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [rematchState, setRematchState] = useState<'idle' | 'waiting' | 'received'>('idle');
    const [rematchError, setRematchError] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<'resign' | 'abort' | null>(null);
    const [resultCard, setResultCard] = useState<ResultCardState | null>(null);
    const [loading, setLoading] = useState(true);
    const [displayClock, setDisplayClock] = useState<ClockInfo | null>(null);
    const clockSnapshotRef = useRef<ClockSnapshot | null>(null);
    const optimisticSnapshotRef = useRef<{
        pieces: Record<number, BackendPiece>;
        game: GameResponse | null;
    } | null>(null);
    const [isOptimistic, setIsOptimistic] = useState(false);
    const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
    const [selfDisconnectCountdown, setSelfDisconnectCountdown] = useState<number | null>(null);
    const gameIdRef = useRef(gameId);
    const viewerColorRef = useRef(viewerColor);
    const participantIdRef = useRef<string | null>(participantId);
    const gamePlayersRef = useRef<{ whitePlayerId: string | null; blackPlayerId: string | null }>({
        whitePlayerId: null,
        blackPlayerId: null,
    });
    const [pieces, setPieces] = useState<Record<number, BackendPiece>>({});
    const piecesRef = useRef<Record<number, BackendPiece>>({});
    const [hasAnyMove, setHasAnyMove] = useState(false);
    const [drawOffer, setDrawOffer] = useState<
        | null
        | {
            offeredBy: string;
            expiresAt: number;
            isMine: boolean;
        }
    >(null);
    const lastBoardSignatureRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isHydrated) return;
        if (user?.id) {
            setGuestId(null);
            return;
        }
        setGuestId(getOrCreateGuestId());
    }, [isHydrated, user?.id]);

    useEffect(() => {
        participantIdRef.current = participantId;
    }, [participantId]);

    useEffect(() => {
        piecesRef.current = pieces;
    }, [pieces]);

    const buildResultCard = useCallback(
        (data: GameOverEvent): ResultCardState => {
            const winner = data.winner ?? null;
            const reason = data.reason ?? null;
            const endedBy = data.endedBy ?? null;
            const noMoves = Boolean(data.noMoves);
            const viewer = viewerColorRef.current;
            const myParticipantId = participantIdRef.current;

            const outcome: ResultCardState['outcome'] =
                winner === 'DRAW' || reason === 'DRAW' || reason === 'ABORTED'
                    ? 'DRAW'
                    : winner === viewer
                        ? 'WIN'
                        : winner
                            ? 'LOSS'
                            : 'DRAW';

            const asYouOpponent = (messageForYou: string, messageForOpponent: string) => {
                if (!endedBy || !myParticipantId) return outcome === 'WIN' ? messageForOpponent : messageForYou;
                return endedBy === myParticipantId ? messageForYou : messageForOpponent;
            };

            const piecesSnapshot = piecesRef.current;
            const countPieces = (color: 'WHITE' | 'BLACK') =>
                Object.values(piecesSnapshot).filter((p) => p?.color === color).length;

            const toEngineBoard = (byPos: Record<number, BackendPiece>) => {
                const enginePieces: Piece[] = [];
                for (const [key, piece] of Object.entries(byPos)) {
                    const pos = Number(key);
                    if (!Number.isFinite(pos)) continue;
                    const engineColor = piece.color === 'BLACK' ? PlayerColor.BLACK : PlayerColor.WHITE;
                    const engineType = piece.type === 'KING' || piece.isKing ? PieceType.KING : PieceType.MAN;
                    enginePieces.push(new Piece(engineType, engineColor, new Position(pos)));
                }
                return new BoardState(enginePieces);
            };

            const inferRuleEnding = () => {
                if (winner !== 'WHITE' && winner !== 'BLACK') {
                    return 'Game ended.';
                }

                const loser: 'WHITE' | 'BLACK' = winner === 'WHITE' ? 'BLACK' : 'WHITE';
                const loserPieceCount = countPieces(loser);
                if (loserPieceCount === 0) {
                    return loser === viewer ? 'All your pieces were captured.' : 'All opponent pieces were captured.';
                }

                try {
                    const board = toEngineBoard(piecesSnapshot);
                    const loserPlayer = loser === 'BLACK' ? PlayerColor.BLACK : PlayerColor.WHITE;
                    const loserHasMoves = CakeEngine.generateLegalMoves(board, loserPlayer, 0).length > 0;
                    if (!loserHasMoves) {
                        return loser === viewer ? 'You have no legal moves.' : 'Opponent has no legal moves.';
                    }
                } catch {
                    // Ignore and fall back.
                }

                return 'Game ended by rule.';
            };

            const detail = (() => {
                if (reason === 'ABORTED') {
                    return asYouOpponent(
                        'You aborted the game before any move. No rating change.',
                        'Opponent aborted the game before any move. No rating change.',
                    );
                }
                if (reason === 'DRAW' || winner === 'DRAW') {
                    if (reason === 'DISCONNECT' && noMoves) {
                        return 'Draw: disconnect before any move. No rating change.';
                    }
                    if (reason === 'DRAW') {
                        return 'Draw agreed by both players.';
                    }
                    if (reason === 'DISCONNECT') {
                        return 'Draw: game ended due to disconnect.';
                    }
                    return 'The game ended in a draw.';
                }
                if (reason === 'RESIGN') {
                    return asYouOpponent('You resigned.', 'Opponent resigned.');
                }
                if (reason === 'TIME') {
                    return asYouOpponent('You ran out of time.', 'Opponent ran out of time.');
                }
                if (reason === 'DISCONNECT') {
                    return asYouOpponent('You disconnected and forfeited.', 'Opponent disconnected and forfeited.');
                }
                if (reason === 'CHECKMATE') {
                    return inferRuleEnding();
                }
                return inferRuleEnding();
            })();

            return {
                outcome,
                title: outcome === 'WIN' ? 'Win' : outcome === 'LOSS' ? 'Loss' : 'Draw',
                detail,
            };
        },
        [],
    );

    const getBoardSignature = useRef(
        (board: Record<number, unknown>) => {
            const keys = Object.keys(board).sort((a, b) => Number(a) - Number(b));
            let signature = "";
            for (const key of keys) {
                const piece = (board as any)[key];
                if (!piece) continue;
                const color = piece.color ?? "";
                const type = piece.type ?? "";
                const isKing = piece.isKing ? "1" : "0";
                signature += `${key}:${color}:${type}:${isKing}|`;
            }
            return signature;
        },
    ).current;

    const syncClockSnapshot = React.useCallback(
        (clockInfo: ClockInfo, currentTurn: 'WHITE' | 'BLACK', serverTimeMs?: number) => {
            const nowPerfMs = performance.now();
            const whiteTimeMs = Number(clockInfo.whiteTimeMs);
            const blackTimeMs = Number(clockInfo.blackTimeMs);
            const latencyMs =
                Number.isFinite(serverTimeMs) ? Math.max(0, Date.now() - Number(serverTimeMs)) : 0;

            const adjustedWhite =
                currentTurn === 'WHITE'
                    ? Math.max(0, whiteTimeMs - latencyMs)
                    : whiteTimeMs;
            const adjustedBlack =
                currentTurn === 'BLACK'
                    ? Math.max(0, blackTimeMs - latencyMs)
                    : blackTimeMs;

            clockSnapshotRef.current = {
                whiteTimeMs: adjustedWhite,
                blackTimeMs: adjustedBlack,
                currentTurn,
                lastPerfMs: nowPerfMs,
            };

            setDisplayClock({
                whiteTimeMs: adjustedWhite,
                blackTimeMs: adjustedBlack,
                lastMoveAt: clockInfo.lastMoveAt,
            });
        },
        [],
    );

    // Convert backend pieces (1-32) to frontend pieces (0-63)
    const frontendPieces = React.useMemo(() => {
        const result: Record<number, { color: 'WHITE' | 'BLACK', isKing?: boolean }> = {};
        Object.entries(pieces).forEach(([key, piece]) => {
            const pos = Number(key);
            const uiPos = serverPosToUiPos(pos);
            const index = positionToBoardIndex(uiPos);
            result[index] = { color: piece.color, isKing: piece.isKing || piece.type === 'KING' };
        });
        return result;
    }, [pieces]);

    const canInteract = React.useMemo(() => {
        if (!participantId) return false;
        if (game?.status !== 'ACTIVE') return false;
        const isPlayer =
            (viewerColor === 'WHITE' && game.whitePlayerId === participantId) ||
            (viewerColor === 'BLACK' && game.blackPlayerId === participantId);
        if (!isPlayer) return false;
        return (game.currentTurn ?? 'WHITE') === viewerColor;
    }, [game?.blackPlayerId, game?.currentTurn, game?.status, game?.whitePlayerId, participantId, viewerColor]);

    const canRequestDraw = React.useMemo(() => {
        if (!participantId) return false;
        if (game?.status !== 'ACTIVE') return false;
        return game.whitePlayerId === participantId || game.blackPlayerId === participantId;
    }, [game?.blackPlayerId, game?.status, game?.whitePlayerId, participantId]);

    const { legalMoves, forcedPieces } = React.useMemo(
        () =>
            computeUiLegalMoves({
                piecesByPosition: pieces,
                viewerColor,
                canInteract,
                moveCount: 0,
                flipped: viewerColor === 'BLACK',
            }),
        [canInteract, pieces, viewerColor],
    );

    useEffect(() => {
        const prevHtmlOverflowY = document.documentElement.style.overflowY;
        const prevBodyOverflowY = document.body.style.overflowY;
        const prevBodyOverscrollBehavior = document.body.style.overscrollBehavior;

        document.documentElement.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.documentElement.style.overflowY = prevHtmlOverflowY;
            document.body.style.overflowY = prevBodyOverflowY;
            document.body.style.overscrollBehavior = prevBodyOverscrollBehavior;
        };
    }, []);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                setLoading(true);
                setDisplayClock(null);
                clockSnapshotRef.current = null;
                setDisconnectCountdown(null);
                setSelfDisconnectCountdown(null);
                setDrawOffer(null);
                setActionError(null);
                setResultCard(null);
                optimisticSnapshotRef.current = null;
                setIsOptimistic(false);
                const data = await gameService.getGame(gameId);
                console.log('Fetched game data:', data);
                // Check if data is nested or direct
                const gameData = data.data?.game || data.game || data;
                const playersData = data.data?.players || data.players;
                const movesData = data.data?.moves;

                console.log('Processed game:', gameData);
                console.log('Board:', gameData?.board);

                setGame(gameData);
                setPlayers(playersData);
                setHasAnyMove(Array.isArray(movesData) && movesData.length > 0);
            } catch (error) {
                console.error('Failed to fetch game:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
    }, [gameId]);

    useEffect(() => {
        if (!game) return;

        let resolvedColor: 'WHITE' | 'BLACK' | null = null;

        if (!resolvedColor && participantId) {
            if (participantId === game.whitePlayerId) {
                resolvedColor = 'WHITE';
            } else if (participantId === game.blackPlayerId) {
                resolvedColor = 'BLACK';
            }
        }

        if (!resolvedColor && typeof window !== 'undefined') {
            const stored = window.sessionStorage.getItem(`tzdraft:game:${gameId}:color`);
            if (stored === 'WHITE' || stored === 'BLACK') {
                resolvedColor = stored;
            }
        }

        // Do not force a WHITE fallback while identity/session is still resolving.
        // This prevents both clients from briefly or permanently locking to WHITE.
        if (!resolvedColor) return;

        setViewerColor((prev) => (prev === resolvedColor ? prev : resolvedColor));
    }, [game, gameId, participantId]);

    useEffect(() => {
        let cancelled = false;

        const pullClockSnapshot = async () => {
            try {
                const response = await gameService.getGameClock(gameId);
                if (cancelled) return;

                const serverGame = response?.data as {
                    status?: string;
                    currentTurn?: 'WHITE' | 'BLACK';
                    clockInfo?: ClockInfo | null;
                    serverTimeMs?: number;
                } | undefined;
                if (!serverGame?.clockInfo) return;

                syncClockSnapshot(
                    serverGame.clockInfo,
                    serverGame.currentTurn ?? 'WHITE',
                    Number(serverGame.serverTimeMs),
                );
                setGame((prev) =>
                    prev
                        ? {
                            ...prev,
                            status: (serverGame.status as any) ?? prev.status,
                            currentTurn: serverGame.currentTurn ?? prev.currentTurn,
                            clockInfo: serverGame.clockInfo ?? prev.clockInfo,
                        }
                        : prev,
                );
            } catch {
                // Keep last known clock snapshot if fetching fails momentarily.
            }
        };

        pullClockSnapshot();
        const resyncId = window.setInterval(pullClockSnapshot, 30_000);
        return () => {
            cancelled = true;
            window.clearInterval(resyncId);
        };
    }, [gameId, syncClockSnapshot]);

    useEffect(() => {
        const tickId = window.setInterval(() => {
            const snap = clockSnapshotRef.current;
            if (!snap) return;
            const nowPerfMs = performance.now();
            const elapsed = Math.max(0, nowPerfMs - snap.lastPerfMs);
            snap.lastPerfMs = nowPerfMs;

            if (snap.currentTurn === 'WHITE') {
                snap.whiteTimeMs = Math.max(0, snap.whiteTimeMs - elapsed);
            } else {
                snap.blackTimeMs = Math.max(0, snap.blackTimeMs - elapsed);
            }

            setDisplayClock({
                whiteTimeMs: snap.whiteTimeMs,
                blackTimeMs: snap.blackTimeMs,
            });
        }, 100);

        return () => window.clearInterval(tickId);
    }, []);

    useEffect(() => {
        gameIdRef.current = gameId;
        viewerColorRef.current = viewerColor;
    }, [gameId, viewerColor]);

    useEffect(() => {
        gamePlayersRef.current = {
            whitePlayerId: game?.whitePlayerId ?? null,
            blackPlayerId: game?.blackPlayerId ?? null,
        };
    }, [game?.blackPlayerId, game?.whitePlayerId]);



    useEffect(() => {
        if (disconnectCountdown === null) return;
        const timer = window.setInterval(() => {
            setDisconnectCountdown((prev) => {
                if (prev === null) return null;
                if (prev <= 1) return null;
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [disconnectCountdown]);

    useEffect(() => {
        // Initialize pieces from initial game state
        if (game && (game as any).board) {
            const initialBoard = (game as any).board as Record<number, BackendPiece>;
            setPieces(initialBoard);
            lastBoardSignatureRef.current = getBoardSignature(initialBoard as Record<number, unknown>);
        }
    }, [game, getBoardSignature]);

    useEffect(() => {
        if (!isHydrated) return;

        console.log('Initializing socket connection...');
        const accessToken =
            typeof window !== 'undefined'
                ? window.localStorage.getItem('accessToken')
                : null;
        const persistedParticipantId =
            typeof window !== 'undefined'
                ? window.sessionStorage.getItem(`tzdraft:game:${gameIdRef.current}:participantId`)
                : null;
        const resolvedGuestId =
            !user?.id && typeof window !== 'undefined' ? getOrCreateGuestId() : null;
        const authPayload = accessToken
            ? { token: accessToken }
            : persistedParticipantId
                ? { guestId: persistedParticipantId }
                : resolvedGuestId
                    ? { guestId: resolvedGuestId }
                    : undefined;

        const rawSocketBase =
            process.env.NEXT_PUBLIC_SOCKET_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            'http://localhost:3002';
        const socketUrl = rawSocketBase.endsWith('/games')
            ? rawSocketBase
            : `${rawSocketBase.replace(/\/$/, '')}/games`;

        const newSocket = io(socketUrl, {
            withCredentials: true,
            auth: authPayload,
            autoConnect: true,
            // Prefer a direct WebSocket connection — avoids the ~200-500 ms
            // overhead of HTTP long-polling that kick in when polling is listed
            // first or used as a fallback.
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        setSocket(newSocket);

        const joinGameRoom = (targetGameId: string) => {
            newSocket.emit(
                'joinGame',
                { gameId: targetGameId },
                (ack?: { playerColor?: 'WHITE' | 'BLACK'; gameId?: string; participantId?: string }) => {
                    if (!ack?.playerColor) return;
                    setViewerColor(ack.playerColor);
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem(
                            `tzdraft:game:${ack.gameId || targetGameId}:color`,
                            ack.playerColor,
                        );
                        if (ack.participantId) {
                            window.sessionStorage.setItem(
                                `tzdraft:game:${ack.gameId || targetGameId}:participantId`,
                                ack.participantId,
                            );
                        }
                    }
                },
            );
        };

        newSocket.on('connect', () => {
            const transport = (newSocket.io?.engine?.transport as any)?.name;
            if (process.env.NODE_ENV === 'development') {
                console.debug('Socket connected successfully:', newSocket.id, { transport });
            }
            setIsConnected(true);
            setActionError(null);

            if (gameIdRef.current) {
                console.log('Emitting joinGame for:', gameIdRef.current);
                joinGameRoom(gameIdRef.current);
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (!newSocket.active) {
                setActionError(`Connection failed: ${err.message}`);
                setIsConnected(false);
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.warn('Socket disconnected:', reason);
            setIsConnected(false);
            if (reason === 'io server disconnect') {
                newSocket.connect();
            }
        });

        return () => {
            console.log('Cleaning up socket...');
            newSocket.disconnect();
            setSocket(null);
        };
    }, [isHydrated, user?.id]);

    useEffect(() => {
        if (!socket) return;

        socket.on('joinedGame', (data: { gameId?: string; playerColor?: 'WHITE' | 'BLACK' }) => {
            if (!data?.playerColor) return;
            setViewerColor(data.playerColor);
            if (typeof window !== 'undefined' && data.gameId) {
                window.sessionStorage.setItem(`tzdraft:game:${data.gameId}:color`, data.playerColor);
                if (participantIdRef.current) {
                    window.sessionStorage.setItem(
                        `tzdraft:game:${data.gameId}:participantId`,
                        participantIdRef.current,
                    );
                }
            }
        });

        socket.on('gameStarted', (data: { gameId?: string; playerColor?: 'WHITE' | 'BLACK' }) => {
            if (!data?.gameId) return;
            if (data.playerColor && typeof window !== 'undefined') {
                window.sessionStorage.setItem(`tzdraft:game:${data.gameId}:color`, data.playerColor);
            }
            setResultCard(null);
            setRematchState('idle');
            setRematchError(null);
            router.push(`/game/${data.gameId}`);
        });

        socket.on('gameActivated', (data: { gameId?: string; status?: string; currentTurn?: string; clockInfo?: { whiteTimeMs: number; blackTimeMs: number }; serverTimeMs?: number }) => {
            if (!data?.gameId || data.gameId !== gameId) return;
            // Update local game status so the board becomes interactive
            setGame((prev) => {
                if (!prev) return prev;
                return { ...prev, status: 'ACTIVE' };
            });
            // Sync the initial clock snapshot from the server
            if (data.clockInfo && data.currentTurn) {
                syncClockSnapshot(
                    data.clockInfo,
                    data.currentTurn as 'WHITE' | 'BLACK',
                    Number(data.serverTimeMs || Date.now()),
                );
            }
        });

        socket.on('gameStateUpdated', (data: any) => {
            if (process.env.NODE_ENV === 'development') {
                console.debug('Game state updated');
            }
            setIsOptimistic(false);
            optimisticSnapshotRef.current = null;

            const nextBoard = data.board as Record<number, unknown> | undefined;
            const nextBoardSignature = nextBoard ? getBoardSignature(nextBoard) : null;
            const boardChanged =
                nextBoardSignature !== null && nextBoardSignature !== lastBoardSignatureRef.current;

            if (nextBoard && boardChanged) {
                lastBoardSignatureRef.current = nextBoardSignature;
                setPieces(nextBoard as any);
            }
            if (data.lastMove?.moveNumber && Number(data.lastMove.moveNumber) > 0) {
                setHasAnyMove(true);
            }
            if (data.clockInfo && (data.currentTurn === 'WHITE' || data.currentTurn === 'BLACK')) {
                syncClockSnapshot(data.clockInfo, data.currentTurn, Number(data.serverTimeMs));
            }
            setGame((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentTurn: data.currentTurn,
                    status: data.status,
                    winner: data.winner,
                    endReason: data.endReason,
                    clockInfo: data.clockInfo ?? prev.clockInfo,
                    board: boardChanged ? data.board : prev.board,
                } as any;
            });
        });

        socket.on('moveRejected', (data: { message?: string }) => {
            const snapshot = optimisticSnapshotRef.current;
            if (snapshot) {
                setPieces(snapshot.pieces);
                setGame(snapshot.game);
                const signature = getBoardSignature(snapshot.pieces as Record<number, unknown>);
                lastBoardSignatureRef.current = signature;
            }
            optimisticSnapshotRef.current = null;
            setIsOptimistic(false);
            setActionError(data?.message || 'Move rejected by server.');
        });

        // moveRollback: fired when the backend DB write fails after an
        // optimistic broadcast. Roll back the board to the last known state.
        socket.on('moveRollback', () => {
            const snapshot = optimisticSnapshotRef.current;
            if (snapshot) {
                setPieces(snapshot.pieces);
                setGame(snapshot.game);
                const signature = getBoardSignature(snapshot.pieces as Record<number, unknown>);
                lastBoardSignatureRef.current = signature;
            }
            optimisticSnapshotRef.current = null;
            setIsOptimistic(false);
            setActionError('Move could not be saved. Please try again.');
        });

        socket.on('drawOffered', (data: { gameId?: string; offeredBy?: string; expiresAt?: number }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            if (!data.offeredBy || !data.expiresAt) return;
            const mine = Boolean(participantIdRef.current && data.offeredBy === participantIdRef.current);
            setDrawOffer({ offeredBy: data.offeredBy, expiresAt: data.expiresAt, isMine: mine });
        });

        socket.on('drawDeclined', (data: { gameId?: string }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            setDrawOffer(null);
        });

        socket.on('drawCancelled', (data: { gameId?: string }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            setDrawOffer(null);
        });

        socket.on('drawOfferExpired', (data: { gameId?: string }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            setDrawOffer(null);
        });

        socket.on('gameOver', (data: GameOverEvent) => {
            console.log('Game Over:', data);
            setDisconnectCountdown(null);
            setSelfDisconnectCountdown(null);
            setDrawOffer(null);
            setRematchState('idle');
            setRematchError(null);
            setResultCard(buildResultCard(data));
        });

        socket.on('rematchRequested', (data: { gameId?: string }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            setRematchState('received');
            setRematchError(null);
        });

        socket.on('rematchExpired', (data: { gameId?: string }) => {
            if (!data?.gameId || data.gameId !== gameIdRef.current) return;
            setRematchState('idle');
            setRematchError('Rematch request expired.');
        });

        socket.on('playerDisconnected', (data: { playerId?: string; timeoutSec?: number; deadlineMs?: number }) => {
            if (!data?.playerId) return;

            const resolvedViewerId =
                participantIdRef.current ??
                (viewerColorRef.current === 'WHITE'
                    ? gamePlayersRef.current.whitePlayerId
                    : gamePlayersRef.current.blackPlayerId);
            const total = Number(data.timeoutSec) || 60;
            const remainingFromDeadline = Number.isFinite(data.deadlineMs)
                ? Math.max(1, Math.ceil((Number(data.deadlineMs) - Date.now()) / 1000))
                : total;
            const remaining = Math.max(1, remainingFromDeadline);

            if (resolvedViewerId && data.playerId === resolvedViewerId) {
                setSelfDisconnectCountdown(remaining);
                return;
            }

            setDisconnectCountdown(remaining);
        });

        socket.on('playerReconnected', (data: { playerId?: string }) => {
            if (!data?.playerId) return;

            const resolvedViewerId =
                participantIdRef.current ??
                (viewerColorRef.current === 'WHITE'
                    ? gamePlayersRef.current.whitePlayerId
                    : gamePlayersRef.current.blackPlayerId);

            if (resolvedViewerId && data.playerId === resolvedViewerId) {
                setSelfDisconnectCountdown(null);
                return;
            }

            setDisconnectCountdown(null);
        });

        socket.on('disconnect', () => {
            setSelfDisconnectCountdown(60);
        });

        socket.on('connect', () => {
            setSelfDisconnectCountdown(null);
        });

        return () => {
            socket.off('joinedGame');
            socket.off('gameStarted');
            socket.off('gameActivated');
            socket.off('gameStateUpdated');
            socket.off('gameOver');
            socket.off('drawOffered');
            socket.off('drawDeclined');
            socket.off('drawCancelled');
            socket.off('drawOfferExpired');
            socket.off('rematchRequested');
            socket.off('rematchExpired');
            socket.off('moveRejected');
            socket.off('moveRollback');
            socket.off('playerDisconnected');
            socket.off('playerReconnected');
            socket.off('disconnect');
        };
    }, [buildResultCard, getBoardSignature, router, socket, syncClockSnapshot]);

    useEffect(() => {
        if (selfDisconnectCountdown === null) return;
        const timer = window.setInterval(() => {
            setSelfDisconnectCountdown((prev) => {
                if (prev === null) return null;
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [selfDisconnectCountdown]);

    const handleMove = (from: number, to: number) => {
        if (!canInteract || !socket) return;
        if (isOptimistic) return;

        const flipped = viewerColor === 'BLACK';
        const fromBoardIndex = displayIndexToBoardIndex(from, flipped);
        const toBoardIndex = displayIndexToBoardIndex(to, flipped);

        const fromUiPos = boardIndexToPosition(fromBoardIndex);
        const toUiPos = boardIndexToPosition(toBoardIndex);
        const fromPos = fromUiPos ? uiPosToServerPos(fromUiPos) : null;
        const toPos = toUiPos ? uiPosToServerPos(toUiPos) : null;

        if (!fromPos || !toPos) {
            console.error('Invalid move coordinates (light square)');
            return;
        }

        const previousPieces = { ...pieces };
        const previousGame = game ? { ...game } : null;

        // Lock interaction immediately after sending a move request (even if we can't apply an optimistic board).
        // This prevents "double move" attempts before the server broadcasts the canonical next turn.
        optimisticSnapshotRef.current = { pieces: previousPieces, game: previousGame };
        setIsOptimistic(true);
        setActionError(null);

        const optimisticPieces = applyOptimisticUiMove({
            piecesByPosition: pieces,
            viewerColor,
            fromDisplay: from,
            toDisplay: to,
            flipped,
            moveCount: 0,
        });

        if (optimisticPieces) {
            setPieces(optimisticPieces);
            lastBoardSignatureRef.current = getBoardSignature(optimisticPieces as Record<number, unknown>);
            setGame((prev) =>
                prev
                    ? {
                        ...prev,
                        board: optimisticPieces as any,
                        currentTurn: prev.currentTurn === 'WHITE' ? 'BLACK' : 'WHITE',
                    }
                    : prev,
            );
            setHasAnyMove(true);
        }

        console.log(`Move attempt (Pos): ${fromPos}->${toPos}`);
        socket.emit(
            'makeMove',
            { gameId: gameIdRef.current, from: fromPos, to: toPos },
            (response?: { status?: string; message?: string }) => {
                if (response?.status !== 'error') return;
                console.warn('makeMove rejected:', response.message);
                const snapshot = optimisticSnapshotRef.current;
                if (snapshot) {
                    setPieces(snapshot.pieces);
                    setGame(snapshot.game);
                    lastBoardSignatureRef.current = getBoardSignature(snapshot.pieces as Record<number, unknown>);
                }
                optimisticSnapshotRef.current = null;
                setIsOptimistic(false);
                setActionError(response.message || 'Move rejected by server.');
            },
        );
    };

    const handleResign = async () => {
        if (!socket) {
            setActionError('Connection not ready.');
            return;
        }
        if (!gameIdRef.current) {
            setActionError('Game not found.');
            return;
        }

        setActionLoading('resign');
        setActionError(null);
        socket.emit('resignGame', { gameId: gameIdRef.current }, (response?: { status?: string; message?: string }) => {
            if (response?.status === 'error') {
                setActionError(response.message || 'Failed to resign game.');
            }
            setActionLoading(null);
        });
    };

    const handleRequestDraw = () => {
        if (!socket) return;
        if (!gameIdRef.current) return;
        socket.emit('requestDraw', { gameId: gameIdRef.current }, (response?: { status?: string; message?: string }) => {
            if (response?.status === 'error') {
                setActionError(response.message || 'Failed to request draw.');
            }
        });
    };

    const handleRespondDraw = (accept: boolean) => {
        if (!socket) return;
        if (!gameIdRef.current) return;
        socket.emit('respondDraw', { gameId: gameIdRef.current, accept }, (response?: { status?: string; message?: string }) => {
            if (response?.status === 'error') {
                setActionError(response.message || 'Failed to respond to draw.');
            } else {
                setDrawOffer(null);
            }
        });
    };

    const handleCancelDraw = () => {
        if (!socket) return;
        if (!gameIdRef.current) return;
        socket.emit('cancelDraw', { gameId: gameIdRef.current }, (response?: { status?: string; message?: string }) => {
            if (response?.status === 'error') {
                setActionError(response.message || 'Failed to cancel draw.');
            } else {
                setDrawOffer(null);
            }
        });
    };

    const handleAbort = async () => {
        if (!socket) {
            setActionError('Connection not ready.');
            return;
        }
        if (!gameIdRef.current) {
            setActionError('Game not found.');
            return;
        }

        setActionLoading('abort');
        setActionError(null);
        socket.emit('abortGame', { gameId: gameIdRef.current }, (response?: { status?: string; message?: string }) => {
            if (response?.status === 'error') {
                setActionError(response.message || 'Failed to abort game.');
            }
            setActionLoading(null);
        });
    };

    const handleRematch = () => {
        if (!socket) {
            setRematchError('Connection not ready.');
            return;
        }
        if (!gameIdRef.current) {
            setRematchError('Game not found.');
            return;
        }

        setRematchError(null);
        socket.emit(
            'requestRematch',
            { gameId: gameIdRef.current },
            (response?: { status?: string; message?: string; state?: 'waiting' | 'matched' }) => {
                if (response?.status === 'error') {
                    setRematchError(response.message || 'Failed to request rematch.');
                    return;
                }
                if (response?.state === 'waiting') {
                    setRematchState('waiting');
                }
            },
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-900 p-4">
                <LoadingBoard message="Loading match..." />
            </div>
        );
    }

    if (!game) {
        return <GameNotFound />;
    }

    // Helper to get player info
    const getPlayerInfo = (color: 'WHITE' | 'BLACK') => {
        const isWhite = color === 'WHITE';
        const playerId = isWhite ? game.whitePlayerId : game.blackPlayerId;
        const player = isWhite ? players?.white : players?.black;
        const guestName = isWhite ? game.whiteGuestName : game.blackGuestName;

        if (playerId === 'AI' || (!playerId && !guestName && game.gameType === 'AI')) {
            const bot = getBotByLevel(game.aiLevel || 1);
            return {
                name: bot.name,
                rating: bot.elo,
                avatarSrc: bot.avatarSrc,
                isAi: true
            };
        }

        return {
            name: player?.username || guestName || 'Guest',
            rating:
                typeof player?.rating === 'number'
                    ? player.rating
                    : typeof player?.rating === 'object' && player.rating
                        ? player.rating.rating
                        : (game.gameType === 'RANKED' ? 1200 : 'Unrated'),
            avatarSrc: undefined, // User avatar logic here if needed
            isAi: false
        };
    };

    const whiteInfo = getPlayerInfo('WHITE');
    const blackInfo = getPlayerInfo('BLACK');
    const topColor: 'WHITE' | 'BLACK' = viewerColor === 'WHITE' ? 'BLACK' : 'WHITE';
    const bottomColor: 'WHITE' | 'BLACK' = viewerColor;
    const topPlayer = topColor === 'WHITE' ? whiteInfo : blackInfo;
    const bottomPlayer = bottomColor === 'WHITE' ? whiteInfo : blackInfo;
    const currentTurn: 'WHITE' | 'BLACK' = (game.currentTurn === 'BLACK' ? 'BLACK' : 'WHITE');
    const isTopTurn = game.status === 'ACTIVE' && currentTurn === topColor;
    const isBottomTurn = game.status === 'ACTIVE' && currentTurn === bottomColor;
    const turnHighlight = (isTurn: boolean) =>
        isTurn
            ? 'border-emerald-400/60 bg-neutral-800/60 ring-1 ring-emerald-400/30 shadow-[0_0_28px_rgba(52,211,153,0.12)]'
            : 'border-neutral-700/50 bg-neutral-800/50';
    const turnHighlightMobile = (isTurn: boolean) =>
        isTurn
            ? 'border-emerald-400/60 bg-neutral-900/50 ring-1 ring-emerald-400/30'
            : 'border-neutral-700/50 bg-neutral-900/40';

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getPlayerTime = (color: 'WHITE' | 'BLACK') => {
        if (!game?.clockInfo) return "10:00"; // Fallback
        const source = displayClock || game.clockInfo;
        const ms = color === 'WHITE' ? source.whiteTimeMs : source.blackTimeMs;
        return formatTime(ms);
    };





    return (
        <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">
                {/* Top Player */}
                <div className={`hidden md:flex flex-col gap-4 w-64 p-4 rounded-xl border ${turnHighlight(isTopTurn)}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-2xl">
                            {topPlayer.isAi && topPlayer.avatarSrc ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={topPlayer.avatarSrc}
                                        alt={topPlayer.name}
                                        fill
                                        sizes="40px"
                                        className="object-cover object-[50%_60%] rounded-full"
                                    />
                                </div>
                            ) : (
                                <User className="h-6 w-6 text-neutral-200" aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-bold text-neutral-200">{topPlayer.name}</div>
                                <ColorBadge color={topColor} />
                            </div>
                            <div className="text-xs text-neutral-500">
                                {game.gameType === 'RANKED' ? `Rating: ${topPlayer.rating}` : 'Casual'}
                            </div>
                        </div>
                    </div>
                    <div className={`bg-neutral-900 rounded p-2 text-center font-mono text-xl ${isTopTurn ? 'text-emerald-200' : 'text-neutral-400'}`}>
                        {getPlayerTime(topColor)}
                    </div>
                </div>

                {/* Game Board */}
                <div className="flex-1 max-w-[650px] w-full mx-auto">
                    <div className={`md:hidden mb-2 rounded-xl border backdrop-blur px-3 py-2 flex items-center justify-between gap-3 ${turnHighlightMobile(isTopTurn)}`}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                                {topPlayer.isAi && topPlayer.avatarSrc ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={topPlayer.avatarSrc}
                                            alt={topPlayer.name}
                                            fill
                                            sizes="36px"
                                            className="object-cover object-[50%_60%] rounded-full"
                                        />
                                    </div>
                                ) : (
                                    <User className="h-5 w-5 text-neutral-200" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="font-semibold text-neutral-200 truncate">{topPlayer.name}</div>
                                    <ColorBadge color={topColor} />
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {game.gameType === 'RANKED' ? `Rating: ${topPlayer.rating}` : 'Casual'}
                                </div>
                            </div>
                        </div>
                        <div className={`shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base border ${isTopTurn ? 'text-emerald-100 border-emerald-400/40' : 'text-neutral-100 border-neutral-700/60'}`}>
                            {getPlayerTime(topColor)}
                        </div>
                    </div>

                    <Board
                        pieces={frontendPieces}
                        onMove={handleMove}
                        flipped={viewerColor === 'BLACK'}
                        readOnly={!canInteract}
                        legalMoves={legalMoves}
                        forcedPieces={forcedPieces}
                    />

                    <div className="mt-3 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setConfirmAction(hasAnyMove ? 'resign' : 'abort')}
                            disabled={actionLoading !== null}
                            className={
                                hasAnyMove
                                    ? "rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                                    : "rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-60"
                            }
                        >
                            {hasAnyMove
                                ? actionLoading === 'resign'
                                    ? 'Resigning...'
                                    : 'Resign'
                                : actionLoading === 'abort'
                                    ? 'Aborting...'
                                    : 'Abort Game'}
                        </button>
                        <button
                            onClick={() => {
                                if (drawOffer?.isMine) {
                                    handleCancelDraw();
                                } else {
                                    handleRequestDraw();
                                }
                            }}
                            disabled={actionLoading !== null || !canRequestDraw}
                            className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700 disabled:opacity-60"
                        >
                            {drawOffer?.isMine ? 'Cancel Draw' : 'Offer Draw'}
                        </button>
                    </div>
                    {drawOffer?.isMine && (
                        <div className="mt-2 rounded-lg border border-neutral-700/60 bg-neutral-900/40 px-3 py-2 text-center text-sm text-neutral-200">
                            Draw offer sent.
                        </div>
                    )}
                    {actionError && (
                        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                            {actionError}
                        </div>
                    )}
                    {disconnectCountdown !== null && (
                        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
                            Opponent disconnected. Auto-forfeit in {disconnectCountdown}s.
                        </div>
                    )}
                    {selfDisconnectCountdown !== null && (
                        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                            You are disconnected. Reconnect within {selfDisconnectCountdown}s to avoid forfeit.
                        </div>
                    )}

                    <div className={`md:hidden mt-2 rounded-xl border backdrop-blur px-3 py-2 flex items-center justify-between gap-3 ${turnHighlightMobile(isBottomTurn)}`}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center overflow-hidden shrink-0">
                                {bottomPlayer.isAi && bottomPlayer.avatarSrc ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={bottomPlayer.avatarSrc}
                                            alt={bottomPlayer.name}
                                            fill
                                            sizes="36px"
                                            className="object-cover object-[50%_60%] rounded-full"
                                        />
                                    </div>
                                ) : (
                                    <User className="h-5 w-5 text-white" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="font-semibold text-neutral-200 truncate">{bottomPlayer.name}</div>
                                    <ColorBadge color={bottomColor} />
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {game.gameType === 'RANKED' ? `Rating: ${bottomPlayer.rating}` : 'Casual'}
                                </div>
                            </div>
                        </div>
                        <div className={`shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base border ${isBottomTurn ? 'text-emerald-100 border-emerald-400/40' : 'text-neutral-100 border-neutral-700/60'}`}>
                            {getPlayerTime(bottomColor)}
                        </div>
                    </div>
                </div>

                {/* Bottom Player */}
                <div className={`hidden md:flex flex-col gap-4 w-64 p-4 rounded-xl border ${turnHighlight(isBottomTurn)}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-2xl">
                            {bottomPlayer.isAi && bottomPlayer.avatarSrc ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={bottomPlayer.avatarSrc}
                                        alt={bottomPlayer.name}
                                        fill
                                        sizes="40px"
                                        className="object-cover object-[50%_60%] rounded-full"
                                    />
                                </div>
                            ) : (
                                <User className="h-6 w-6 text-white" aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-bold text-neutral-200">{bottomPlayer.name}</div>
                                <ColorBadge color={bottomColor} />
                            </div>
                            <div className="text-xs text-neutral-500">
                                {game.gameType === 'RANKED' ? `Rating: ${bottomPlayer.rating}` : 'Casual'}
                            </div>
                        </div>
                    </div>
                    <div className={`bg-neutral-800 rounded p-2 text-center font-mono text-xl border ${isBottomTurn ? 'text-emerald-100 border-emerald-400/40' : 'text-white border-neutral-600'}`}>
                        {getPlayerTime(bottomColor)}
                    </div>
                </div>
            </div>

            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                Confirm Action
                            </div>
                            <div className="mt-2 text-xl font-bold text-neutral-100">
                                {confirmAction === 'resign'
                                    ? 'Are you sure you want to resign this game?'
                                    : 'Abort this game? This only works before any move is made.'}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    const action = confirmAction;
                                    setConfirmAction(null);
                                    if (action === 'resign') {
                                        await handleResign();
                                    } else {
                                        await handleAbort();
                                    }
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700 disabled:opacity-60"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setConfirmAction(null)}
                                disabled={actionLoading !== null}
                                className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {drawOffer && !drawOffer.isMine && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">Draw Offer</div>
                            <div className="mt-2 text-2xl font-bold text-neutral-100">Opponent offered a draw</div>
                            <div className="mt-2 text-sm text-neutral-400">Do you want to accept?</div>
                        </div>
                        <div className="p-6 flex gap-3 justify-end">
                            <button
                                onClick={() => handleRespondDraw(false)}
                                className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => handleRespondDraw(true)}
                                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resultCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                Game Result
                            </div>
                            <div className="mt-2 text-2xl font-bold text-neutral-100">
                                {resultCard.title}
                            </div>
                            <div className="mt-2 text-sm text-neutral-400">
                                {resultCard.detail}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            {rematchState === 'received' && (
                                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm font-semibold text-emerald-200">
                                    Opponent requested a rematch with swapped colors.
                                </div>
                            )}
                            <button
                                onClick={handleRematch}
                                disabled={rematchState === 'waiting'}
                                className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700 disabled:opacity-60"
                            >
                                {rematchState === 'received'
                                    ? 'Accept Rematch'
                                    : rematchState === 'waiting'
                                        ? 'Waiting for opponent...'
                                        : 'Rematch'}
                            </button>
                            {rematchError && (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                                    {rematchError}
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/game/online')}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25"
                            >
                                New Match Online
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800"
                            >
                                Home
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
