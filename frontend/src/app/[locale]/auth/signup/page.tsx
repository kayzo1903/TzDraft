"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { PhoneInput } from '@/components/auth/phone-input';
import { PasswordInput } from '@/components/auth/password-input';
import { authClient } from '@/lib/auth/auth-client';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Loader2, CheckCircle2, ArrowRight, Smartphone, UserCircle, Lock } from 'lucide-react';

export default function SignupPage() {
    const t = useTranslations('auth');
    const router = useRouter();
    const { register } = useAuth();

    const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
    const [formData, setFormData] = useState({
        phoneNumber: '',
        username: '',
        password: '',
        confirmPassword: '',
        displayName: '',
    });
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Step 1: Send OTP
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authClient.sendOTP(formData.phoneNumber);
            setStep('otp');
        } catch (err: any) {
            const message = err.response?.data?.message;
            if (message === 'User with this phone number already exists') {
                setError(t('errors.phoneAlreadyRegistered'));
            } else {
                setError(message || t('errors.otpFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authClient.verifyOTP(formData.phoneNumber, otpCode);
            setStep('details');
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.otpInvalid'));
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Complete Registration
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password.length < 8) {
            setError(t('errors.passwordTooShort'));
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t('errors.passwordMismatch'));
            return;
        }

        setLoading(true);

        try {
            await register(formData);
            router.push('/');
        } catch (err: any) {
            const backendMessage = err.response?.data?.message;
            let displayError = t('errors.registrationFailed');

            if (typeof backendMessage === 'string') {
                if (backendMessage.includes('longer than or equal to 8 characters')) {
                    displayError = t('errors.passwordTooShort');
                } else if (backendMessage.includes('already exists')) {
                    displayError = t('errors.userAlreadyExists');
                } else {
                    displayError = backendMessage;
                }
            } else if (Array.isArray(backendMessage)) {
                // If it's an array of validation errors, try to translate them
                displayError = backendMessage.map(msg => {
                    if (msg.includes('longer than or equal to 8 characters')) return t('errors.passwordTooShort');
                    if (msg.includes('already exists')) return t('errors.userAlreadyExists');
                    return msg;
                }).join(', ');
            }

            setError(displayError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Progress Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 ${step === 'phone' ? 'text-[#81b64c]' : 'text-gray-500'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step === 'phone' ? 'border-[#81b64c] bg-[#81b64c]/10' : step === 'otp' || step === 'details' ? 'border-[#81b64c] bg-[#81b64c]' : 'border-gray-600'}`}>
                            {step === 'otp' || step === 'details' ? <CheckCircle2 className="w-5 h-5 text-white" /> : '1'}
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">{t('signup.progress.phone')}</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-700 mx-2">
                        <div className={`h-full bg-[#81b64c] transition-all duration-500 ${step === 'otp' || step === 'details' ? 'w-full' : 'w-0'}`} />
                    </div>
                    <div className={`flex items-center gap-2 ${step === 'otp' ? 'text-[#81b64c]' : step === 'details' ? 'text-gray-500' : 'text-gray-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step === 'otp' ? 'border-[#81b64c] bg-[#81b64c]/10' : step === 'details' ? 'border-[#81b64c] bg-[#81b64c]' : 'border-gray-600'}`}>
                            {step === 'details' ? <CheckCircle2 className="w-5 h-5 text-white" /> : '2'}
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">{t('signup.progress.verify')}</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-700 mx-2">
                        <div className={`h-full bg-[#81b64c] transition-all duration-500 ${step === 'details' ? 'w-full' : 'w-0'}`} />
                    </div>
                    <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#81b64c]' : 'text-gray-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step === 'details' ? 'border-[#81b64c] bg-[#81b64c]/10' : 'border-gray-600'}`}>
                            3
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">{t('signup.progress.profile')}</span>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-[#2a2a2a] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#81b64c]/10 mb-4">
                            {step === 'phone' && <Smartphone className="w-8 h-8 text-[#81b64c]" />}
                            {step === 'otp' && <Lock className="w-8 h-8 text-[#81b64c]" />}
                            {step === 'details' && <UserCircle className="w-8 h-8 text-[#81b64c]" />}
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">
                            {step === 'phone' && t('signup.steps.phone.title')}
                            {step === 'otp' && t('signup.steps.otp.title')}
                            {step === 'details' && t('signup.steps.details.title')}
                        </h1>
                        <p className="text-gray-400">
                            {step === 'phone' && t('signup.steps.phone.subtitle')}
                            {step === 'otp' && t('signup.steps.otp.subtitle', { phone: formData.phoneNumber })}
                            {step === 'details' && t('signup.steps.details.subtitle')}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Phone Number */}
                    {step === 'phone' && (
                        <form className="space-y-6" onSubmit={handleSendOTP}>
                            <PhoneInput
                                value={formData.phoneNumber}
                                onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                                label={t('fields.phoneNumber')}
                                placeholder={t('fields.phonePlaceholder')}
                            />

                            <Button
                                type="submit"
                                className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl shadow-lg shadow-[#81b64c]/20 transition-all hover:shadow-[#81b64c]/40 hover:scale-[1.02] active:scale-[0.98]"
                                disabled={loading || !formData.phoneNumber}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        {t('signup.steps.phone.buttonLoading')}
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        {t('signup.steps.phone.button')}
                                        <ArrowRight className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="relative">
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
                        </form>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === 'otp' && (
                        <form className="space-y-6" onSubmit={handleVerifyOTP}>
                            <div className="space-y-2">
                                <Label htmlFor="otp" className="text-gray-300">
                                    {t('signup.steps.otp.label')}
                                </Label>
                                <div className="flex justify-center my-4">
                                    <InputOTP
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={setOtpCode}
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
                                <p className="text-xs text-gray-500 text-center">
                                    {t('signup.steps.otp.hint')}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl shadow-lg shadow-[#81b64c]/20 transition-all hover:shadow-[#81b64c]/40 hover:scale-[1.02] active:scale-[0.98]"
                                    disabled={loading || otpCode.length !== 6}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            {t('signup.steps.otp.buttonLoading')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {t('signup.steps.otp.button')}
                                            <ArrowRight className="h-5 w-5" />
                                        </span>
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors"
                                    onClick={() => setStep('phone')}
                                >
                                    {t('signup.steps.otp.changePhone')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Complete Registration */}
                    {step === 'details' && (
                        <form className="space-y-6" onSubmit={handleRegister}>
                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/50 rounded-xl text-green-400 text-sm mb-6">
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                <span>{t('signup.steps.details.verified')}</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-gray-300">
                                        {t('fields.username')}
                                        <span className="text-red-500 ml-1">{t('fields.required')}</span>
                                    </Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder={t('fields.usernamePlaceholder')}
                                        required
                                        minLength={3}
                                        maxLength={20}
                                        className="bg-[#1a1a1a] border-gray-700 focus:border-[#81b64c]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="displayName" className="text-gray-300">
                                        {t('fields.displayName')}
                                    </Label>
                                    <Input
                                        id="displayName"
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                        placeholder={t('fields.displayNamePlaceholder')}
                                        className="bg-[#1a1a1a] border-gray-700 focus:border-[#81b64c]"
                                    />
                                </div>

                                <PasswordInput
                                    value={formData.password}
                                    onChange={(value) => setFormData({ ...formData, password: value })}
                                    label={t('fields.password')}
                                    showStrength
                                />

                                <PasswordInput
                                    value={formData.confirmPassword}
                                    onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                                    label={t('fields.confirmPassword')}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-6 text-lg font-bold bg-[#81b64c] hover:bg-[#6a9a3d] text-white rounded-xl shadow-lg shadow-[#81b64c]/20 transition-all hover:shadow-[#81b64c]/40 hover:scale-[1.02] active:scale-[0.98]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        {t('signup.steps.details.buttonLoading')}
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        {t('signup.steps.details.button')}
                                        <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
                <p className="text-gray-400 text-sm">
                    {t('signup.haveAccount')}{' '}
                    <Link href="/auth/login" className="text-[#81b64c] hover:text-[#6a9a3d] font-bold transition-colors">
                        {t('signup.loginLink')}
                    </Link>
                </p>
            </div>
        </div>
    );
}
