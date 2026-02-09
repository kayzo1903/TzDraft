"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/auth-store";
import axiosInstance from "@/lib/axios";

export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const { setAuth } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const accessToken = searchParams.get("accessToken");
                const refreshToken = searchParams.get("refreshToken");

                if (!accessToken || !refreshToken) {
                    throw new Error("Missing authentication tokens");
                }

                // Store tokens
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);

                // Fetch user data
                const response = await axiosInstance.get("/auth/me", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                // Update auth store
                setAuth(response.data, accessToken, refreshToken);

                // Redirect to dashboard/home
                router.push("/");
            } catch (err) {
                console.error("OAuth callback error:", err);
                setError(
                    err instanceof Error ? err.message : "Authentication failed"
                );
                setTimeout(() => router.push("/auth/login"), 3000);
            }
        };

        handleCallback();
    }, [searchParams, router, setAuth]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                        Authentication Error
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <p className="text-sm text-gray-500">
                        Redirecting to login page...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                    Completing sign in...
                </p>
            </div>
        </div>
    );
}
