"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';

export default function SupportPage() {
    return (
        <main className="min-h-screen bg-[#2B2B2B] text-[#EDEDED] flex flex-col items-center py-12 px-4 md:px-8">
            <div className="max-w-4xl w-full space-y-12">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">Support Center</h1>
                    <p className="text-lg text-[#999999] max-w-2xl mx-auto">
                        Have a question or run into a bug? We&apos;re here to help you get back to the game.
                    </p>
                </div>

                {/* FAQ Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold border-b border-[#3d3d3d] pb-2">Frequently Asked Questions</h2>
                    <div className="grid gap-4">
                        <FAQItem
                            question="How do I play Tanzania Drafti?"
                            answer="TzDraft follows standard 8x8 Draughts rules. Pieces move forward diagonally. Kings occupy captured squares. Captures are mandatory."
                        />
                        <FAQItem
                            question="Can I play against my friends?"
                            answer="Yes! Click 'Play Online' to create a game room, then share the Game ID with your friend."
                        />
                        <FAQItem
                            question="I found a bug, how do I report it?"
                            answer="Please use the form below to describe the issue. Include the Game ID if applicable."
                        />
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-[#262522] p-6 md:p-8 rounded-xl shadow-xl border border-[#3d3d3d]">
                    <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#999999]">Name</label>
                                <input
                                    type="text"
                                    placeholder="Your Name"
                                    className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#999999]">Email</label>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#999999]">Subject</label>
                            <select className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white outline-none transition-all appearance-none cursor-pointer">
                                <option>Report a Bug</option>
                                <option>Account Issue</option>
                                <option>General Inquiry</option>
                                <option>Feedback</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#999999]">Message</label>
                            <textarea
                                rows={5}
                                placeholder="Describe the issue in detail..."
                                className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white outline-none transition-all resize-none"
                            ></textarea>
                        </div>

                        <div className="pt-2">
                            <Button size="lg" className="w-full md:w-auto min-w-[200px]">Send Message</Button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}

// Simple FAQ Component
const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    // Simple state could be added here for expand/collapse, but keeping it open/simple for now or just static text.
    // Let's make it a simple detailed block
    return (
        <div className="bg-[var(--secondary)]/50 p-4 rounded-lg border border-[var(--secondary-border)] hover:bg-[var(--secondary)] transition-colors">
            <h3 className="font-bold text-white mb-1">{question}</h3>
            <p className="text-[#999999] text-sm">{answer}</p>
        </div>
    );
};
