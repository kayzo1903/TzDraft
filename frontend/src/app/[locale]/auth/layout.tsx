import React from 'react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E] p-6">
            <div className="w-full max-w-md">
                {children}
            </div>
        </div>
    );
}
