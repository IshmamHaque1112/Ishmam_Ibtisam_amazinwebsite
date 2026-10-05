// Every piece of shopper-facing text for the five Amazin promises lives here,
// so the wording stays the same on every page. Keep it plain and factual:
// no exclamation marks, no urgency, nothing the code doesn't back up.

export const NO_SPONSORED = {
  short: 'No sponsored results.',
  detail: "Sellers can't pay for placement.",
  sortedBy: (sortLabel: string) => `Sorted by: ${sortLabel}.`
};

export const PRICE_SIGNAL = {
  atLow: 'Lowest price we have recorded',
  nearLow: 'Within 5% of its lowest price',
  atHigh: 'Highest price in the last 30 days',
  aboveLow: (percent: number) => `${percent}% above its lowest price`
};

export const STOCK = {
  out: 'Out of stock',
  inStock: (n: number) => `${n} in stock`,
  unknown: 'Stock unknown',
  cartShort: (n: number) => (n === 0 ? 'Now out of stock' : `Only ${n} available`)
};

export const SELLER_REPLIES = {
  heading: 'How this seller responds',
  intro: 'Every seller can be messaged directly. These numbers come from real conversations on Amazin.',
  notEnough: (count: number) =>
    `Not enough conversations yet to show reply times (${count} so far).`,
  resolved: (resolved: number, total: number) => `Resolved ${resolved} of ${total} conversations`,
  unanswered: (n: number) => `${n} still waiting for a first reply`,
  messageButton: 'Message this seller'
};

export const VERIFIED = {
  badge: 'Verified purchase',
  legend: '"Verified purchase" means the reviewer ordered this item on Amazin before writing the review.',
  filter: 'Verified purchases only',
  count: (verified: number, total: number) =>
    `Verified purchases: ${verified} of ${total} ${total === 1 ? 'review' : 'reviews'}`,
  willBeVerified: 'You ordered this item, so your review will be marked as a verified purchase.',
  wontBeVerified: "You haven't ordered this item on Amazin, so your review won't be marked as a verified purchase."
};

export const HOW_WE_DIFFER = {
  heading: 'How Amazin is different from Amazon',
  items: [
    {
      title: 'No sponsored results',
      body: "Sellers can't pay to be placed higher. You choose how the list is sorted."
    },
    {
      title: 'Honest prices',
      body: "Each product shows where today's price sits against its lowest recorded price and its 30-day high."
    },
    {
      title: 'Sellers you can reach',
      body: 'Message any seller directly and see how they have handled past conversations.'
    },
    {
      title: 'Verified purchase reviews',
      body: 'Reviews written by shoppers who ordered the item are marked.'
    },
    {
      title: 'Real stock counts',
      body: 'We show the actual number in stock, with no countdown timers.'
    }
  ]
};
