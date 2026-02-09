'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
}

/**
 * Phone Input Component
 * Automatically normalizes Tanzanian phone numbers to +255 format
 * Accepts: 0712345678, 712345678, +255712345678
 * Outputs: +255712345678
 */
export function PhoneInput({
    value,
    onChange,
    error,
    label = 'Phone Number',
    placeholder = '0712345678',
    required = true,
}: PhoneInputProps) {
    const [displayValue, setDisplayValue] = useState(value);

    const normalizePhone = (input: string): string => {
        // Remove all non-digit characters except +
        let cleaned = input.replace(/[^\d+]/g, '');

        // If starts with 0, replace with +255
        if (cleaned.startsWith('0')) {
            cleaned = '+255' + cleaned.substring(1);
        }
        // If starts with 255 but no +, add +
        else if (cleaned.startsWith('255')) {
            cleaned = '+' + cleaned;
        }
        // If doesn't start with +255 and doesn't start with +, assume it's a local number
        else if (!cleaned.startsWith('+255') && !cleaned.startsWith('+')) {
            cleaned = '+255' + cleaned;
        }

        return cleaned;
    };

    const formatForDisplay = (phone: string): string => {
        // Remove +255 prefix for display
        if (phone.startsWith('+255')) {
            const number = phone.substring(4);
            // Format as: 0XXX XXX XXX
            if (number.length > 0) {
                return '0' + number.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim();
            }
        }
        return phone;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;

        // Allow user to type naturally
        setDisplayValue(input);

        // Normalize and send to parent
        const normalized = normalizePhone(input);
        onChange(normalized);
    };

    const handleBlur = () => {
        // Format display value on blur
        if (value) {
            setDisplayValue(formatForDisplay(value));
        }
    };

    const handleFocus = () => {
        // Show normalized value on focus
        if (value) {
            setDisplayValue(value);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <Label htmlFor="phone">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}
            <Input
                id="phone"
                type="tel"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={placeholder}
                required={required}
                className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {value && value.startsWith('+255') && (
                <p className="text-xs text-muted-foreground">
                    Will be saved as: {value}
                </p>
            )}
        </div>
    );
}
