"use client";

import { FcGoogle } from "react-icons/fc";

interface GoogleSignInButtonProps {
    text?: string;
}

export default function GoogleSignInButton({
    text = "Continue with Google",
}: GoogleSignInButtonProps) {
    const handleGoogleSignIn = () => {
        // Redirect to backend OAuth endpoint
        window.location.href = "http://localhost:3002/auth/google";
    };

    return (
        <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
            <FcGoogle className="text-2xl" />
            <span className="font-medium text-gray-700 dark:text-gray-200">
                {text}
            </span>
        </button>
    );
}
