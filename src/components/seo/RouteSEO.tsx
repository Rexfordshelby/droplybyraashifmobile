import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://droplixmumbai.vercel.app';

type MetaConfig = {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
};

const defaultMeta: MetaConfig = {
  title: 'Droplix | Same-Day Parcel Delivery in Mumbai',
  description:
    'Book same-day parcel delivery in Mumbai with Droplix. Send documents, gifts, food, clothes, and small packages with OTP handoff, live tracking, and clear pricing.',
  canonical: `${SITE_URL}/`,
};

function getMetaForPath(pathname: string): MetaConfig {
  if (pathname === '/become-rider') {
    return {
      title: 'Become a Droplix Rider | Earn with Local Deliveries in Mumbai',
      description:
        'Apply to become a Droplix rider in Mumbai. Accept local parcel delivery requests, follow a verified delivery flow, and earn on your schedule.',
      canonical: `${SITE_URL}/become-rider`,
    };
  }

  if (pathname === '/') return defaultMeta;

  return {
    ...defaultMeta,
    title: 'Droplix App | Secure Parcel Delivery Dashboard',
    canonical: `${SITE_URL}${pathname}`,
    robots: 'noindex, nofollow',
  };
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
}

export function RouteSEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = getMetaForPath(pathname);
    const robots = meta.robots ?? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    document.title = meta.title;
    setCanonical(meta.canonical);
    setMeta('description', meta.description);
    setMeta('robots', robots);
    setMeta('googlebot', robots);
    setMeta('og:title', meta.title, 'property');
    setMeta('og:description', meta.description, 'property');
    setMeta('og:url', meta.canonical, 'property');
    setMeta('twitter:title', meta.title);
    setMeta('twitter:description', meta.description);
  }, [pathname]);

  return null;
}
