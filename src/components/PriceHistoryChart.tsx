import React, { useId } from 'react';
import { PriceHistoryPoint } from '../db/storeData';
import { formatMoney } from '../utils/cartPricing';

// Price history for the product page. The SVG is one image whose name states
// the range, low, high and today's price; a visually hidden table gives
// screen reader users every recorded point (WCAG 1.1.1, 1.3.1). Colours meet
// 3:1 for graphics (1.4.11): line #0F766E is 5.47:1 on white.
const LINE = '#0F766E';
const GRID = '#D1D5DB';
const LABEL = '#4B5563';

const PriceHistoryChart: React.FC<{
  priceHistory: PriceHistoryPoint[];
  currentPrice: number;
  allTimeLowPrice: number;
  thirtyDayHighPrice: number;
}> = ({ priceHistory, currentPrice, allTimeLowPrice, thirtyDayHighPrice }) => {
  const headingId = useId();

  if (priceHistory.length === 0) {
    const range = Math.max(thirtyDayHighPrice - allTimeLowPrice, 0.01);
    const position = Math.min(100, Math.max(0, ((currentPrice - allTimeLowPrice) / range) * 100));
    return (
      <section className="bg-white border rounded-lg p-4" aria-labelledby={headingId}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="font-semibold text-gray-900">Price history</h2>
            <p className="text-xs text-gray-600">No dated price records yet. Today's price within its recorded range:</p>
          </div>
          <span className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">History unavailable</span>
        </div>
        <div className="mt-6 px-2">
          <div
            className="relative h-3 rounded-full bg-gradient-to-r from-green-200 via-amber-200 to-red-200"
            role="img"
            aria-label={`Today's price ${formatMoney(currentPrice)} sits ${Math.round(position)}% of the way from the all-time low ${formatMoney(allTimeLowPrice)} to the 30-day high ${formatMoney(thirtyDayHighPrice)}.`}
          >
            <span className="absolute -top-1.5 h-6 w-1 rounded bg-gray-900" style={{ left: `${position}%` }} aria-hidden="true" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-700" aria-hidden="true">
            <span>All-time low {formatMoney(allTimeLowPrice)}</span>
            <span>Current {formatMoney(currentPrice)}</span>
            <span>30-day high {formatMoney(thirtyDayHighPrice)}</span>
          </div>
        </div>
      </section>
    );
  }

  const points = [...priceHistory].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const prices = points.map(point => point.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const span = high - low || Math.max(high * 0.1, 1);
  const xFor = (index: number) => 24 + (index / Math.max(points.length - 1, 1)) * 552;
  const yFor = (price: number) => 176 - ((price - low) / span) * 144;
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.price)}`).join(' ');
  const firstDate = points[0].recordedAt;
  const lastDate = points[points.length - 1].recordedAt;
  const summary =
    `Price history from ${firstDate} to ${lastDate}, ${points.length} recorded prices: ` +
    `low ${formatMoney(low)}, high ${formatMoney(high)}, today ${formatMoney(currentPrice)}.`;

  return (
    <section className="bg-white border rounded-lg p-4" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 id={headingId} className="font-semibold text-gray-900">Price history</h2>
          <p className="text-xs text-gray-600">Recorded prices over time</p>
        </div>
        <p className="text-sm text-gray-700">
          Low {formatMoney(low)} <span className="mx-1 text-gray-500" aria-hidden="true">·</span> High {formatMoney(high)}
        </p>
      </div>
      <figure className="m-0">
        <svg viewBox="0 0 600 210" className="w-full h-48" role="img" aria-label={summary}>
          {[0, 1, 2].map(step => {
            const y = 32 + step * 72;
            return <line key={step} x1="24" x2="576" y1={y} y2={y} stroke={GRID} strokeDasharray="4 4" />;
          })}
          <path d={line} fill="none" stroke={LINE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle key={`${point.recordedAt}-${index}`} cx={xFor(index)} cy={yFor(point.price)} r="3.5" fill={LINE} />
          ))}
          <text x="24" y="202" fill={LABEL} fontSize="12">{firstDate}</text>
          <text x="576" y="202" textAnchor="end" fill={LABEL} fontSize="12">{lastDate}</text>
        </svg>
        <figcaption className="sr-only">
          <table>
            <caption>Recorded prices</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={`${point.recordedAt}-${index}`}>
                  <td>{point.recordedAt}</td>
                  <td>{formatMoney(point.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figcaption>
      </figure>
    </section>
  );
};

export default PriceHistoryChart;
