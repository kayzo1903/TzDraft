"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import { Bell, CheckCircle2, X } from "lucide-react";
import { friendService } from "@/services/friend.service";
import { useAuth } from "@/hooks/useAuth";

type Notification =
  | {
      id: string;
      type: "invite";
      message: string;
      inviteToken: string;
    }
  | {
      id: string;
      type: "opponent-joined";
      message: string;
      inviteId: string;
    };

export function FriendlyNotifications() {
  const router = useRouter();
  const locale = useLocale() as "en" | "sw";
  const socket = useSocket();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [acting, setActing] = useState(false);
  const seenInviteTokensRef = useRef<Set<string>>(new Set());

  const nextItem = useMemo(() => items[0] ?? null, [items]);

  const enqueueInvite = (token: string, hostDisplayName?: string) => {
    if (seenInviteTokensRef.current.has(token)) return;
    seenInviteTokensRef.current.add(token);
    const hostName = hostDisplayName || "A friend";
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-invite-${token}`,
        type: "invite",
        message: `${hostName} challenged you to a match.`,
        inviteToken: token,
      },
    ]);
  };

  const pollIncomingInvites = async () => {
    try {
      const data = await friendService.getIncomingFriendlyInvites();
      const pending = (data || []).filter(
        (invite: { status?: string; inviteToken?: string }) =>
          invite?.status === "PENDING" && invite?.inviteToken,
      );
      for (const invite of pending) {
        enqueueInvite(invite.inviteToken, invite?.host?.displayName);
      }
    } catch {
      // Ignore polling errors; socket events are primary.
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onFriendlyMatchInvited = (data: {
      inviteId?: string;
      inviteToken?: string;
      hostDisplayName?: string;
    }) => {
      if (!data?.inviteToken) return;
      enqueueInvite(data.inviteToken, data.hostDisplayName);
      window.dispatchEvent(new CustomEvent("tzdraft:friendsRefresh"));
    };

    const onOpponentJoined = (data: {
      inviteId?: string;
      guestDisplayName?: string;
    }) => {
      if (!data?.inviteId) return;
      const guestName = data.guestDisplayName || "Your friend";
      setItems((prev) => [
        ...prev,
        {
          id: `${Date.now()}-joined-${data.inviteId}`,
          type: "opponent-joined",
          message: `${guestName} joined your lobby. Start the match when ready.`,
          inviteId: data.inviteId,
        },
      ]);
      window.dispatchEvent(new CustomEvent("tzdraft:friendsRefresh"));
    };

    socket.on("friendlyMatchInvited", onFriendlyMatchInvited);
    socket.on("friendlyInviteOpponentJoined", onOpponentJoined);
    socket.on("connect", pollIncomingInvites);

    // Poll as a safety net in case the socket was offline when invite was sent.
    const pollId = window.setInterval(pollIncomingInvites, 10000);

    return () => {
      socket.off("friendlyMatchInvited", onFriendlyMatchInvited);
      socket.off("friendlyInviteOpponentJoined", onOpponentJoined);
      socket.off("connect", pollIncomingInvites);
      window.clearInterval(pollId);
    };
  }, [socket]);

  if (!nextItem) return null;

  const dismiss = () => {
    setItems((prev) => prev.slice(1));
  };

  const handleAction = async () => {
    if (!nextItem || acting) return;
    if (nextItem.type === "invite") {
      try {
        setActing(true);
        // Auto-accept for authenticated users to skip the accept screen.
        if (user?.id) {
          const data = await friendService.acceptFriendlyInvite(
            nextItem.inviteToken,
          );
          if (data?.inviteId) {
            router.push(`/game/friendly/wait/${data.inviteId}`);
          } else if (data?.gameId) {
            router.push(`/game/${data.gameId}`);
          } else {
            router.push(`/game/friendly/${nextItem.inviteToken}`);
          }
        } else {
          router.push(`/game/friendly/${nextItem.inviteToken}`);
        }
      } finally {
        setActing(false);
      }
    } else {
      router.push(`/game/friendly/wait/${nextItem.inviteId}`);
    }
    dismiss();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-[min(380px,90vw)] rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
          <Bell size={18} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-neutral-100">
            Friend Challenge
          </div>
          <div className="mt-1 text-sm text-neutral-300">{nextItem.message}</div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAction}
              disabled={acting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <CheckCircle2 size={14} />
              {nextItem.type === "invite"
                ? locale === "sw"
                  ? "Fungua Changamoto"
                  : "Open Challenge"
                : locale === "sw"
                  ? "Nenda Lobia"
                  : "Go to Lobby"}
            </button>
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700"
            >
              <X size={14} />
              {locale === "sw" ? "Funga" : "Dismiss"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
