/** Service worker must never intercept or cache authenticated API traffic. */
export function shouldServiceWorkerHandle(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://svysy.invalid');
    if (parsed.pathname.startsWith('/api/') || parsed.pathname.includes('/api/')) return false;
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
