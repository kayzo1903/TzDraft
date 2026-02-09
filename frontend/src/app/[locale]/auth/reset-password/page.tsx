"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/auth-client';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/components/auth/password-input';

export default function ResetPasswordPage() {
    const t = useTranslations('auth.resetPassword');
    const router = useRouter();
    const searchParams = useSearchParams();

    const phone = searchParams.get('phone');
    const code = searchParams.get('code');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!phone || !code) {
            router.push('/auth/forgot-password');
        }
    }, [phone, code, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('errors.passwordMismatch'));
            return;
        }

        if (password.length < 8) {
            setError(t('errors.passwordTooShort'));
            return;
        }

        setLoading(true);

        try {
            await authClient.resetPasswordPhone(phone!, code!, password);
            setSuccess(true);
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.serverError'));
        } finally {
            setLoading(false);
        }
    };

    if (!phone || !code) return null;

    if (success) {
        return (
            <div className="w-full max-w-md mx-auto text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white">{t('successTitle')}</h1>
                <p className="text-gray-400">{t('successMessage')}</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-gray-400">
                    {t('subtitle')}
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            <div className="bg-[#262522] p-8 rounded-2xl border border-[#3d3d3d] shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <PasswordInput
                            value={password}
                            onChange={setPassword}
                            label={t('newPasswordLabel')}
                            showStrength
                        />
                        <PasswordInput
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            label={t('confirmPasswordLabel')}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl transition-all"
                        disabled={loading || !password || !confirmPassword}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {t('submitButtonLoading')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                {t('submitButton')}
                                <Lock className="h-5 w-5" />
                            </span>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
