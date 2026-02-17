import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";

export function usePendingFriendsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      setLoading(true);
      const requests = await friendService.getPendingRequests();
      setCount(requests.length);
    } catch (error) {
      console.error("Failed to fetch pending requests count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Refresh every 30 seconds to check for new requests
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const refreshCount = async () => {
    await fetchCount();
  };

  return { count, loading, refreshCount };
}
