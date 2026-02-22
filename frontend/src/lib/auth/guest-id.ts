const GUEST_ID_STORAGE_KEY = 'tzdraft:guestId';
const GUEST_ID_PATTERN = /^\d{9}$/;

const makeGuestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const value = buffer[0] % 1_000_000_000;
    return value.toString().padStart(9, '0');
  }
  const value = Math.floor(Math.random() * 1_000_000_000);
  return value.toString().padStart(9, '0');
};

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') {
    return makeGuestId();
  }

  const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (existing && GUEST_ID_PATTERN.test(existing)) {
    return existing;
  }

  const guestId = makeGuestId();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
  return guestId;
}
