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
        primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20 border-b-4 border-[var(--primary-border)] active:border-b-0 active:translate-y-1',
        secondary: 'bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] text-gray-200 border-b-4 border-[var(--secondary-border)] active:border-b-0 active:translate-y-1',
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
