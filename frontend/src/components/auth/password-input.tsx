'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

import { PasswordStrength, calculateStrength } from './password-strength';

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    showStrength?: boolean;
}

/**
 * Password Input Component with visibility toggle
 */
export function PasswordInput({
    value,
    onChange,
    error,
    label = 'Password',
    placeholder = 'Enter your password',
    required = true,
    showStrength = false,
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-2">
            {label && (
                <Label htmlFor="password">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}
            <div className="relative">
                <Input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className={`pr-10 bg-[#1a1a1a] border-gray-700 focus:border-[#81b64c] h-12 ${error ? 'border-red-500' : ''}`}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                    ) : (
                        <Eye className="h-4 w-4" />
                    )}
                </Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {showStrength && (
                <PasswordStrength score={calculateStrength(value)} />
            )}
        </div>
    );
}
