"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

export default function SignupPage() {
    return (
        <div className="space-y-6">
            <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-black text-white">Create Account</h1>
                <p className="text-[#999999]">Join the Tanzania Drafti community today.</p>
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
                            placeholder="Username"
                            className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <input
                            type="email"
                            placeholder="Email Address"
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

                    <Button className="w-full py-4 text-lg">Sign Up</Button>
                </form>
            </div>

            <div className="text-center text-[#999999] text-sm">
                Already have an account? <Link href="/auth/login" className="text-[#81b64c] hover:underline font-bold">Log In</Link>
            </div>
        </div>
    );
}
