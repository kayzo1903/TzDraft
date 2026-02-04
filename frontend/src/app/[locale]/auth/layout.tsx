import React from 'react';
import Image from 'next/image';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full flex bg-[#1E1E1E]">
            {/* Left Side: Hero Image */}
            <div className="hidden lg:block w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-orange-900/10 z-10" /> {/* Brand tint overlay */}
                <Image
                    src="/assets/auth-hero.png"
                    alt="TzDraft Premium Gameplay"
                    fill
                    className="object-cover"
                    priority
                    quality={100}
                />

                {/* Overlay Text */}
                <div className="absolute bottom-12 left-12 z-20 max-w-md">
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                        Karibu TzDraft.
                    </h1>
                    <p className="text-lg text-white/80 font-medium leading-relaxed">
                        Experience the authentic strategic depth of Tanzania's favorite pastime.
                    </p>
                </div>

                {/* Gradient fade for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent z-10" />
            </div>

            {/* Right Side: Form Content */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-[#1E1E1E]">
                <div className="w-full max-w-md space-y-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
