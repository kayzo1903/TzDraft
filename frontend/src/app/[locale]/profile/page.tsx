'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { authClient } from '@/lib/auth/auth-client';
import { COUNTRIES, REGIONS_BY_COUNTRY, hasRegions } from '@tzdraft/shared-client';
import {
    User as UserIcon,
    Settings,
    LogOut,
    ChevronLeft,
    Camera,
    Trophy,
    Globe,
    Users,
    Swords,
    Flame,
    ShieldCheck,
    ShieldAlert,
    Pencil,
    X,
    Loader2,
    Check
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    const router = useRouter();
    const { user, logout, updateProfile } = useAuth();
    const { stats: socialStats, friends, rank, loading: socialLoading } = useSocial();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editError, setEditError] = useState('');
    const [editForm, setEditForm] = useState({
        displayName: '',
        email: '',
        country: 'TZ',
        region: '',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isGuest = user?.accountType === 'GUEST' || user?.phoneNumber?.startsWith('GUEST_');

    const ratingValue = React.useMemo(() => {
        if (!user) return null;
        if (typeof user.rating === 'number') return user.rating;
        if (user.rating && typeof user.rating === 'object') return user.rating.rating;
        return null;
    }, [user]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File too large. Please choose an image under 2MB.");
            return;
        }

        setUploading(true);
        try {
            await authClient.uploadAvatar(file);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload avatar.");
        } finally {
            setUploading(false);
        }
    };

    const handleStartEdit = () => {
        setEditForm({
            displayName: user?.displayName ?? '',
            email: user?.email ?? '',
            country: user?.country ?? 'TZ',
            region: user?.region ?? '',
        });
        setEditError('');
        setEditing(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setEditError('');
        try {
            await updateProfile(editForm);
            setEditing(false);
        } catch (err: any) {
            setEditError(err?.response?.data?.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <main className="min-h-screen bg-background pb-24 lg:pb-12">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-white/5 lg:hidden">
                <div className="flex items-center justify-between h-16 px-4">
                    <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-surface">
                        <ChevronLeft className="w-6 h-6 text-text-muted" />
                    </button>
                    <h1 className="text-lg font-black text-foreground">Profile</h1>
                    <Link href="/settings" className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-surface">
                        <Settings className="w-5 h-5 text-text-muted" />
                    </Link>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-6 lg:py-12 space-y-8">
                {/* Profile Card */}
                <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-surface p-6 lg:p-8 shadow-2xl">
                    <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
                        {/* Avatar Column */}
                        <div className="flex flex-col items-center shrink-0">
                            <div className="relative group">
                                <div 
                                    onClick={handleAvatarClick}
                                    className="w-32 h-32 lg:w-40 lg:h-40 rounded-full border-4 border-[var(--primary)]/20 p-1 cursor-pointer hover:border-[var(--primary)]/40 transition-all"
                                >
                                    <div className="w-full h-full rounded-full bg-surface-elevated overflow-hidden flex items-center justify-center relative">
                                        {user.avatarUrl ? (
                                            <Image src={user.avatarUrl} alt={user.username} fill className="object-cover" />
                                        ) : (
                                            <UserIcon className="w-16 h-16 text-[var(--primary)]" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={handleAvatarClick}
                                    className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[var(--primary)] text-black border-4 border-surface flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                    accept="image/*" 
                                />
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 space-y-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="text-center lg:text-left">
                                    <div className="flex items-center justify-center lg:justify-start gap-2">
                                        <h2 className="text-3xl font-black text-foreground tracking-tight">
                                            {user.displayName || user.username}
                                        </h2>
                                        {user.isVerified && <ShieldCheck className="w-6 h-6 text-win" />}
                                    </div>
                                    <p className="text-text-muted font-bold">@{user.username}</p>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <Button onClick={handleStartEdit} variant="secondary" className="rounded-xl px-6 font-black gap-2">
                                        <Pencil className="w-4 h-4" />
                                        Edit
                                    </Button>
                                    <Link href="/settings" className="hidden lg:block">
                                        <Button variant="secondary" className="w-11 h-11 p-0 rounded-xl">
                                            <Settings className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Stats Bar */}
                            <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-foreground">{socialStats.friendsCount}</p>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-text-subtle">Friends</p>
                                </div>
                                <div className="text-center border-x border-white/5">
                                    <p className="text-2xl font-black text-foreground">{socialStats.followersCount}</p>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-text-subtle">Followers</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-black text-foreground">{socialStats.followingCount}</p>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-text-subtle">Following</p>
                                </div>
                            </div>

                            {/* ELO & Ranks */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                                <div className="px-4 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] font-black text-sm">
                                    Blitz ELO: {ratingValue ?? 1200}
                                </div>
                                {rank && (
                                    <>
                                        {rank.global !== null && (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-white/10 text-text-secondary text-sm font-bold">
                                                <Trophy className="w-4 h-4 text-[var(--primary)]" />
                                                #{rank.global} Global
                                            </div>
                                        )}
                                        {rank.country !== null && (
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-white/10 text-text-secondary text-sm font-bold">
                                                <Globe className="w-4 h-4 text-text-subtle" />
                                                #{rank.country} Country
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Edit Modal / Panel */}
                {editing && (
                    <section className="rounded-[2.5rem] border border-[var(--primary)]/30 bg-surface/80 backdrop-blur-xl p-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-foreground">Edit Account</h3>
                            <button onClick={() => setEditing(false)} className="text-text-muted hover:text-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted ml-1">Display Name</label>
                                <Input 
                                    value={editForm.displayName} 
                                    onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                                    className="h-12 bg-background border-white/10 focus:border-[var(--primary)] rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted ml-1">Email</label>
                                <Input 
                                    value={editForm.email} 
                                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                                    className="h-12 bg-background border-white/10 focus:border-[var(--primary)] rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted ml-1">Country</label>
                                <select
                                    value={editForm.country}
                                    onChange={e => setEditForm({...editForm, country: e.target.value, region: ''})}
                                    className="w-full h-12 px-4 rounded-xl bg-background border border-white/10 text-foreground focus:border-[var(--primary)] outline-none"
                                >
                                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                            </div>
                            {hasRegions(editForm.country) && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-text-muted ml-1">Region</label>
                                    <select
                                        value={editForm.region}
                                        onChange={e => setEditForm({...editForm, region: e.target.value})}
                                        className="w-full h-12 px-4 rounded-xl bg-background border border-white/10 text-foreground focus:border-[var(--primary)] outline-none"
                                    >
                                        <option value="">— None —</option>
                                        {REGIONS_BY_COUNTRY[editForm.country].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        {editError && <p className="mt-4 text-xs font-bold text-danger bg-danger/10 p-3 rounded-xl border border-danger/20">{editError}</p>}
                        <div className="mt-8 flex gap-3">
                            <Button onClick={handleSave} disabled={saving} className="h-12 px-8 rounded-xl font-black gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save Changes
                            </Button>
                            <Button onClick={() => setEditing(false)} variant="secondary" className="h-12 px-8 rounded-xl font-black">Cancel</Button>
                        </div>
                    </section>
                )}

                {/* Main Content */}
                <div className="max-w-3xl mx-auto">
                    {/* Friends Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                                <Users className="w-5 h-5 text-[var(--primary)]" />
                                Friends
                            </h3>
                            <Link href="/community/friends" className="text-xs font-black text-[var(--primary)] uppercase tracking-widest hover:underline">
                                Manage
                            </Link>
                        </div>

                        {socialLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-text-muted" /></div>
                        ) : friends.length > 0 ? (
                            <div className="space-y-3">
                                {friends.map(friend => (
                                    <Link 
                                        key={friend.id} 
                                        href={`/game/setup-online?challenge=${friend.username}`}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-white/5 hover:bg-surface-elevated hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="relative w-12 h-12 rounded-full bg-background overflow-hidden flex items-center justify-center border border-white/10">
                                                    {friend.avatarUrl ? (
                                                        <Image src={friend.avatarUrl} alt={friend.username} fill className="object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-6 h-6 text-text-muted" />
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface",
                                                    friend.isOnline ? "bg-win" : "bg-text-muted"
                                                )} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-[var(--primary)] transition-colors">{friend.displayName}</p>
                                                <p className="text-xs text-text-muted">@{friend.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {friend.isRival && <Flame className="w-5 h-5 text-[var(--primary)] fill-[var(--primary)]/20" />}
                                            <Swords className="w-5 h-5 text-text-muted group-hover:text-[var(--primary)] transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 rounded-[2rem] border-2 border-dashed border-white/5 bg-surface/50 flex flex-col items-center text-center space-y-4">
                                <Users className="w-12 h-12 text-text-subtle" />
                                <p className="text-sm text-text-muted font-medium">Your social circle is quiet...</p>
                                <Link href="/leaderboard">
                                    <Button variant="secondary" className="rounded-xl px-6 text-xs font-black">Find Rivals</Button>
                                </Link>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}
