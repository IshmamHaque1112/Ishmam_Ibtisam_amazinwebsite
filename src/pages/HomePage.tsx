import React from 'react';
import hero from '../assets/home-hero.jpg';
import logo from '../assets/logo-full.png';
import { href, useDocumentTitle } from '../router';

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
    <section className="max-w-7xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold text-gray-900">A more informed way to shop</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border bg-gray-50 p-5"><h3 className="font-semibold text-gray-900">See pricing clearly</h3><p className="mt-2 text-sm text-gray-600">Compare today’s price with historical lows and recent highs.</p></article>
        <article className="rounded-lg border bg-gray-50 p-5"><h3 className="font-semibold text-gray-900">Know the seller</h3><p className="mt-2 text-sm text-gray-600">Review return policies, sourcing, and price, quality, and delivery ratings.</p></article>
        <article className="rounded-lg border bg-gray-50 p-5"><h3 className="font-semibold text-gray-900">Hear from shoppers</h3><p className="mt-2 text-sm text-gray-600">Read product and seller reviews and share your own experience.</p></article>
      </div>
    </section>
  </div>
  );
};

export default HomePage;
