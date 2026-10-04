import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { FeedbackThread } from '../types';
import { href } from '../router';
import { MessageList, Status } from './FeedbackChatPage';

const SellerFeedbackPage: React.FC = () => {
  const db = useDb();
  const { username } = useStore();
  const customer = username ? db.getCustomer(username) : undefined;
  const sellerId = customer?.role === 'seller' ? customer.managedSellerId : undefined;
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  useEffect(() => {
    db.refreshFeedback().catch(e => setError(e instanceof Error ? e.message : 'Could not load feedback.'));
  }, [db, username]);

  const allThreads = sellerId ? db.getFeedbackThreadsForSeller(sellerId) : [];
  const threads = filter === 'open' ? allThreads.filter(t => t.status === 'open') : allThreads;
  useEffect(() => {
    if (!threads.some(t => t.threadId === selectedId)) setSelectedId(threads[0]?.threadId ?? '');
  }, [selectedId, threads.map(t => t.threadId).join('|')]);
  const selected = allThreads.find(t => t.threadId === selectedId);
  const messages = selected ? db.getFeedbackMessages(selected.threadId) : [];
  const seller = sellerId ? db.getSeller(sellerId) : undefined;

  const reply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !selected || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      await db.addFeedbackMessage({ threadId: selected.threadId, senderType: 'seller', senderName: seller?.name ?? username, messageText: draft.trim() });
      setDraft('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send your reply.'); }
    finally { setBusy(false); }
  };

  const resolve = async (thread: FeedbackThread) => {
    setError('');
    try { await db.updateThreadStatus(thread.threadId, thread.status === 'open' ? 'resolved' : 'open'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update this conversation.'); }
  };

  if (!sellerId) return <div className="max-w-4xl mx-auto py-10 px-4"><h1 className="text-2xl font-bold">Seller feedback</h1><p className="mt-2 text-red-800">This page is for seller accounts. Please sign in with a seller account.</p><a className="mt-3 inline-block text-amazin-blue hover:underline" href={href.login()}>Go to login</a></div>;

  return <div className="max-w-6xl mx-auto py-8 px-4">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold text-gray-900">Customer feedback</h1><p className="mt-1 text-sm text-gray-600">Messages for {seller?.name ?? sellerId}. Reply to help customers, or resolve a conversation when it is handled.</p></div><a href={href.sellerDashboard()} className="text-sm text-amazin-blue hover:underline">← Seller dashboard</a></div>
    {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
      <section className="rounded-lg border bg-white p-4" aria-label="Customer threads"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">Inbox</h2><label className="text-xs text-gray-600">Show <select value={filter} onChange={e => setFilter(e.target.value as 'open' | 'all')} className="rounded border p-1 text-sm"><option value="open">Open</option><option value="all">All</option></select></label></div>
        {threads.length ? <ul className="space-y-2">{threads.map(thread => { const threadMessages = db.getFeedbackMessages(thread.threadId); return <li key={thread.threadId}><button onClick={() => setSelectedId(thread.threadId)} className={`w-full rounded border p-3 text-left hover:border-amazin-orange ${selectedId === thread.threadId ? 'border-amazin-orange bg-orange-50' : 'border-gray-200'}`}><span className="flex items-center justify-between gap-2"><span className="truncate font-medium text-gray-900">{thread.customerUsername}</span><Status status={thread.status} /></span><span className="mt-1 block truncate text-xs text-gray-600">{threadMessages[threadMessages.length - 1]?.messageText ?? 'Conversation started'}</span><span className="mt-1 block text-xs text-gray-500">{thread.productId ? db.getProduct(thread.productId)?.name ?? thread.productId : 'General feedback'}</span></button></li>; })}</ul> : <p className="text-sm text-gray-600">{filter === 'open' ? 'No open conversations.' : 'No conversations yet.'}</p>}
      </section>
      <section className="rounded-lg border bg-white p-4 sm:p-5">{selected ? <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3"><div><h2 className="font-semibold text-gray-900">{selected.customerUsername}</h2><p className="text-xs text-gray-500">{selected.productId ? `About ${db.getProduct(selected.productId)?.name ?? selected.productId}` : 'General feedback'}</p></div><button type="button" onClick={() => void resolve(selected)} className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Mark {selected.status === 'open' ? 'resolved' : 'open'}</button></div>
        <MessageList messages={messages} currentUser={username ?? ''} />
        <form onSubmit={reply} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="seller-reply">Your reply</label><textarea id="seller-reply" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} placeholder="Reply to the customer…" className="min-h-12 flex-1 resize-y rounded border border-gray-400 p-2"/><button disabled={busy || !draft.trim()} className="self-end rounded bg-amazin-orange px-4 py-2 font-semibold text-gray-900 disabled:opacity-50">{busy ? 'Sending…' : 'Reply'}</button></form>
      </> : <div className="flex min-h-48 items-center justify-center text-center text-sm text-gray-600">Select a conversation to read and reply. Customers start all conversations.</div>}</section>
    </div>
  </div>;
};

export default SellerFeedbackPage;
