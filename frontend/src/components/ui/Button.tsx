import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    className,
    variant = 'primary',
    size = 'md',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
        primary: 'bg-[#81b64c] hover:bg-[#72a342] text-white shadow-lg shadow-[#81b64c]/20 border-b-4 border-[#5d8a33] active:border-b-0 active:translate-y-1',
        secondary: 'bg-[#3d3d3d] hover:bg-[#4d4d4d] text-gray-200 border-b-4 border-[#2d2d2d] active:border-b-0 active:translate-y-1',
        outline: 'border-2 border-neutral-600 hover:border-neutral-400 text-neutral-300 hover:text-white',
        ghost: 'hover:bg-neutral-800 text-neutral-400 hover:text-white',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-xl',
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        />
    );
};
