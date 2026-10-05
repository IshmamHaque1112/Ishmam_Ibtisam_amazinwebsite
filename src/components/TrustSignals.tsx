import React from 'react';
import { FeedbackMessage, FeedbackThread, Product } from '../types';
import { NO_SPONSORED, SELLER_REPLIES } from '../copy/differentiators';
import {
  formatReplyTime,
  getPriceSignal,
  getSellerResponsiveness,
  getStockLabel,
  SignalKind,
  summarizeResponsiveness
} from '../utils/differentiators';

// Small shared pieces for the Amazin promises. The text always carries the
// meaning; colour only backs it up (WCAG 1.4.1).

const KIND_CLASSES: Record<SignalKind, string> = {
  good: 'bg-green-50 text-green-800 border-green-200',
  caution: 'bg-amber-50 text-amber-900 border-amber-200',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200'
};

export const TrustBadge: React.FC<{ kind: SignalKind; children: React.ReactNode; className?: string }> = ({
  kind,
  children,
  className = ''
}) => (
  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${KIND_CLASSES[kind]} ${className}`}>
    {children}
  </span>
);

export const PriceSignalBadge: React.FC<{ product: Product; className?: string }> = ({ product, className }) => {
  const signal = getPriceSignal(product);
  if (signal.kind === 'none') return null;
  return (
    <TrustBadge kind={signal.kind} className={className}>
      {signal.label}
    </TrustBadge>
  );
};

export const StockLabel: React.FC<{ quantity: number; className?: string }> = ({ quantity, className = '' }) => {
  const stock = getStockLabel(quantity);
  return (
    <span className={`text-xs ${stock.status === 'out' ? 'font-semibold text-gray-900' : 'text-gray-700'} ${className}`}>
      {stock.label}
    </span>
  );
};

export const NoSponsoredNote: React.FC<{ sortLabel: string }> = ({ sortLabel }) => (
  <p className="mb-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" data-testid="no-sponsored">
    <strong className="font-semibold text-gray-900">{NO_SPONSORED.short}</strong>{' '}
    <span className="hidden sm:inline">
      {NO_SPONSORED.detail} {NO_SPONSORED.sortedBy(sortLabel)}
    </span>
  </p>
);

interface ResponsivenessProps {
  threads: FeedbackThread[];
  messagesForThread: (threadId: string) => FeedbackMessage[];
}

// One line for the seller box on a product page.
export const SellerResponsivenessLine: React.FC<ResponsivenessProps> = ({ threads, messagesForThread }) => (
  <p className="mt-2 text-xs text-gray-600">
    {summarizeResponsiveness(getSellerResponsiveness(threads, messagesForThread))}
  </p>
);

// Full section for the seller page.
export const SellerResponsivenessPanel: React.FC<ResponsivenessProps & { messageHref: string }> = ({
  threads,
  messagesForThread,
  messageHref
}) => {
  const stats = getSellerResponsiveness(threads, messagesForThread);
  return (
    <section className="mt-6 bg-white border rounded-lg p-4" aria-labelledby="seller-replies-heading" data-testid="seller-replies">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="seller-replies-heading" className="font-semibold text-gray-900">{SELLER_REPLIES.heading}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{SELLER_REPLIES.intro}</p>
        </div>
        <a
          href={messageHref}
          className="inline-flex min-h-11 items-center rounded border border-amazin-blue px-3 text-sm font-medium text-amazin-blue hover:bg-blue-50"
        >
          {SELLER_REPLIES.messageButton}
        </a>
      </div>
      {stats.enoughData ? (
        <ul className="mt-3 space-y-1 text-sm text-gray-800">
          {stats.medianReplyMs !== null && <li>{formatReplyTime(stats.medianReplyMs, stats.dayPrecision)}</li>}
          <li>{SELLER_REPLIES.resolved(stats.resolvedThreads, stats.totalThreads)}</li>
          {stats.unansweredThreads > 0 && <li>{SELLER_REPLIES.unanswered(stats.unansweredThreads)}</li>}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-700">{SELLER_REPLIES.notEnough(stats.totalThreads)}</p>
      )}
    </section>
  );
};
