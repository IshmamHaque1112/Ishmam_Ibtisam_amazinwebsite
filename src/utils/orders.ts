import { CartItem, Order, OrderLine, Product, Seller } from '../types';
import { calculateGroupTotals, getEffectivePrice, getLineTotal, isLockActive } from './cartPricing';

// Turns the cart lines being checked out into an order record. Lines whose
// product is no longer in the catalog are skipped, and the totals use the
// same cart math as the order summary, so the history matches what the
// shopper saw when they placed the order.
export const buildOrder = (
  items: CartItem[],
  products: Product[],
  sellers: Seller[],
  options: { id: string; placedAt: number; folderName?: string }
): Order | null => {
  const lines: OrderLine[] = [];
  const priced: CartItem[] = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;
    const seller = sellers.find(s => s.id === item.sellerId);
    priced.push(item);
    lines.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      sellerId: item.sellerId,
      sellerName: seller?.name ?? product.sellerName,
      quantity: item.quantity,
      unitPrice: getEffectivePrice(item, product),
      lineTotal: getLineTotal(item, product),
      priceLocked: isLockActive(item)
    });
  }

  if (lines.length === 0) return null;

  const totals = calculateGroupTotals(priced, products);
  return {
    id: options.id,
    placedAt: options.placedAt,
    folderName: options.folderName,
    lines,
    itemCount: totals.selectedQuantity,
    subtotal: totals.subtotal,
    tax: totals.tax,
    shipping: totals.shipping,
    grandTotal: totals.grandTotal
  };
};

export const newOrderId = (now: number = Date.now()): string =>
  `AMZ-${now.toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

// Which lines of a past order can be bought again from today's catalog.
export const splitReorderable = (order: Order, products: Product[]) => {
  const available: { line: OrderLine; product: Product }[] = [];
  const unavailable: OrderLine[] = [];
  for (const line of order.lines) {
    const product = products.find(p => p.id === line.productId && p.sellerId === line.sellerId);
    if (product) available.push({ line, product });
    else unavailable.push(line);
  }
  return { available, unavailable };
};

export const formatOrderDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
