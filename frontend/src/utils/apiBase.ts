export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  return fromEnv || '';
}
