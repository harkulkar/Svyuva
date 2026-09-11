import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'svysy-text-scale';
export type TextScale = 'md' | 'lg' | 'xl';

export function useTextScale() {
  const [scale, setScale] = useState<TextScale>('md');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'md' || stored === 'lg' || stored === 'xl') {
      setScale(stored);
      document.documentElement.dataset.textScale = stored;
    }
  }, []);

  const apply = useCallback((next: TextScale) => {
    setScale(next);
    document.documentElement.dataset.textScale = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { scale, apply };
}
