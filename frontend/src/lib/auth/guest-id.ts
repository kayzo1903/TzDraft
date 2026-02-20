const GUEST_ID_STORAGE_KEY = 'tzdraft:guestId';

const makeGuestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Math.random().toString(36).slice(2, 12)}`;
};

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') {
    return makeGuestId();
  }

  const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const guestId = makeGuestId();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
  return guestId;
}
