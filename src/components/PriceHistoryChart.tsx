import React from 'react';
import { PriceHistoryPoint } from '../db/storeData';
import { formatMoney } from '../utils/cartPricing';

const PriceHistoryChart: React.FC<{ priceHistory: PriceHistoryPoint[] }> = ({ priceHistory }) => {
  if (priceHistory.length === 0) return null;

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

  return (
    <section className="bg-white border rounded-lg p-4" aria-label="Product price history">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="font-semibold text-gray-900">Price history</h2>
          <p className="text-xs text-gray-500">Recorded prices over time</p>
        </div>
        <p className="text-sm text-gray-700">Low {formatMoney(low)} <span className="mx-1 text-gray-300">·</span> High {formatMoney(high)}</p>
      </div>
      <svg viewBox="0 0 600 210" className="w-full h-48" role="img" aria-label={`Prices from ${firstDate} to ${lastDate}`}>
        {[0, 1, 2].map(step => {
          const y = 32 + step * 72;
          return <line key={step} x1="24" x2="576" y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />;
        })}
        <path d={line} fill="none" stroke="#e87524" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={`${point.recordedAt}-${index}`} cx={xFor(index)} cy={yFor(point.price)} r="3.5" fill="#e87524">
            <title>{point.recordedAt}: {formatMoney(point.price)}</title>
          </circle>
        ))}
        <text x="24" y="202" fill="#6b7280" fontSize="11">{firstDate}</text>
        <text x="576" y="202" textAnchor="end" fill="#6b7280" fontSize="11">{lastDate}</text>
      </svg>
    </section>
  );
};

export default PriceHistoryChart;
