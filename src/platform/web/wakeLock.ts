/**
 * Jaga layar tetap menyala selama proses panjang (Screen Wake Lock API, Chrome Android).
 * Kalau tidak didukung / ditolak, mengembalikan fungsi kosong. Lock dilepas otomatis oleh browser
 * saat tab disembunyikan; karena itu diminta ulang ketika tab terlihat lagi.
 */
interface WakeLockSentinelLike {
  release(): Promise<void>;
}
interface WakeLockNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
}

export async function keepScreenOn(onHidden?: () => void): Promise<() => void> {
  const nav = navigator as unknown as WakeLockNavigator;
  let lock: WakeLockSentinelLike | null = null;
  const acquire = async () => {
    try {
      lock = nav.wakeLock ? await nav.wakeLock.request('screen') : null;
    } catch {
      lock = null;
    }
  };
  const onVis = () => {
    if (document.visibilityState === 'hidden') onHidden?.();
    else void acquire();
  };
  await acquire();
  document.addEventListener('visibilitychange', onVis);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    void lock?.release().catch(() => undefined);
    lock = null;
  };
}
