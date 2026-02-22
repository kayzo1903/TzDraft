"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { friendService } from "@/services/friend.service";
import { useRouter } from "@/i18n/routing";
import {
  Loader2,
  User,
  Copy,
  CheckCircle2,
  Share2,
  X,
  Settings2,
  ShieldQuestion,
  PlayCircle,
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateGuestId } from "@/lib/auth/guest-id";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";

type InviteData = {
  id: string;
  status: string;
  gameId?: string | null;
  inviteToken?: string;
  initialTimeMs: number;
  rated: boolean;
  allowSpectators: boolean;
  host: { id: string; displayName: string };
  guest?: { id: string; displayName: string } | null;
};

export default function FriendlyWaitPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();
  const socket = useSocket();
  const { user, isHydrated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [copied, setCopied] = useState(false);

  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentPresent, setOpponentPresent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(
    null,
  );
  const [selfDisconnectCountdown, setSelfDisconnectCountdown] = useState<
    number | null
  >(null);

  const participantId = isHydrated ? (user?.id ?? getOrCreateGuestId()) : null;
  const isHost = participantId === inviteData?.host?.id;

  const loadInvite = useCallback(async () => {
    if (!inviteId) return;
    try {
      setLoading(true);
      setError(null);
      const guestId = !user?.id && isHydrated ? getOrCreateGuestId() : undefined;
      const invite = await friendService.getFriendlyInviteById(inviteId, guestId);
      setInviteData(invite);

      if (invite?.status === "ACCEPTED") {
        setOpponentPresent(true);
        if (invite.guest?.displayName) setOpponentName(invite.guest.displayName);
      }

      if (invite?.inviteToken && typeof window !== "undefined") {
        const origin = window.location.origin;
        const locale = window.location.pathname.split("/")[1] || "sw";
        setInviteUrl(`${origin}/${locale}/game/friendly/${invite.inviteToken}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load invite status");
    } finally {
      setLoading(false);
    }
  }, [inviteId, user?.id, isHydrated]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  const hasJoinedWaitroom = useRef(false);
  const doJoinWaitingRoom = useCallback(() => {
    if (!socket || !inviteId || !inviteData || !participantId) return;
    const displayName =
      user?.displayName ??
      (participantId === inviteData.host?.id
        ? inviteData.host?.displayName
        : inviteData.guest?.displayName) ??
      "Player";
    socket.emit("joinWaitingRoom", { inviteId, displayName });
    hasJoinedWaitroom.current = true;
  }, [socket, inviteId, inviteData, participantId, user]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => doJoinWaitingRoom();
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, doJoinWaitingRoom]);

  useEffect(() => {
    if (!socket || !inviteId) return;

    const onPresence = (data: {
      inviteId?: string;
      participantId?: string;
      displayName?: string;
    }) => {
      if (data.inviteId !== inviteId) return;
      if (data.participantId && data.participantId !== participantId) {
        setOpponentPresent(true);
        if (data.displayName) setOpponentName(data.displayName);
      }
    };

    const onOpponentJoined = (data: {
      inviteId?: string;
      guestDisplayName?: string;
      gameId?: string;
    }) => {
      if (data.inviteId !== inviteId) return;
      setOpponentPresent(true);
      if (data.guestDisplayName) setOpponentName(data.guestDisplayName);
      loadInvite();
    };

    const onGameActivated = (data: { gameId?: string }) => {
      if (!data?.gameId) return;
      router.push(`/game/${data.gameId}`);
    };

    const onInviteDeclined = (data: { inviteId?: string }) => {
      if (data?.inviteId !== inviteId) return;
      setOpponentPresent(false);
      setError("Your friend declined the challenge.");
      loadInvite();
    };

    const onPlayerDisconnected = (data: {
      gameId?: string;
      playerId?: string;
      timeoutSec?: number;
      deadlineMs?: number;
    }) => {
      if (!data?.playerId) return;
      if (inviteData?.gameId && data.gameId && data.gameId !== inviteData.gameId) {
        return;
      }
      const total = Number(data.timeoutSec) || 60;
      const remainingFromDeadline = Number.isFinite(data.deadlineMs)
        ? Math.max(1, Math.ceil((Number(data.deadlineMs) - Date.now()) / 1000))
        : total;
      const remaining = Math.max(1, remainingFromDeadline);
      if (participantId && data.playerId === participantId) {
        setSelfDisconnectCountdown(remaining);
        return;
      }
      setDisconnectCountdown(remaining);
    };

    const onPlayerReconnected = (data: { gameId?: string; playerId?: string }) => {
      if (!data?.playerId) return;
      if (inviteData?.gameId && data.gameId && data.gameId !== inviteData.gameId) {
        return;
      }
      if (participantId && data.playerId === participantId) {
        setSelfDisconnectCountdown(null);
        return;
      }
      setDisconnectCountdown(null);
    };

    const onSocketDisconnect = () => setSelfDisconnectCountdown(60);
    const onSocketConnect = () => setSelfDisconnectCountdown(null);

    socket.on("waitingRoomPresence", onPresence);
    socket.on("friendlyInviteOpponentJoined", onOpponentJoined);
    socket.on("gameActivated", onGameActivated);
    socket.on("friendlyInviteDeclined", onInviteDeclined);
    socket.on("playerDisconnected", onPlayerDisconnected);
    socket.on("playerReconnected", onPlayerReconnected);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("connect", onSocketConnect);

    if (socket.connected && !hasJoinedWaitroom.current) {
      doJoinWaitingRoom();
    }

    return () => {
      socket.off("waitingRoomPresence", onPresence);
      socket.off("friendlyInviteOpponentJoined", onOpponentJoined);
      socket.off("gameActivated", onGameActivated);
      socket.off("friendlyInviteDeclined", onInviteDeclined);
      socket.off("playerDisconnected", onPlayerDisconnected);
      socket.off("playerReconnected", onPlayerReconnected);
      socket.off("disconnect", onSocketDisconnect);
      socket.off("connect", onSocketConnect);
    };
  }, [
    socket,
    inviteId,
    inviteData?.gameId,
    participantId,
    router,
    doJoinWaitingRoom,
    loadInvite,
  ]);

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

  useEffect(() => {
    if (!starting) return;
    const interval = setInterval(async () => {
      try {
        const guestId = !user?.id && isHydrated ? getOrCreateGuestId() : undefined;
        const invite = await friendService.getFriendlyInviteById(inviteId, guestId);
        if (invite?.gameId && invite?.status !== "PENDING") {
          router.push(`/game/${invite.gameId}`);
        }
      } catch {
        // Ignore polling errors in fallback path.
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [starting, inviteId, router, user?.id, isHydrated]);

  const handleStartGame = async () => {
    if (!isHost) return;
    const gameId = inviteData?.gameId;
    if (!gameId) return;
    try {
      setStarting(true);
      socket?.emit("joinGame", { gameId });
      socket?.emit("readyForGame", { gameId, inviteId });
    } catch {
      setStarting(false);
    }
  };

  const handleCancelInvite = async () => {
    try {
      await friendService.cancelFriendlyInvite(inviteId);
      router.push("/play/friend");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel invite");
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!inviteUrl) return;
    const isSwahili =
      typeof window !== "undefined" && window.location.pathname.startsWith("/sw");
    const text = isSwahili
      ? `Nakuchallenge mchezo wa Tanzania Draughts! Bonyeza hapa ucheze: ${inviteUrl}`
      : `I challenge you to a game of Tanzania Draughts! Click here to play: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
      </main>
    );
  }

  const timeLabel = inviteData?.initialTimeMs
    ? `${Math.round(inviteData.initialTimeMs / 60000)} min`
    : "10 min";

  const hostName = inviteData?.host?.displayName ?? "Host";
  const guestName = opponentName ?? inviteData?.guest?.displayName;

  const leftPlayer = isHost
    ? { name: hostName, role: "HOST" }
    : { name: guestName ?? "You", role: "GUEST" };
  const rightPlayer = isHost
    ? { name: guestName, role: "GUEST" }
    : { name: hostName, role: "HOST" };

  const canStart = Boolean(isHost && opponentPresent && inviteData?.gameId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-3xl font-black tracking-tight text-white">
            Match Lobby
          </h1>
          <p className="text-sm text-neutral-400">
            {!opponentPresent
              ? "Waiting for your opponent to join..."
              : isHost
                ? "Opponent joined. Click Start Game to begin."
                : "Waiting for host to start the match..."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">
            {error}
          </div>
        )}
        {disconnectCountdown !== null && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-200">
            Opponent disconnected. Auto-forfeit in {disconnectCountdown}s.
          </div>
        )}
        {selfDisconnectCountdown !== null && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">
            You are disconnected. Reconnect within {selfDisconnectCountdown}s to
            avoid forfeit.
          </div>
        )}

        <div className="mb-10 flex flex-col items-center justify-center gap-6 md:flex-row md:gap-10">
          <div className="flex flex-col items-center">
            <div
              className={`relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                starting ? "border-emerald-500" : "border-[var(--primary)]/40"
              } bg-neutral-800 shadow-xl transition-all duration-300`}
            >
              <User
                className={starting ? "text-emerald-400" : "text-[var(--primary)]"}
                size={40}
              />
              {starting && (
                <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-neutral-900 bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  STARTING
                </div>
              )}
            </div>
            <h3 className="mb-0.5 text-lg font-bold text-white">{leftPlayer.name}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
              {leftPlayer.role} - You
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 rotate-12 items-center justify-center rounded-xl bg-neutral-800/80 text-sm font-black text-neutral-500 shadow-inner">
              VS
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border-4 ${
                opponentPresent
                  ? "border-neutral-500 bg-neutral-800"
                  : "border-neutral-800 border-dashed bg-neutral-800/30"
              } shadow-xl transition-all duration-500`}
            >
              {opponentPresent ? (
                <User className="text-neutral-300" size={40} />
              ) : (
                <ShieldQuestion className="animate-pulse text-neutral-600" size={40} />
              )}
            </div>
            <h3
              className={`mb-0.5 text-lg font-bold ${
                opponentPresent ? "text-white" : "text-neutral-500"
              }`}
            >
              {rightPlayer.name ?? "Waiting..."}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {rightPlayer.role}
            </span>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-4 py-1.5 text-xs font-semibold text-neutral-300">
            <Settings2 size={13} className="text-neutral-400" /> {timeLabel}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-4 py-1.5 text-xs font-semibold text-neutral-300">
            {inviteData?.rated ? "Rated" : "Casual"}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-4 py-1.5 text-xs font-semibold text-neutral-300">
            Host: White • Guest: Black
          </div>
        </div>

        {canStart && (
          <div className="mb-6">
            <Button
              size="lg"
              onClick={handleStartGame}
              disabled={starting}
              className={`w-full text-lg font-black transition-all ${
                starting
                  ? "cursor-not-allowed bg-emerald-700 text-white"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {starting ? (
                <>
                  <CheckCircle2 size={20} className="mr-2" /> Starting match...
                </>
              ) : (
                <>
                  <PlayCircle size={22} className="mr-2" /> Start Game
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-neutral-500">
              Host starts the match after opponent joins
            </p>
          </div>
        )}

        {!opponentPresent && inviteUrl && isHost && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-800/30 p-6">
            <p className="mb-4 text-sm font-semibold text-neutral-300">
              Share this link with your opponent:
            </p>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="pointer-events-none select-none rounded-xl bg-white p-2">
                <QRCodeSVG value={inviteUrl} size={100} level="H" includeMargin={false} />
              </div>
              <div className="w-full flex-1 space-y-3">
                <div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900/80 p-1.5">
                  <div className="flex-1 truncate px-3 py-2 text-sm font-medium text-neutral-300">
                    {inviteUrl}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleCopy}
                    className="flex h-10 w-10 shrink-0 items-center justify-center p-0"
                  >
                    {copied ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleWhatsAppShare}
                    className="flex-1 bg-[#25D366] text-white hover:bg-[#128C7E]"
                  >
                    <Share2 size={18} className="mr-2" /> Send via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelInvite}
                    className="flex h-12 w-12 shrink-0 items-center justify-center border-red-500/30 p-0 text-red-400 hover:bg-red-500/10"
                    title="Cancel Invite"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isHost && (
          <div className="mt-4 text-center text-sm text-neutral-500">
            {opponentPresent
              ? "Host can start the match now..."
              : "Waiting for the host to be ready..."}
          </div>
        )}
      </div>
    </main>
  );
}
