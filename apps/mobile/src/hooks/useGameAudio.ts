import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';

export function useGameAudio() {
  const genericNotifyRef = useRef<Audio.Sound | null>(null);
  const explosionRef    = useRef<Audio.Sound | null>(null);
  const moveRef         = useRef<Audio.Sound | null>(null);
  const capturePoolRef  = useRef<Audio.Sound[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadSounds() {
      // Fix 2: respect iOS silent switch — remove playsInSilentModeIOS
      await Audio.setAudioModeAsync({
        staysActiveInBackground: false,
      }).catch(() => {});

      // Fix 4: load all sounds in parallel so one failure doesn't block others
      const results = await Promise.allSettled([
        Audio.Sound.createAsync(require('../../assets/sounds/GenericNotify.mp3'), { shouldPlay: false, positionMillis: 0 }),
        Audio.Sound.createAsync(require('../../assets/sounds/Explosion.mp3'),     { shouldPlay: false, positionMillis: 0 }),
        Audio.Sound.createAsync(require('../../assets/sounds/Move.mp3'),          { shouldPlay: false, positionMillis: 0 }),
        // Capture pool — 3 instances for overlapping multi-captures
        Audio.Sound.createAsync(require('../../assets/sounds/Capture.mp3'), { shouldPlay: false, positionMillis: 0 }),
        Audio.Sound.createAsync(require('../../assets/sounds/Capture.mp3'), { shouldPlay: false, positionMillis: 0 }),
        Audio.Sound.createAsync(require('../../assets/sounds/Capture.mp3'), { shouldPlay: false, positionMillis: 0 }),
      ]);

      if (!mounted) return;

      const get = (i: number) =>
        results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<{ sound: Audio.Sound }>).value.sound : null;

      genericNotifyRef.current = get(0);
      explosionRef.current     = get(1);
      moveRef.current          = get(2);
      capturePoolRef.current   = [get(3), get(4), get(5)].filter(Boolean) as Audio.Sound[];

      // Log any individual failures without breaking the rest
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`Audio load failed [${i}]:`, r.reason);
      });
    }

    loadSounds();

    return () => {
      mounted = false;
      genericNotifyRef.current?.unloadAsync();
      explosionRef.current?.unloadAsync();
      moveRef.current?.unloadAsync();
      capturePoolRef.current.forEach((s) => s.unloadAsync());
    };
  }, []);

  const playGameStart = useCallback(() => {
    genericNotifyRef.current
      ?.setStatusAsync({ positionMillis: 0, shouldPlay: true })
      .catch(() => {});
  }, []);

  const playCapture = useCallback((count = 1) => {
    const clampedCount = Math.min(Math.max(count, 1), 3);
    for (let i = 0; i < clampedCount; i++) {
      setTimeout(() => {
        capturePoolRef.current[i]
          ?.setStatusAsync({ positionMillis: 0, shouldPlay: true })
          .catch(() => {});
      }, i * 150);
    }
  }, []);

  const playMove = useCallback(() => {
    moveRef.current
      ?.setStatusAsync({ positionMillis: 0, shouldPlay: true })
      .catch(() => {});
  }, []);

  const playGameEnd = useCallback((outcome: 'win' | 'loss' | 'draw') => {
    if (outcome === 'win') {
      genericNotifyRef.current
        ?.setStatusAsync({ positionMillis: 0, shouldPlay: true })
        .catch(() => {});
    } else if (outcome === 'loss') {
      explosionRef.current
        ?.setStatusAsync({ positionMillis: 0, shouldPlay: true, volume: 0.6 })
        .catch(() => {});
    } else {
      genericNotifyRef.current
        ?.setStatusAsync({ positionMillis: 0, shouldPlay: true })
        .catch(() => {});
    }
  }, []);

  const [isMuted, setIsMuted] = useState(false);
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      Audio.setIsEnabledAsync(!next).catch(() => {});
      return next;
    });
  }, []);

  return {
    playGameStart,
    playCapture,
    playMove,
    playGameEnd,
    isMuted,
    toggleMute,
  };
}
