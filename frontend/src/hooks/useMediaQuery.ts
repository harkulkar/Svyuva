import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));

  useEffect(() => {
    const media = window.matchMedia(query);
    function onChange() {
      setMatches(media.matches);
    }
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsDesktopNav(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
