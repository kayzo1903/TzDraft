"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

export default function LoginPage() {
    return (
        <div className="space-y-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-black text-white">Welcome Back</h1>
                <p className="text-[#999999]">Log in to continue playing.</p>
            </div>

            <div className="space-y-4">
                <GoogleAuthButton />

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-[#3d3d3d]"></div>
                    <span className="flex-shrink-0 mx-4 text-[#666666] text-sm font-medium">OR</span>
                    <div className="flex-grow border-t border-[#3d3d3d]"></div>
                </div>

                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Username or Email"
                            className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-[#999999] cursor-pointer hover:text-white">
                            <input type="checkbox" className="rounded border-gray-600 bg-[#3d3d3d] text-[#81b64c] focus:ring-[#81b64c]" />
                            Remember me
                        </label>
                        <Link href="/auth/forgot-password" className="text-[#999999] hover:text-white hover:underline">
                            Forgot Password?
                        </Link>
                    </div>

                    <Button className="w-full py-4 text-lg">Log In</Button>
                </form>
            </div>

            <div className="text-center text-[#999999] text-sm">
                New to TzDraft? <Link href="/auth/signup" className="text-[#81b64c] hover:underline font-bold">Sign Up</Link>
            </div>
        </div>
    );
}
