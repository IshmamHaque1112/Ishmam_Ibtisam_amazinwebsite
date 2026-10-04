// Hash routes (#/products, #/product/P001, #/search?q=pan). Hash URLs work on
// static hosting like Vercel without any rewrite rules.
//
// This file has no React imports so the route parsing can be unit tested
// with plain Node (see tests/).

export type Route =
  | { name: 'home' }
  | { name: 'products'; params: URLSearchParams }
  | { name: 'product'; id: string; params: URLSearchParams }
  | { name: 'sellers' }
  | { name: 'seller'; id: string; params: URLSearchParams }
  | { name: 'search'; params: URLSearchParams }
  | { name: 'login'; params: URLSearchParams }
  | { name: 'cart' }
  | { name: 'account' }
  | { name: 'sellerDashboard' }
  | { name: 'sellerInventory' }
  | { name: 'sellerFeedback' }
  | { name: 'feedbackChat'; threadId?: string; params: URLSearchParams }
  | { name: 'notFound' };

export const parseHash = (hash: string): Route => {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  let parts: string[];
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    // A malformed escape like %E0%A4%A is a bad link, not a crash.
    return { name: 'notFound' };
  }

  switch (parts[0]) {
    case undefined:
    case 'home':
      return { name: 'home' };
    case 'products':
      return { name: 'products', params };
    case 'product':
      return parts[1] ? { name: 'product', id: parts[1], params } : { name: 'notFound' };
    case 'sellers':
      return { name: 'sellers' };
    case 'seller':
      return parts[1] ? { name: 'seller', id: parts[1], params } : { name: 'notFound' };
    case 'search':
      return { name: 'search', params };
    case 'login':
      return { name: 'login', params };
    case 'cart':
      return { name: 'cart' };
    case 'account':
      return { name: 'account' };
    case 'seller-dashboard':
      return { name: 'sellerDashboard' };
    case 'seller-inventory':
      return { name: 'sellerInventory' };
    case 'seller-feedback':
      return { name: 'sellerFeedback' };
    case 'feedback-chat':
      return parts[1] ? { name: 'feedbackChat', threadId: parts[1], params } : { name: 'feedbackChat', params };
    default:
      return { name: 'notFound' };
  }
};

const withQuery = (path: string, params?: URLSearchParams) => {
  const query = params?.toString();
  return query ? `${path}?${query}` : path;
};

export const href = {
  home: () => '#/',
  products: (params?: URLSearchParams) => withQuery('#/products', params),
  // Passing a reviewId scrolls straight to that review on the product page
  // (used by the review excerpt shown in product rows).
  product: (id: string, reviewId?: string) =>
    reviewId
      ? `#/product/${encodeURIComponent(id)}?review=${encodeURIComponent(reviewId)}`
      : `#/product/${encodeURIComponent(id)}`,
  sellers: () => '#/sellers',
  seller: (id: string, reviewId?: string) =>
    reviewId
      ? `#/seller/${encodeURIComponent(id)}?review=${encodeURIComponent(reviewId)}`
      : `#/seller/${encodeURIComponent(id)}`,
  search: (params: URLSearchParams) => `#/search?${params.toString()}`,
  login: (next?: string) => (next ? `#/login?next=${encodeURIComponent(next)}` : '#/login'),
  cart: () => '#/cart',
  account: () => '#/account',
  sellerDashboard: () => '#/seller-dashboard',
  sellerInventory: () => '#/seller-inventory',
  sellerFeedback: () => '#/seller-feedback',
  feedbackChat: (threadId?: string) => threadId ? `#/feedback-chat/${encodeURIComponent(threadId)}` : '#/feedback-chat',
  startFeedback: (sellerId: string, productId?: string) => {
    const params = new URLSearchParams({ seller: sellerId });
    if (productId) params.set('product', productId);
    return `#/feedback-chat?${params.toString()}`;
  }
};

// Only allow redirects back into this app (hash routes), never to other sites.
export const safeNext = (next: string | null, fallback = href.products()): string =>
  next && next.startsWith('#/') && !next.startsWith('#/login') ? next : fallback;
