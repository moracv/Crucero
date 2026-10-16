import { useEffect, useState } from 'react';

export function useRoute(): string[] {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'hoy').split('/').map(decodeURIComponent);
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => { setR(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export const go = (path: string) => { location.hash = '#/' + path; };
export const back = () => (history.length > 1 ? history.back() : go('hoy'));
