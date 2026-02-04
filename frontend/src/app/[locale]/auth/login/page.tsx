"use client";

import React from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
    const t = useTranslations('auth');

    return (
        <div className="space-y-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-black text-white">{t('login.title')}</h1>
                <p className="text-[#999999]">{t('login.subtitle')}</p>
            </div>

            <div className="space-y-4">
                <GoogleAuthButton label={t('google')} />

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-[#3d3d3d]"></div>
                    <span className="flex-shrink-0 mx-4 text-[#666666] text-sm font-medium">{t('or')}</span>
                    <div className="flex-grow border-t border-[#3d3d3d]"></div>
                </div>

                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder={t('placeholders.username')}
                            className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <input
                            type="password"
                            placeholder={t('placeholders.password')}
                            className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-[#999999] cursor-pointer hover:text-white">
                            <input type="checkbox" className="rounded border-gray-600 bg-[#3d3d3d] text-[#81b64c] focus:ring-[#81b64c]" />
                            {t('login.rememberMe')}
                        </label>
                        <Link href="/auth/forgot-password" className="text-[#999999] hover:text-white hover:underline">
                            {t('login.forgotPassword')}
                        </Link>
                    </div>

                    <Button className="w-full py-4 text-lg">{t('login.button')}</Button>
                </form>
            </div>

            <div className="text-center text-[#999999] text-sm">
                {t('login.noAccount')} <Link href="/auth/signup" className="text-[#81b64c] hover:underline font-bold">{t('login.signupLink')}</Link>
            </div>
        </div>
    );
}
