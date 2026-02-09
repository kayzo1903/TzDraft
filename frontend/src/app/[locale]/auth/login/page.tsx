"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { PasswordInput } from '@/components/auth/password-input';
import { Loader2, LogIn, Smartphone } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(formData);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Main Card */}
            <div className="bg-[#2a2a2a] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#81b64c]/10 mb-4">
                            <LogIn className="w-8 h-8 text-[#81b64c]" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">
                            {t('login.title')}
                        </h1>
                        <p className="text-gray-400">
                            {t('login.subtitle')}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-gray-300">
                                    {t('login.identifier')}
                                    <span className="text-red-500 ml-1">{t('fields.required')}</span>
                                </Label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                                    <Input
                                        id="identifier"
                                        type="text"
                                        value={formData.identifier}
                                        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                        placeholder={t('login.identifierPlaceholder')}
                                        required
                                        className="pl-11 bg-[#1a1a1a] border-gray-700 focus:border-[#81b64c] h-12"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    {t('login.identifierHint')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <PasswordInput
                                    value={formData.password}
                                    onChange={(value) => setFormData({ ...formData, password: value })}
                                    label={t('fields.password')}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-gray-400 hover:text-[#81b64c] transition-colors"
                            >
                                {t('login.forgotPassword')}
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl shadow-lg shadow-[#81b64c]/20 transition-all hover:shadow-[#81b64c]/40 hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {t('login.buttonLoading')}
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {t('login.button')}
                                    <LogIn className="h-5 w-5" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#2a2a2a] px-2 text-gray-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google Sign-In Button */}
                    <GoogleSignInButton />
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
                <p className="text-gray-400 text-sm">
                    {t('login.noAccount')}{' '}
                    <Link href="/auth/signup" className="text-[#81b64c] hover:text-[#6a9a3d] font-bold transition-colors">
                        {t('login.signupLink')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
