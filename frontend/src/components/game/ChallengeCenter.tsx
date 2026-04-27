"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useChallengeStore, IncomingChallenge } from "@/lib/game/challenge-store";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { gameService } from "@/services/game.service";
import { 
  X, 
  Check, 
  Swords, 
  User as UserIcon,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PulseDot } from "@/components/ui/PulseDot";
import { cn } from "@/lib/utils";

export function ChallengeCenter() {
  const { socket } = useSocket();
  const { 
    incomingChallenge, 
    outgoingChallenge, 
    setIncomingChallenge, 
    setOutgoingChallenge,
    clearChallenges 
  } = useChallengeStore();
  const t = useTranslations("common");
  const th = useTranslations("hero"); // Using hero for some home-like keys if needed
  const router = useRouter();
  const locale = useLocale();

  const [incomingCountdown, setIncomingCountdown] = useState(30);
  const [outgoingCountdown, setOutgoingCountdown] = useState(30);
  const [isJoining, setIsJoining] = useState(false);

  const incomingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const outgoingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Incoming Challenge Logic ---
  useEffect(() => {
    if (incomingChallenge) {
      setIncomingCountdown(30);
      if (incomingTimerRef.current) clearInterval(incomingTimerRef.current);
      incomingTimerRef.current = setInterval(() => {
        setIncomingCountdown((prev) => {
          if (prev <= 1) {
            setIncomingChallenge(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (incomingTimerRef.current) clearInterval(incomingTimerRef.current);
    }
    return () => { if (incomingTimerRef.current) clearInterval(incomingTimerRef.current); };
  }, [incomingChallenge, setIncomingChallenge]);

  // --- Outgoing Challenge Logic ---
  useEffect(() => {
    if (outgoingChallenge) {
      setOutgoingCountdown(30);
      if (outgoingTimerRef.current) clearInterval(outgoingTimerRef.current);
      outgoingTimerRef.current = setInterval(() => {
        setOutgoingCountdown((prev) => {
          if (prev <= 1) {
            setOutgoingChallenge(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (outgoingTimerRef.current) clearInterval(outgoingTimerRef.current);
    }
    return () => { if (outgoingTimerRef.current) clearInterval(outgoingTimerRef.current); };
  }, [outgoingChallenge, setOutgoingChallenge]);

  // --- Socket Listeners ---
  useEffect(() => {
    if (!socket) return;

    const handleChallengeRequest = (data: IncomingChallenge) => {
      // In mobile, they check if already in a game. For web, we can just show it.
      setIncomingChallenge(data);
    };

    const handleChallengeAccepted = ({ gameId }: { gameId: string }) => {
      setOutgoingChallenge(null);
      router.push(`/game/${gameId}`);
    };

    const handleChallengeCancelled = (data: { gameId: string; reason?: string }) => {
      if (incomingChallenge?.gameId === data.gameId) {
        setIncomingChallenge(null);
      }
      if (outgoingChallenge?.gameId === data.gameId) {
        setOutgoingChallenge(null);
        // Could show a "Challenge Declined" toast here
      }
    };

    socket.on("challenge_request", handleChallengeRequest);
    socket.on("challenge_accepted", handleChallengeAccepted);
    socket.on("challenge_cancelled", handleChallengeCancelled);

    return () => {
      socket.off("challenge_request", handleChallengeRequest);
      socket.off("challenge_accepted", handleChallengeAccepted);
      socket.off("challenge_cancelled", handleChallengeCancelled);
    };
  }, [socket, incomingChallenge, outgoingChallenge, setIncomingChallenge, setOutgoingChallenge, router]);

  const handleAcceptIncoming = async () => {
    if (!incomingChallenge) return;
    setIsJoining(true);
    try {
      await gameService.joinInvite(incomingChallenge.inviteCode);
      router.push(`/game/${incomingChallenge.gameId}`);
      setIncomingChallenge(null);
    } catch (err) {
      console.error("Failed to join challenge:", err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeclineIncoming = async () => {
    if (!incomingChallenge) return;
    try {
      await gameService.abort(incomingChallenge.gameId);
    } catch {}
    setIncomingChallenge(null);
  };

  const handleCancelOutgoing = async () => {
    if (outgoingChallenge?.gameId) {
      try {
        await gameService.abort(outgoingChallenge.gameId);
      } catch {}
    }
    setOutgoingChallenge(null);
  };

  if (!incomingChallenge && !outgoingChallenge) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center p-4 pointer-events-none sm:p-6 sm:bottom-6">
      
      {/* --- Incoming Challenge Modal --- */}
      {incomingChallenge && (
        <div className="w-full max-w-sm pointer-events-auto animate-in slide-in-from-bottom-8 duration-300">
          <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-900/95 p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <div className="flex items-center gap-3 text-[var(--primary)]">
              <Swords size={20} />
              <h3 className="text-lg font-black text-white">
                {locale === "sw" ? "Umepewa Changamoto!" : "Challenge Received!"}
              </h3>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-neutral-800">
                  {incomingChallenge.challengerAvatarUrl ? (
                    <img 
                      src={incomingChallenge.challengerAvatarUrl} 
                      alt="" 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                      <UserIcon size={32} />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <PulseDot online size={16} />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-white">{incomingChallenge.challengerName}</p>
                {incomingChallenge.challengerRating && (
                  <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                    ELO {incomingChallenge.challengerRating}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-2xl border-white/10 bg-white/5 py-6 text-white hover:bg-white/10"
                onClick={handleDeclineIncoming}
              >
                <X className="mr-2 h-4 w-4" />
                {t("decline")}
              </Button>
              <Button
                className="rounded-2xl bg-[var(--primary)] py-6 font-black text-black hover:opacity-90"
                onClick={handleAcceptIncoming}
                disabled={isJoining}
              >
                {isJoining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("accept")} ({incomingCountdown}s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- Outgoing Challenge Modal --- */}
      {outgoingChallenge && !incomingChallenge && (
        <div className="w-full max-w-sm pointer-events-auto animate-in slide-in-from-bottom-8 duration-300">
          <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-900/95 p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Swords size={24} />
            </div>
            
            <h3 className="mt-4 text-xl font-black text-white">
              {locale === "sw" ? "Changamoto Imethibitishwa" : "Challenge Sent"}
            </h3>
            <p className="mt-2 text-sm text-neutral-400">
              {locale === "sw" 
                ? `Tunasubiri ${outgoingChallenge.displayName} akubali...` 
                : `Waiting for ${outgoingChallenge.displayName} to accept...`}
            </p>

            <div className="mt-8 flex flex-col items-center gap-6">
              <div className="relative h-20 w-20 overflow-hidden rounded-[2rem] bg-neutral-800">
                {outgoingChallenge.avatarUrl ? (
                  <img src={outgoingChallenge.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-600">
                    <UserIcon size={40} />
                  </div>
                )}
                <div className="absolute inset-0 border-[3px] border-[var(--primary)]/20 animate-pulse rounded-[2rem]" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--primary)]" />
                  {locale === "sw" ? "Inaisha baada ya" : "Expires in"} {outgoingCountdown}s
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-8 w-full rounded-2xl border-white/10 bg-white/5 py-6 text-white hover:bg-white/10"
              onClick={handleCancelOutgoing}
            >
              <X className="mr-2 h-4 w-4" />
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
