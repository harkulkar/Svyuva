const SW_PATH = '/sw.js';

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(SW_PATH).catch(() => undefined);
  });
}

export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
}

export async function clearNonSensitiveCaches(): Promise<void> {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('svysy-shell-') || key.startsWith('svysy-static-'))
      .map((key) => caches.delete(key))
  );
}
