"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
    const t = useTranslations('support');

    return (
        <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center py-12 px-4 md:px-8">
            <div className="max-w-4xl w-full space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">{t('title')}</h1>
                    <p className="text-lg text-[#999999] max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* FAQ Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold border-b border-[var(--secondary)] pb-2">{t('faq')}</h2>
                    <div className="grid gap-4">
                        <FAQItem question={t('faqs.q1')} answer={t('faqs.a1')} />
                        <FAQItem question={t('faqs.q2')} answer={t('faqs.a2')} />
                        <FAQItem question={t('faqs.q3')} answer={t('faqs.a3')} />
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-[var(--secondary)]/20 p-6 md:p-8 rounded-xl shadow-xl border border-[var(--secondary)]">
                    <h2 className="text-2xl font-bold mb-6">{t('contact')}</h2>
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#999999]">{t('form.name')}</label>
                                <input
                                    type="text"
                                    placeholder={t('form.name')}
                                    className="w-full px-4 py-3 bg-[var(--secondary)] border border-transparent rounded-lg focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/50 text-white outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#999999]">{t('form.email')}</label>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 bg-[var(--secondary)] border border-transparent rounded-lg focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/50 text-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#999999]">{t('form.subject')}</label>
                            <select className="w-full px-4 py-3 bg-[var(--secondary)] border border-transparent rounded-lg focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/50 text-white outline-none transition-all appearance-none cursor-pointer">
                                <option>{t('form.subjects.bug')}</option>
                                <option>{t('form.subjects.account')}</option>
                                <option>{t('form.subjects.general')}</option>
                                <option>{t('form.subjects.feedback')}</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#999999]">{t('form.message')}</label>
                            <textarea
                                rows={5}
                                placeholder="..."
                                className="w-full px-4 py-3 bg-[var(--secondary)] border border-transparent rounded-lg focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/50 text-white outline-none transition-all resize-none"
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <Button size="lg" className="w-full md:w-auto min-w-[200px]">{t('form.submit')}</Button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}

// Simple FAQ Component
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    return (
        <div className="bg-[var(--secondary)]/50 p-4 rounded-lg border border-[var(--secondary)] hover:bg-[var(--secondary)] transition-colors">
            <h3 className="font-bold text-white mb-1">{question}</h3>
            <p className="text-[#999999] text-sm">{answer}</p>
        </div>
    );
};
