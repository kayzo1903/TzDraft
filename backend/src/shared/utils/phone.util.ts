/**
 * Phone Number Utility
 * Handles normalization and validation of Tanzanian phone numbers
 */

/**
 * Normalize Tanzanian phone number to E.164 format (+255...)
 * @param phoneNumber - Input phone number (e.g., "0653274741", "653274741", "+255653274741")
 * @returns Normalized phone number in E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If starts with 0, replace with +255
  if (cleaned.startsWith('0')) {
    cleaned = '+255' + cleaned.substring(1);
  }
  // If starts with 255 but no +, add +
  else if (cleaned.startsWith('255')) {
    cleaned = '+' + cleaned;
  }
  // If doesn't start with +255, assume it's a local number and add +255
  else if (!cleaned.startsWith('+255') && !cleaned.startsWith('+')) {
    cleaned = '+255' + cleaned;
  }

  return cleaned;
}

/**
 * Validate if phone number is a valid Tanzanian number
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidTanzanianPhone(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);

  // Tanzanian phone numbers are +255 followed by 9 digits
  // Mobile numbers start with 6 or 7
  const regex = /^\+255[67]\d{8}$/;

  return regex.test(normalized);
}

/**
 * Format phone number for display
 * @param phoneNumber - Phone number in E.164 format
 * @returns Formatted phone number (e.g., "+255 653 274 741")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);

  if (normalized.startsWith('+255')) {
    const number = normalized.substring(4); // Remove +255
    return `+255 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }

  return phoneNumber;
}
