"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface PasswordStrengthProps {
    score: number; // 0 to 4
    feedback?: string;
}

export function PasswordStrength({ score, feedback }: PasswordStrengthProps) {
    const t = useTranslations('auth.passwordStrength');

    if (score === -1) return null;

    const getColor = (score: number) => {
        switch (score) {
            case 0: return 'bg-red-500';
            case 1: return 'bg-orange-500';
            case 2: return 'bg-yellow-500';
            case 3: return 'bg-lime-500';
            case 4: return 'bg-green-500';
            default: return 'bg-gray-700';
        }
    };

    const getLabel = (score: number) => {
        switch (score) {
            case 0: return t('weak');
            case 1: return t('fair');
            case 2: return t('good');
            case 3: return t('strong');
            case 4: return t('veryStrong');
            default: return '';
        }
    };

    return (
        <div className="space-y-2 mt-2">
            <div className="flex gap-1 h-1.5 w-full">
                {[0, 1, 2, 3].map((level) => (
                    <div
                        key={level}
                        className={cn(
                            "h-full rounded-full flex-1 transition-all duration-300",
                            score > level ? getColor(score) : "bg-gray-700"
                        )}
                    />
                ))}
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className={cn(
                    "font-medium transition-colors duration-300",
                    score > 0 ? "text-gray-300" : "text-gray-500"
                )}>
                    {getLabel(score)}
                </span>
                {feedback && (
                    <span className="text-gray-500">{feedback}</span>
                )}
            </div>
        </div>
    );
}

export function calculateStrength(password: string): number {
    let score = 0;
    if (!password) return 0;

    if (password.length > 6) score += 1;
    if (password.length > 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return Math.min(score, 4);
}
