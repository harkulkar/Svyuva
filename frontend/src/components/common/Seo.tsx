import { useEffect } from 'react';
import { SITE } from '../../data/site';

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
};

export function Seo({ title, description, path }: SeoProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE.shortName}` : SITE.fullName;
    document.title = pageTitle;

    const desc = description ?? SITE.description;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE.shortName);

    const privatePath = (path ?? window.location.pathname).startsWith('/admin') || (path ?? window.location.pathname).startsWith('/college') || ['/login', '/signup', '/forgot-password', '/reset-password', '/session-expired', '/network-error', '/forbidden', '/error', '/maintenance'].some((item) => (path ?? window.location.pathname).startsWith(item));
    upsertMeta('name', 'robots', privatePath ? 'noindex, nofollow' : 'index, follow');

    const canonicalHref = `${window.location.origin}${path ?? window.location.pathname}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalHref;
  }, [title, description, path]);

  return null;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}
