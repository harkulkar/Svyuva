import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV } from './data/navigation';
import { PUBLIC_DOCUMENTS } from './data/documents';

describe('public navigation', () => {
  it('includes Home, About Us, Insurance Scheme, Downloads, Press, Contact', () => {
    const labels = PRIMARY_NAV.map((item) => item.label);
    expect(labels).toEqual(['Home', 'About Us', 'Insurance Scheme', 'Downloads', 'Press', 'Contact']);
  });
});

describe('public documents', () => {
  it('lists PDF and Excel files with hrefs under /assets/documents', () => {
    expect(PUBLIC_DOCUMENTS.length).toBeGreaterThan(0);
    for (const doc of PUBLIC_DOCUMENTS) {
      expect(doc.href.startsWith('/assets/documents/')).toBe(true);
    }
  });
});
