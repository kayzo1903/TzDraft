"use client";

import React, { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/auth-client';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PhoneInput } from '@/components/auth/phone-input';

type Step = 'phone' | 'otp';

export default function ForgotPasswordPage() {
    const t = useTranslations('auth.forgotPassword');
    const router = useRouter();
    const [step, setStep] = useState<Step>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authClient.sendOTP(phone, 'password_reset');
            setStep('otp');
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.serverError'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authClient.verifyOTP(phone, otp, 'password_reset');
            // On success, redirect to reset password page with phone and code
            router.push(`/auth/reset-password?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(otp)}`);
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.otpInvalid'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">
                    {t('title')}
                </h1>
                <p className="text-gray-400">
                    {step === 'phone' ? t('steps.phone.subtitle') : t('steps.otp.subtitle', { phone })}
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            <div className="bg-[#262522] p-8 rounded-2xl border border-[#3d3d3d] shadow-2xl">
                {step === 'phone' ? (
                    <form onSubmit={handleSendOTP} className="space-y-6">
                        <div className="space-y-2">
                            <PhoneInput
                                value={phone}
                                onChange={setPhone}
                                label={t('steps.phone.title')}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl transition-all"
                            disabled={loading || !phone}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {t('steps.phone.buttonLoading')}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {t('steps.phone.button')}
                                    <ArrowRight className="h-5 w-5" />
                                </span>
                            )}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-gray-300">OTP Code</Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={setOtp}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                        <InputOTPSlot index={1} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                        <InputOTPSlot index={2} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                    </InputOTPGroup>
                                    <InputOTPSeparator />
                                    <InputOTPGroup>
                                        <InputOTPSlot index={3} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                        <InputOTPSlot index={4} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                        <InputOTPSlot index={5} className="w-12 h-14 text-xl border-gray-700 bg-[#1a1a1a]" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl transition-all"
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {t('steps.otp.buttonLoading')}
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    {t('steps.otp.button')}
                                    <CheckCircle2 className="h-5 w-5" />
                                </span>
                            )}
                        </Button>

                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="w-full text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToLogin')}
                        </button>
                    </form>
                )}
            </div>

            <div className="text-center">
                <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                    {t('backToLogin')}
                </Link>
            </div>
        </div>
    );
}
