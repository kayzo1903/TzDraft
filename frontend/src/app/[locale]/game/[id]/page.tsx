"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Board } from "@/components/game/Board";
import { ConnectionStatus } from "@/components/game/ConnectionStatus";
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { useSocket } from "@/hooks/useSocket";
import { PlayerColor, Winner } from "@tzdraft/cake-engine";
import {
  Check,
  Copy,
  Crown,
  Flag,
  Handshake,
  Loader2,
  RotateCcw,
  Skull,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import clsx from "clsx";
import Image from "next/image";
import { getBotByLevel } from "@/lib/game/bots";
import QRCode from "react-qr-code";
import { gameService } from "@/services/game.service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";
import { VoiceChatControls } from "@/components/game/VoiceChatControls";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/* ─── Waiting Banner ────────────────────────────────────────────────────── */

function WaitingBanner({
  gameId,
  locale,
  inviteCode,
}: {
  gameId: string;
  locale: string;
  inviteCode: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/game/${gameId}${inviteCode ? `?code=${inviteCode}` : ""}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-950/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-700/60 bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
        <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-5">
          <div className="w-16 h-16 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <Wifi className="w-8 h-8 text-orange-400 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white">Waiting for opponent</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Share the link or scan the QR code.
            </p>
          </div>

          {/* Invite code badge */}
          {inviteCode && (
            <div className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Invite code</div>
              <div className="font-mono text-2xl tracking-[0.3em] text-white font-bold">{inviteCode}</div>
            </div>
          )}

          {/* QR code */}
          {shareUrl && (
            <div className="rounded-xl border border-neutral-700 bg-white p-3">
              <QRCode value={shareUrl} size={140} />
            </div>
          )}

          {/* Copy link */}
          <button
            type="button"
            onClick={copyLink}
            className="w-full flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-left hover:border-neutral-600 transition"
          >
            <span className="flex-1 text-sm text-neutral-300 truncate">{shareUrl}</span>
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-neutral-500 shrink-0" />
            )}
          </button>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      </div>
    </div>
  );
}

/* ─── Result Card ───────────────────────────────────────────────────────── */

