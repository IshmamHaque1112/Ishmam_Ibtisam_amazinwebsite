import React, { useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href, navigate, useDocumentTitle } from '../router';
import { formatMoney, MAX_QUANTITY, pluralizeItems } from '../utils/cartPricing';
import { formatOrderDate } from '../utils/orders';

// Account page: who is logged in, their order history (demo orders placed at
// checkout, saved in this browser) and "Buy again".
const AccountPage: React.FC = () => {
  const db = useDb();
  const { username, orders, buyAgain, logout } = useStore();
  const [message, setMessage] = useState<{ orderId: string; text: string; ok: boolean } | null>(null);
  useDocumentTitle('Your account');

  const products = db.getProducts();

  const handleBuyAgain = (orderId: string) => {
    const { added, unavailable } = buyAgain(orderId, products);
    const parts: string[] = [];
    if (added > 0) parts.push(`Added ${pluralizeItems(added)} to your cart at today's prices.`);
    if (added === 0 && unavailable === 0) parts.push(`Those items are already in your cart at the ${MAX_QUANTITY}-per-item limit.`);
    if (unavailable > 0) {
      parts.push(`${unavailable} ${unavailable === 1 ? 'product is' : 'products are'} no longer sold by the same seller.`);
    }
    setMessage({ orderId, text: parts.join(' '), ok: added > 0 });
  };

  const totalSpent = orders.reduce((sum, order) => sum + order.grandTotal, 0);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your account</h1>
          <p className="text-sm text-gray-600">
            Logged in as <strong>{username}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={href.cart()} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50">
            Go to cart
          </a>
          <button
            type="button"
            onClick={async () => {
              await db.signOut();
              await logout();
              navigate(href.products());
            }}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>

      <section className="mt-6" aria-labelledby="orders-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <h2 id="orders-heading" className="text-xl font-semibold text-gray-900">
            Order history
          </h2>
          {orders.length > 0 && (
            <p className="text-sm text-gray-600">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {formatMoney(totalSpent)} total
            </p>
          )}
        </div>
        <p className="text-xs text-gray-600 mb-4">
          These are demo orders. No payment was taken, and they are saved in this browser only.
        </p>

        {orders.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center" data-testid="no-orders">
            <p className="text-gray-700">You haven't placed any orders yet.</p>
            <a
              href={href.products()}
              className="mt-4 inline-block bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold px-5 py-2 rounded-md"
            >
              Browse products
            </a>
          </div>
        ) : (
          <ol className="space-y-4" data-testid="order-list">
            {orders.map(order => (
              <li key={order.id} className="bg-white border rounded-lg overflow-hidden" data-testid="order">
                <div className="bg-gray-50 border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      <span className="text-gray-600">Placed </span>
                      <time dateTime={new Date(order.placedAt).toISOString()}>{formatOrderDate(order.placedAt)}</time>
                    </span>
                    <span>
                      <span className="text-gray-600">Total </span>
                      <strong>{formatMoney(order.grandTotal)}</strong>
                    </span>
                    <span className="text-gray-600">{pluralizeItems(order.itemCount)}</span>
                    {order.folderName && <span className="text-gray-600">Folder “{order.folderName}”</span>}
                  </div>
                  <span className="text-gray-600">Order #{order.id}</span>
                </div>

                <ul className="divide-y">
                  {order.lines.map((line, index) => (
                    <li key={`${line.productId}-${line.sellerId}-${index}`} className="px-4 py-3 flex flex-wrap items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <a href={href.product(line.productId)} className="font-medium text-amazin-blue hover:underline">
                          {line.productName}
                        </a>
                        <div className="text-gray-600">
                          Sold by{' '}
                          <a href={href.seller(line.sellerId)} className="text-amazin-blue hover:underline">
                            {line.sellerName}
                          </a>
                          {' · '}Qty {line.quantity} · {formatMoney(line.unitPrice)} each
                          {line.priceLocked && ' · price lock applied'}
                        </div>
                      </div>
                      <span className="font-semibold text-gray-900">{formatMoney(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-t px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div><dt className="inline">Subtotal </dt><dd className="inline">{formatMoney(order.subtotal)}</dd></div>
                    <div><dt className="inline">Tax </dt><dd className="inline">{formatMoney(order.tax)}</dd></div>
                    <div>
                      <dt className="inline">Shipping </dt>
                      <dd className="inline">{order.shipping === 0 ? 'Free' : formatMoney(order.shipping)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => handleBuyAgain(order.id)}
                    className="text-sm font-semibold bg-amazin-yellow hover:bg-amazin-orange text-gray-900 px-3 py-1.5 rounded-md"
                    aria-label={`Buy again: add the items from order ${order.id} to your cart`}
                  >
                    Buy again
                  </button>
                </div>
                {message?.orderId === order.id && (
                  <p
                    className={`mx-4 mb-3 rounded p-2 text-sm ${message.ok ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}
                    role="status"
                  >
                    {message.text}{' '}
                    {message.ok && (
                      <a href={href.cart()} className="font-semibold underline">
                        View cart
                      </a>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};

export default AccountPage;
