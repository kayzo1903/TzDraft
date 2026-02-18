import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Loader2 } from 'lucide-react';
import { LoadingBoard } from '@/components/game/LoadingBoard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

interface PlayModeSelectionProps {
    onSelectMode: (mode: 'RANKED' | 'CASUAL', guestName?: string) => void;
    socketReady: boolean;
}

export function PlayModeSelection({ onSelectMode, socketReady, autoJoin = true }: PlayModeSelectionProps & { autoJoin?: boolean }) {
    const t = useTranslations('play');
    const { user, isHydrated } = useAuth();

    // Auto-select mode based on auth state
    useEffect(() => {
        if (!isHydrated || !autoJoin || !socketReady) return;

        if (user) {
            onSelectMode('RANKED');
        } else {
            // Auto-generate guest identity
            const randomName = `Guest-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            onSelectMode('CASUAL', randomName);
        }
    }, [user, isHydrated, onSelectMode, autoJoin, socketReady]);

    const handleManualJoin = () => {
        if (user) {
            onSelectMode('RANKED');
        } else {
            const randomName = `Guest-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            onSelectMode('CASUAL', randomName);
        }
    };

    if (!isHydrated || autoJoin) {
        return <LoadingBoard message={user ? t('joining_ranked_queue') : "Joining Casual Queue..."} />;
    }

    // Render "Play Online" button if autoJoin is false (e.g. after cancellation)
    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto mt-10">
            <Card>
                <CardHeader>
                    <CardTitle>{t('play_online')}</CardTitle>
                    <CardDescription>
                        {user ? "Ready to play ranked match" : "Play as a guest"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full py-6 text-lg"
                        variant="primary"
                        onClick={handleManualJoin}
                    >
                        {t('play_online')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
