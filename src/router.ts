import { useEffect, useState } from 'react';

// Tiny hash router (#/products, #/product/P001, #/search?q=pan). Hash URLs work
// on static hosting like Vercel without any rewrite rules.

export type Route =
  | { name: 'products' }
  | { name: 'product'; id: string }
  | { name: 'sellers' }
  | { name: 'seller'; id: string }
  | { name: 'search'; params: URLSearchParams }
  | { name: 'login'; params: URLSearchParams }
  | { name: 'cart' }
  | { name: 'notFound' };

export const parseHash = (hash: string): Route => {
  const raw = hash.replace(/^#/, '') || '/products';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  switch (parts[0]) {
    case undefined:
    case 'products':
      return { name: 'products' };
    case 'product':
      return parts[1] ? { name: 'product', id: parts[1] } : { name: 'notFound' };
    case 'sellers':
      return { name: 'sellers' };
    case 'seller':
      return parts[1] ? { name: 'seller', id: parts[1] } : { name: 'notFound' };
    case 'search':
      return { name: 'search', params };
    case 'login':
      return { name: 'login', params };
    case 'cart':
      return { name: 'cart' };
    default:
      return { name: 'notFound' };
  }
};

export const href = {
  products: () => '#/products',
  product: (id: string) => `#/product/${encodeURIComponent(id)}`,
  sellers: () => '#/sellers',
  seller: (id: string) => `#/seller/${encodeURIComponent(id)}`,
  search: (params: URLSearchParams) => `#/search?${params.toString()}`,
  login: (next?: string) => (next ? `#/login?next=${encodeURIComponent(next)}` : '#/login'),
  cart: () => '#/cart'
};

export const navigate = (to: string) => {
  window.location.hash = to.replace(/^#/, '');
};

export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
};
