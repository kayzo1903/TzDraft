import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { useAuthStore } from "@/lib/auth/auth-store";

export function usePendingFriendsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isHydrated } = useAuthStore();

  const fetchCount = async () => {
    if (!isHydrated || !isAuthenticated) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const requests = await friendService.getPendingRequests();
      setCount(requests.length);
    } catch {
      // Non-critical UI metric: fail closed without noisy console errors.
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      setCount(0);
      setLoading(false);
      return;
    }

    fetchCount();

    // Refresh every 30 seconds to check for new requests
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, [isHydrated, isAuthenticated]);

  const refreshCount = async () => {
    await fetchCount();
  };

  return { count, loading, refreshCount };
}