function OnlineResultCard({
  winner,
  reason,
  myColor,
  moveCount,
  myUserId,
  rematchOffer,
  onOfferRematch,
  onAcceptRematch,
  onDeclineRematch,
  onCancelRematch,
  onSetupFriend,
}: {
  winner: Winner;
  reason?: string;
  myColor: PlayerColor | null;
  moveCount: number;
  myUserId: string | null;
  rematchOffer: { offeredByUserId: string | null };
  onOfferRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onCancelRematch: () => void;
  onSetupFriend: () => void;
}) {
  const isAborted = reason === "aborted";
  const isDraw = !isAborted && winner === Winner.DRAW;
  const iWon =
    !isDraw &&
    !isAborted &&
    myColor !== null &&
    ((winner === Winner.WHITE && myColor === PlayerColor.WHITE) ||
      (winner === Winner.BLACK && myColor === PlayerColor.BLACK));

  const outcome = isAborted
    ? "aborted"
    : isDraw
    ? "draw"
    : myColor === null
    ? "draw"
    : iWon
    ? "win"
    : "loss";

  const cfg = {
    win: {
      label: "Victory!",
      icon: <Crown className="w-8 h-8" />,
      borderColor: "border-amber-500/40",
      iconBg: "bg-amber-500/20 border-amber-500/40",
      iconColor: "text-amber-300",
      accentText: "text-amber-300",
      glow: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
      headerBg: "bg-gradient-to-br from-amber-950/80 via-neutral-900 to-neutral-900",
      sub: "You win",
    },
    loss: {
      label: "Defeated",
      icon: <Skull className="w-8 h-8" />,
      borderColor: "border-rose-500/30",
      iconBg: "bg-rose-500/15 border-rose-500/30",
      iconColor: "text-rose-400",
      accentText: "text-rose-400",
      glow: "shadow-[0_0_40px_rgba(244,63,94,0.10)]",
      headerBg: "bg-gradient-to-br from-rose-950/80 via-neutral-900 to-neutral-900",
      sub: "Better luck next time",
    },
    draw: {
      label: "Draw",
      icon: <Handshake className="w-8 h-8" />,
      borderColor: "border-sky-500/30",
      iconBg: "bg-sky-500/15 border-sky-500/30",
      iconColor: "text-sky-400",
      accentText: "text-sky-400",
      glow: "shadow-[0_0_40px_rgba(56,189,248,0.10)]",
      headerBg: "bg-gradient-to-br from-sky-950/80 via-neutral-900 to-neutral-900",
      sub: "The game ended in a draw",
    },
    aborted: {
      label: "Game Aborted",
      icon: <X className="w-8 h-8" />,
      borderColor: "border-neutral-600/60",
      iconBg: "bg-neutral-700/40 border-neutral-600/60",
      iconColor: "text-neutral-400",
      accentText: "text-neutral-300",
      glow: "",
      headerBg: "bg-gradient-to-br from-neutral-800/80 via-neutral-900 to-neutral-900",
      sub: "The game was cancelled before it started",
    },
  }[outcome];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div
        className={clsx(
          "w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border",
          cfg.borderColor,
          cfg.glow,
          "bg-neutral-950",
        )}
      >
        <div className={clsx("flex flex-col items-center py-10 gap-3", cfg.headerBg)}>
          <div
            className={clsx(
              "flex items-center justify-center w-16 h-16 rounded-full border-2",
              cfg.iconBg,
              cfg.iconColor,
            )}
          >
            {cfg.icon}
          </div>
          <div className={clsx("text-3xl font-black tracking-tight", cfg.accentText)}>
            {cfg.label}
          </div>
          <div className="text-sm text-white/70">{cfg.sub}</div>
        </div>

        {!isAborted && (
          <div className="grid grid-cols-2 divide-x divide-neutral-800 border-b border-neutral-800">
            {[
              { label: "Moves", value: moveCount },
              { label: "Mode", value: "Online PvP" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
                <div className="text-base font-bold text-white mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 flex flex-col gap-2.5">
          {/* Rematch section — only for finished (non-aborted) games with actual players */}
          {!isAborted && myColor !== null && (() => {
            const iOffered = rematchOffer.offeredByUserId === myUserId ||
              rematchOffer.offeredByUserId === "self";
            const theyOffered = rematchOffer.offeredByUserId !== null && !iOffered;

            if (theyOffered) {
              return (
                <div className="flex flex-col gap-2 rounded-xl border border-orange-500/30 bg-orange-500/8 p-3">
                  <div className="text-xs text-orange-300 text-center font-semibold">
                    <RotateCcw className="inline w-3.5 h-3.5 mr-1 mb-0.5" />
                    Opponent wants a rematch!
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onAcceptRematch}
                      className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={onDeclineRematch}
                      className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-300 hover:bg-neutral-700 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            }

            if (iOffered) {
              return (
                <div className="flex flex-col gap-2 rounded-xl border border-neutral-700 bg-neutral-800/40 p-3">
                  <div className="text-xs text-neutral-400 text-center">
                    Rematch offered — waiting for opponent…
                  </div>
                  <button
                    onClick={onCancelRematch}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-300 hover:bg-neutral-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              );
            }

            return (
              <button
                onClick={onOfferRematch}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/8 px-4 py-2.5 text-sm font-semibold text-orange-300 hover:bg-orange-500/15 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Rematch
              </button>
            );
          })()}

          <button
            onClick={onSetupFriend}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
          >
            <Users className="w-4 h-4 text-neutral-400" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Player Panel ──────────────────────────────────────────────────────── */

function PlayerPanel({
  username,
  rating,
  avatarSrc,
  isAi,
  isActive,
  timeSeconds,
  compact,
}: {
  username: string;
  rating: number;
  avatarSrc?: string;
  isAi?: boolean;
  isActive: boolean;
  timeSeconds: number | null;
  compact?: boolean;
}) {
  const size = compact ? "w-9 h-9" : "w-10 h-10";
  const ringClass = isActive ? "ring-2 ring-orange-500/60" : "";

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={clsx(
          size,
          "rounded-full flex items-center justify-center overflow-hidden shrink-0",
          isActive ? "bg-orange-500" : "bg-neutral-600",
          ringClass,
        )}
      >
        {isAi && avatarSrc ? (
          <div className="relative w-full h-full">
            <Image src={avatarSrc} alt={username} fill sizes="40px" className="object-cover object-top" />
          </div>
        ) : (
          <User className={clsx(compact ? "w-4 h-4" : "w-5 h-5", isActive ? "text-white" : "text-neutral-200")} />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-neutral-200 truncate">{username}</div>
        <div className="text-xs text-neutral-500">{rating}</div>
      </div>
    </div>
  );
}

/* ─── Draw offer banner ─────────────────────────────────────────────────── */

function DrawOfferBanner({
  iAmOffering,
  onAccept,
  onDecline,
  onCancel,
}: {
  iAmOffering: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 flex flex-col gap-2">
      {iAmOffering ? (
        <>
          <div className="text-xs text-sky-300 text-center font-semibold">
            Draw offer sent — waiting for opponent…
          </div>
          <button
            onClick={onCancel}
            className="w-full rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition"
          >
            Cancel Offer
          </button>
        </>
      ) : (
        <>
          <div className="text-xs text-sky-200 text-center font-semibold">
            <Handshake className="inline w-3.5 h-3.5 mr-1 mb-0.5" />
            Opponent offers a draw
          </div>
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition"
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Game Actions ──────────────────────────────────────────────────────── */

type ConfirmAction = "resign" | "abort" | null;

function GameActions({
  gameId,
  moveCount,
  drawOfferPending,
  iAmOffering,
  onDrawOffer,
  onCancelDraw,
  onAcceptDraw,
  onDeclineDraw,
  onDone,
}: {
  gameId: string;
  /** Total moves played in the game. 0 = no moves yet → show Abort; >0 → show Resign. */
  moveCount: number;
  drawOfferPending: boolean;
  iAmOffering: boolean;
  onDrawOffer: () => void;
  onCancelDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (action: ConfirmAction) => {
    if (!action) return;
    setLoading(true);
    try {
      if (action === "resign") await gameService.resign(gameId);
      else if (action === "abort") await gameService.abort(gameId);
      onDone();
    } catch {
      // Server will respond with error; just close confirm
    } finally {
      setLoading(false);
      setConfirming(null);
    }
  };

  const cfg: Record<
    NonNullable<ConfirmAction>,
    { label: string; desc: string; confirmLabel: string; color: string }
  > = {
    abort: {
      label: "Abort",
      desc: "Cancel this game before it starts. Both players will be returned to the lobby.",
      confirmLabel: "Abort Game",
      color: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
    },
    resign: {
      label: "Resign",
      desc: "Forfeit the game. Your opponent wins.",
      confirmLabel: "Resign",
      color: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
    },
  };

  if (confirming) {
    const c = cfg[confirming];
    return (
      <div className="rounded-xl border border-neutral-700/60 bg-neutral-900 p-4 flex flex-col gap-3">
        <div className="text-xs text-neutral-400 leading-relaxed">{c.desc}</div>
        <div className="flex gap-2">
          <button
            onClick={() => execute(confirming)}
            disabled={loading}
            className={clsx(
              "flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition",
              c.color,
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : c.confirmLabel}
          </button>
          <button
            onClick={() => setConfirming(null)}
            disabled={loading}
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Draw offer banner — shown when any draw offer is active and moves have started */}
      {drawOfferPending && moveCount > 0 && (
        <DrawOfferBanner
          iAmOffering={iAmOffering}
          onAccept={onAcceptDraw}
          onDecline={onDeclineDraw}
          onCancel={onCancelDraw}
        />
      )}

      {/* Abort: no moves played yet (game can still be cancelled cleanly) */}
      {moveCount === 0 && (
        <button
          onClick={() => setConfirming("abort")}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/15 transition"
        >
          <X className="w-4 h-4" />
          Abort Game
        </button>
      )}

      {/* Resign + Draw: only available once at least one move has been played */}
      {moveCount > 0 && (
        <>
          {!drawOfferPending && (
            <button
              onClick={onDrawOffer}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/8 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/15 transition"
            >
              <Handshake className="w-4 h-4" />
              Offer Draw
            </button>
          )}
          <button
            onClick={() => setConfirming("resign")}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/15 transition"
          >
            <Flag className="w-4 h-4" />
            Resign
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function OnlineGamePage() {
  const { id: gameId, locale } = useParams<{ id: string; locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const joinAttemptedRef = useRef(false);

  const {
    state,
    gameData,
    players,
    pieces,
    lastMove,
    capturedGhosts,
    legalMoves,
    forcedPieces,
    flipBoard,
    makeMove,
    offerDraw,
    acceptDraw,
    declineDraw,
    cancelDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    cancelRematch,
    refetch,
  } = useOnlineGame(gameId);

  const { user } = useAuthStore();
  const { connected, reconnecting } = useSocket();
  const drawOfferPending = state.drawOffer.offeredByUserId !== null;
  const iAmOffering = state.drawOffer.offeredByUserId === user?.id;

  // Navigate to the new game when rematch is accepted by either player
  useEffect(() => {
    if (state.rematchNewGameId) {
      router.push(`/${locale}/game/${state.rematchNewGameId}`);
    }
  }, [state.rematchNewGameId, router, locale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-join when friend opens the invite link (?code=XXXXXX)
  // If not authenticated, auto-create a guest account first
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || state.myColor !== null || joinAttemptedRef.current) return;
    if (!state.isWaiting) return;

    joinAttemptedRef.current = true;

    const doJoin = () =>
      gameService
        .joinInvite(code)
        .then(() => refetch())
        .catch(() => refetch());

    if (isAuthenticated) {
      doJoin();
    } else {
      // Create a guest account then join
      authClient
        .createGuest()
        .then(() => doJoin())
        .catch(() => { });
    }
  }, [searchParams, isAuthenticated, state.isWaiting, state.myColor, refetch]);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflowY;
    const prevBody = document.body.style.overflowY;
    const prevScroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overflowY = prevHtml;
      document.body.style.overflowY = prevBody;
      document.body.style.overscrollBehavior = prevScroll;
    };
  }, []);

  const game = gameData as Record<string, unknown> | null;

  const getPlayerInfo = (color: "WHITE" | "BLACK") => {
    if (!game) return { name: "...", rating: 1200, avatarSrc: undefined, isAi: false };
    const isWhite = color === "WHITE";
    const playerId = isWhite ? game.whitePlayerId : game.blackPlayerId;
    const player = isWhite ? players?.white : players?.black;

    if (playerId === "AI") {
      const bot = getBotByLevel((game.aiLevel as number) || 1);
      return { name: bot.name, rating: bot.elo, avatarSrc: bot.avatarSrc, isAi: true };
    }

    const ratingRaw = (player as any)?.rating;
    const rating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : typeof ratingRaw === "object" && ratingRaw?.rating
          ? ratingRaw.rating
          : 1200;

    const username = (player as any)?.username || (player as any)?.displayName;

    return {
      name: username || (playerId ? "Guest" : "Waiting..."),
      rating,
      avatarSrc: undefined,
      isAi: false,
    };
  };

  const whiteInfo = getPlayerInfo("WHITE");
  const blackInfo = getPlayerInfo("BLACK");

  // When myColor is BLACK, my pieces are at bottom → bottom=BLACK, top=WHITE
  const bottomColor = state.myColor ?? PlayerColor.WHITE;
  const topColor = bottomColor === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const bottomInfo = bottomColor === PlayerColor.WHITE ? whiteInfo : blackInfo;
  const topInfo = topColor === PlayerColor.WHITE ? whiteInfo : blackInfo;

  const timeFor = (color: PlayerColor) => {
    if (!state.timeLeft) return "–";
    const secs =
      color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK;
    return secs != null ? formatTime(secs) : "–";
  };

  const setupFriendPath = `/${locale}/game/setup-friend`;

  // Voice chat: registered users only, both players present, PvP game, in-game
  const isGuest = user?.phoneNumber?.startsWith("GUEST_") ?? true;
  const isPvP = !topInfo.isAi && !bottomInfo.isAi;
  const showVoiceChat =
    !isGuest && isPvP && state.myColor !== null && !state.isWaiting;

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-neutral-300">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
      <ConnectionStatus connected={connected} reconnecting={reconnecting} />
      <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">

        {/* Desktop left sidebar — top player (opponent) */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <PlayerPanel
            username={topInfo.name}
            rating={topInfo.rating}
            avatarSrc={topInfo.avatarSrc}
            isAi={topInfo.isAi}
            isActive={state.currentPlayer === topColor && !state.isWaiting}
            timeSeconds={null}
          />
          <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
            {timeFor(topColor)}
          </div>
        </div>

        {/* Board column */}
        <div className="flex-1 max-w-[650px] w-full mx-auto">
          {/* Mobile top bar */}
          <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <PlayerPanel
              username={topInfo.name}
              rating={topInfo.rating}
              avatarSrc={topInfo.avatarSrc}
              isAi={topInfo.isAi}
              isActive={state.currentPlayer === topColor && !state.isWaiting}
              timeSeconds={null}
              compact
            />
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(topColor)}
            </div>
          </div>

          <Board
            onMove={makeMove}
            pieces={pieces}
            lastMove={lastMove}
            capturedGhosts={capturedGhosts}
            legalMoves={legalMoves}
            forcedPieces={forcedPieces}
            flipped={flipBoard}
            readOnly={
              state.currentPlayer !== state.myColor ||
              state.isWaiting ||
              Boolean(state.result)
            }
          />

          {/* Mobile bottom bar */}
          <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <PlayerPanel
              username={bottomInfo.name}
              rating={bottomInfo.rating}
              avatarSrc={bottomInfo.avatarSrc}
              isAi={bottomInfo.isAi}
              isActive={state.currentPlayer === bottomColor && !state.isWaiting}
              timeSeconds={null}
              compact
            />
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(bottomColor)}
            </div>
          </div>

          {/* Error toast */}
          {state.error && (
            <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 text-center">
              {state.error}
            </div>
          )}

          {/* Submitting indicator removed – optimistic update makes this redundant */}
        </div>

        {/* Desktop right sidebar — bottom player (me) */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <PlayerPanel
            username={bottomInfo.name}
            rating={bottomInfo.rating}
            avatarSrc={bottomInfo.avatarSrc}
            isAi={bottomInfo.isAi}
            isActive={state.currentPlayer === bottomColor && !state.isWaiting}
            timeSeconds={null}
          />
          <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
            {timeFor(bottomColor)}
          </div>
          {/* Action buttons */}
          {!state.result && state.myColor !== null && (
            <GameActions
              gameId={gameId}
              moveCount={state.moveCount}
              drawOfferPending={drawOfferPending}
              iAmOffering={iAmOffering}
              onDrawOffer={offerDraw}
              onCancelDraw={cancelDraw}
              onAcceptDraw={acceptDraw}
              onDeclineDraw={declineDraw}
              onDone={refetch}
            />
          )}
          {/* Voice chat — registered PvP players only */}
          {showVoiceChat && <VoiceChatControls gameId={gameId} />}
        </div>
      </div>

      {/* Opponent disconnect banner */}
      {!state.opponentConnected && !state.result && !state.isWaiting && (
        <div className="w-full max-w-[650px] rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300 text-center">
          Opponent disconnected — will auto-resign in 60 s if they don't return
        </div>
      )}

      {/* Mobile action buttons */}
      {!state.result && state.myColor !== null && (
        <div className="md:hidden w-full max-w-[650px] flex flex-col gap-2">
          <GameActions
            gameId={gameId}
            moveCount={state.moveCount}
            drawOfferPending={drawOfferPending}
            iAmOffering={iAmOffering}
            onDrawOffer={offerDraw}
            onCancelDraw={cancelDraw}
            onAcceptDraw={acceptDraw}
            onDeclineDraw={declineDraw}
            onDone={refetch}
          />
          {/* Voice chat — registered PvP players only */}
          {showVoiceChat && <VoiceChatControls gameId={gameId} />}
        </div>
      )}

      {/* Waiting for opponent overlay */}
      {state.isWaiting && !state.result && (
        <WaitingBanner
          gameId={gameId}
          locale={locale}
          inviteCode={(game?.inviteCode as string | null) ?? null}
        />
      )}

      {/* Game result */}
      {state.result && !state.isWaiting && (
        <OnlineResultCard
          winner={state.result.winner}
          reason={state.result.reason}
          myColor={state.myColor}
          moveCount={state.moveCount}
          myUserId={user?.id ?? null}
          rematchOffer={state.rematchOffer}
          onOfferRematch={offerRematch}
          onAcceptRematch={acceptRematch}
          onDeclineRematch={declineRematch}
          onCancelRematch={cancelRematch}
          onSetupFriend={() => router.push(setupFriendPath)}
        />
      )}
    </main>
  );
}
