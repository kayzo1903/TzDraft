"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneNumber = normalizePhoneNumber;
exports.isValidTanzanianPhone = isValidTanzanianPhone;
exports.formatPhoneNumber = formatPhoneNumber;
function normalizePhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '+255' + cleaned.substring(1);
    }
    else if (cleaned.startsWith('255')) {
        cleaned = '+' + cleaned;
    }
    else if (!cleaned.startsWith('+255') && !cleaned.startsWith('+')) {
        cleaned = '+255' + cleaned;
    }
    return cleaned;
}
function isValidTanzanianPhone(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    const regex = /^\+255[67]\d{8}$/;
    return regex.test(normalized);
}
function formatPhoneNumber(phoneNumber) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (normalized.startsWith('+255')) {
        const number = normalized.substring(4);
        return `+255 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
    return phoneNumber;
}
//# sourceMappingURL=phone.util.js.map