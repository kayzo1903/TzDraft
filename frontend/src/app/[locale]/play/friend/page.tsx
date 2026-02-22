"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/hooks/useAuth";
import { friendService } from "@/services/friend.service";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Copy, CheckCircle2, Share2, Users, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function FriendGameSetupPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [timeControl, setTimeControl] = useState<number>(600000); // 10 mins
    const [allowSpectators, setAllowSpectators] = useState<boolean>(true);
    const [roomType, setRoomType] = useState<string>("single");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteResult, setInviteResult] = useState<{ inviteId: string; inviteUrl: string; waitingUrl: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // Default values mapping
    const timeLabels: Record<number, string> = {
        300000: "5 minutes (Blitz)",
        600000: "10 minutes (Rapid)",
        1800000: "30 minutes (Classical)"
    };

    const handleCreateInvite = async () => {
        try {
            setLoading(true);
            setError(null);
            const isSwahili = typeof window !== "undefined" && window.location.pathname.startsWith("/sw");
            const resp = await friendService.createFriendlyInvite({
                initialTimeMs: timeControl,
                allowSpectators,
                roomType,
                locale: isSwahili ? "sw" : "en",
            });
            if (resp.inviteUrl && resp.waitingUrl) {
                setInviteResult({
                    inviteId: resp.id,
                    inviteUrl: resp.inviteUrl,
                    waitingUrl: resp.waitingUrl,
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create invite");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!inviteResult) return;
        navigator.clipboard.writeText(inviteResult.inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsAppShare = () => {
        if (!inviteResult) return;
        const isSwahili = typeof window !== "undefined" && window.location.pathname.startsWith("/sw");
        const text = isSwahili
            ? `🎯 Nakuchallenge mchezo wa Tanzania Draughts! Bonyeza hapa ucheze: ${inviteResult.inviteUrl}`
            : `🎯 I challenge you to a game of Tanzania Draughts! Click here to play: ${inviteResult.inviteUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    if (!user) {
        return (
            <main className="flex min-h-screen items-center justify-center p-4 bg-[var(--background)]">
                <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center shadow-2xl">
                    <Globe className="mx-auto mb-4 text-neutral-500" size={48} />
                    <h1 className="mb-2 text-2xl font-bold text-neutral-100">Sign in to Challenge</h1>
                    <p className="mb-6 text-neutral-400">You need an account to create custom invite links.</p>
                    <Button
                        onClick={() => router.push("/auth/login")}
                        className="w-full"
                    >
                        Sign In Now
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
            <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                {!inviteResult ? (
                    <>
                        <div className="mb-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-emerald-600 shadow-lg shadow-[var(--primary)]/20">
                                <Users className="text-white" size={32} />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Play with Friend</h1>
                            <p className="text-neutral-400">Customize your game and generate an invite link.</p>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Time Control */}
                            <div>
                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-300">
                                    <Clock size={16} /> Time Control
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(timeLabels).map(([ms, label]) => (
                                        <Button
                                            key={ms}
                                            variant={timeControl === Number(ms) ? "primary" : "outline"}
                                            onClick={() => setTimeControl(Number(ms))}
                                            className={`rounded-xl p-3 text-sm font-medium transition-all ${timeControl === Number(ms)
                                                ? "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[var(--primary)]/10 shadow-lg"
                                                : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-500 hover:bg-neutral-800"
                                                }`}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-800/30 p-4">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">Allow Spectators</span>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowSpectators ? 'bg-[var(--primary)]' : 'bg-neutral-600'}`}>
                                        <input type="checkbox" className="sr-only" checked={allowSpectators} onChange={() => setAllowSpectators(!allowSpectators)} />
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowSpectators ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </label>
                            </div>

                            {/* Submit */}
                            <Button
                                onClick={handleCreateInvite}
                                disabled={loading}
                                className="w-full mt-4"
                                size="lg"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Share2 className="mr-2" size={20} />}
                                {loading ? "Creating Invite..." : "Generate Invite Link"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="text-emerald-500" size={40} />
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-white">Invite Created!</h2>
                        <p className="mb-8 text-neutral-400">Share this link with your friend to start playing.</p>

                        <div className="mb-8 flex justify-center">
                            <div className="rounded-2xl bg-white p-4 shadow-xl select-none pointer-events-none">
                                <QRCodeSVG value={inviteResult.inviteUrl} size={180} level="H" includeMargin={false} />
                            </div>
                        </div>

                        <div className="mb-6 flex items-center rounded-xl border border-neutral-700 bg-neutral-800/80 p-1.5 backdrop-blur">
                            <div className="truncate px-3 py-2 text-sm font-medium text-neutral-300 flex-1 text-left select-all">
                                {inviteResult.inviteUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 rounded-lg bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-600"
                            >
                                {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={handleWhatsAppShare}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3.5 font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:-translate-y-0.5 hover:shadow-[#25D366]/40"
                            >
                                <Share2 size={18} /> Send via WhatsApp
                            </button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/game/friendly/wait/${inviteResult.inviteId}`)}
                                className="flex-1"
                            >
                                Go to Waiting Room
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
