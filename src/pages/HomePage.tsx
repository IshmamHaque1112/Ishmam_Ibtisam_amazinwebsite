import React from 'react';
import hero from '../assets/home-hero.jpg';
import logo from '../assets/logo-full.png';
import { href, useDocumentTitle } from '../router';
import { HOW_WE_DIFFER } from '../copy/differentiators';

// Where each promise can be seen in the app, in the same order as
// HOW_WE_DIFFER.items.
const LINKS = [
  { label: 'Browse products', href: href.products() },
  { label: 'See the best deals', href: href.products(new URLSearchParams({ sort: 'deal' })) },
  { label: 'Meet our sellers', href: href.sellers() },
  { label: 'Read reviews on any product', href: href.products(new URLSearchParams({ sort: 'rating' })) },
  { label: 'Check stock on any product', href: href.products() }
];

const HomePage: React.FC = () => {
  useDocumentTitle('');
  return (
  <div className="bg-white">
    <section className="relative isolate min-h-[480px] flex items-center overflow-hidden bg-gray-900">
      <img src={hero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" decoding="async" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-950/90 via-gray-950/65 to-gray-950/20" />
      <div className="max-w-7xl mx-auto w-full px-6 py-16 text-white">
        <span className="mb-5 inline-flex rounded-lg bg-white px-3 py-1">
          <img src={logo} alt="Amazin" className="w-44 h-28 object-contain object-left" />
        </span>
        <p className="text-sm uppercase tracking-[0.22em] text-amazin-orange font-semibold">A marketplace built around transparency</p>
        <h1 className="mt-3 max-w-2xl text-4xl sm:text-5xl font-bold leading-tight">Shop with the full picture.</h1>
        <p className="mt-4 max-w-xl text-lg text-gray-100">Compare prices, explore seller details, and learn from other shoppers before you buy.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={href.products()} className="rounded-md bg-amazin-orange px-6 py-3 font-semibold text-gray-950 hover:bg-amber-400">Browse products</a>
          <a href={href.sellers()} className="rounded-md border border-white/70 px-6 py-3 font-semibold text-white hover:bg-white/10">Meet our sellers</a>
        </div>
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-6 py-12" aria-labelledby="how-different-heading" data-testid="how-different">
      <h2 id="how-different-heading" className="text-2xl font-bold text-gray-900">{HOW_WE_DIFFER.heading}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_WE_DIFFER.items.map((item, index) => (
          <li key={item.title} className="rounded-lg border bg-gray-50 p-5">
            <h3 className="font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{item.body}</p>
            <a href={LINKS[index].href} className="mt-3 inline-block text-sm font-medium text-amazin-blue hover:underline">
              {LINKS[index].label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
  );
};

export default HomePage;
