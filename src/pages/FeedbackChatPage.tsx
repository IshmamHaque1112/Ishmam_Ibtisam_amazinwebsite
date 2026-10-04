import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { FeedbackMessage, FeedbackThread } from '../types';
import { href, navigate, useDocumentTitle } from '../router';

const FeedbackChatPage: React.FC<{ threadId?: string; params: URLSearchParams }> = ({ threadId, params }) => {
  const db = useDb();
  const { username } = useStore();
  const customer = username ? db.getCustomer(username) : undefined;
  const seedSellerId = params.get('seller') ?? '';
  const seedProductId = params.get('product') ?? '';
  const [selectedId, setSelectedId] = useState(threadId ?? '');
  const [sellerId, setSellerId] = useState(seedSellerId);
  const [productId, setProductId] = useState(seedProductId);
  const [draft, setDraft] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDocumentTitle('Messages');

  useEffect(() => setSelectedId(threadId ?? ''), [threadId]);
  useEffect(() => {
    db.refreshFeedback().catch(e => setError(e instanceof Error ? e.message : 'Could not load your conversations.'));
  }, [db, username]);

  if (customer?.role === 'seller') {
    return <div className="max-w-5xl mx-auto py-10 px-4"><p className="rounded bg-amber-50 p-4 text-amber-900">Seller accounts use the seller feedback inbox.</p><a className="mt-3 inline-block text-amazin-blue hover:underline" href={href.sellerFeedback()}>Open seller inbox</a></div>;
  }

  const threads = username ? db.getFeedbackThreadsForCustomer(username) : [];
  const selected = threads.find(t => t.threadId === selectedId);
  const messages = selected ? db.getFeedbackMessages(selected.threadId) : [];
  const seller = selected ? db.getSeller(selected.sellerId) : undefined;

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !selected || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      if (selected.status !== 'open') await db.updateThreadStatus(selected.threadId, 'open');
      await db.addFeedbackMessage({ threadId: selected.threadId, senderType: 'customer', senderName: username, messageText: draft.trim() });
      setDraft('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send your message.'); }
    finally { setBusy(false); }
  };

  const startThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !sellerId || !firstMessage.trim()) return;
    setBusy(true); setError('');
    try {
      const thread = await db.createFeedbackThread({ customerUsername: username, sellerId, productId: productId || undefined, status: 'open' });
      await db.addFeedbackMessage({ threadId: thread.threadId, senderType: 'customer', senderName: username, messageText: firstMessage.trim() });
      setFirstMessage('');
      setSelectedId(thread.threadId);
      navigate(href.feedbackChat(thread.threadId));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start this conversation.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-gray-900">Messages</h1><p className="mt-1 text-sm text-gray-600">Ask a seller about an order or product. Your conversations are private to you and that seller.</p></div>
        <a href={href.products()} className="text-sm text-amazin-blue hover:underline">Continue shopping</a>
      </div>
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
        <section className="rounded-lg border bg-white p-4" aria-label="Your conversations">
          <h2 className="mb-3 font-semibold text-gray-900">Your conversations</h2>
          {threads.length ? <ul className="space-y-2">{threads.map(thread => { const threadMessages = db.getFeedbackMessages(thread.threadId); return <ThreadButton key={thread.threadId} thread={thread} selected={selectedId === thread.threadId} onClick={() => navigate(href.feedbackChat(thread.threadId))} sellerName={db.getSeller(thread.sellerId)?.name ?? thread.sellerId} latest={threadMessages[threadMessages.length - 1]?.messageText} />; })}</ul> : <p className="text-sm text-gray-600">No messages yet. Start a conversation below.</p>}
        </section>

        <section className="rounded-lg border bg-white p-4 sm:p-5">
          {selected ? <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3"><div><h2 className="font-semibold text-gray-900">{seller?.name ?? selected.sellerId}</h2>{selected.productId && <p className="text-xs text-gray-500">About {db.getProduct(selected.productId)?.name ?? selected.productId}</p>}</div><Status status={selected.status} /></div>
            <MessageList messages={messages} currentUser={username ?? ''} />
            <form onSubmit={sendReply} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="customer-reply">Your message</label><textarea id="customer-reply" value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} placeholder="Write a message…" className="min-h-12 flex-1 resize-y rounded border border-gray-400 p-2" /><button disabled={busy || !draft.trim()} className="self-end rounded bg-amazin-orange px-4 py-2 font-semibold text-gray-900 disabled:opacity-50">Send</button></form>
            {selected.status === 'resolved' && <p className="mt-2 text-xs text-gray-500">Sending a reply reopens this conversation.</p>}
          </> : <form onSubmit={startThread} className="space-y-4">
            <div><h2 className="text-lg font-semibold text-gray-900">Message a seller</h2><p className="mt-1 text-sm text-gray-600">Choose a seller and send the first message to open a conversation.</p></div>
            <div><label htmlFor="feedback-seller" className="mb-1 block text-sm font-medium">Seller</label><select id="feedback-seller" value={sellerId} onChange={e => { setSellerId(e.target.value); setProductId(''); }} required className="w-full rounded border border-gray-400 bg-white p-2"><option value="">Choose a seller</option>{db.getSellers().map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><label htmlFor="feedback-product" className="mb-1 block text-sm font-medium">Product (optional)</label><select id="feedback-product" value={productId} onChange={e => setProductId(e.target.value)} className="w-full rounded border border-gray-400 bg-white p-2"><option value="">No specific product</option>{db.getProductsBySeller(sellerId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div><label htmlFor="feedback-first-message" className="mb-1 block text-sm font-medium">Message</label><textarea id="feedback-first-message" value={firstMessage} onChange={e => setFirstMessage(e.target.value)} required maxLength={2000} rows={4} className="w-full rounded border border-gray-400 p-2" placeholder="How can the seller help?" /></div>
            <button disabled={busy || !sellerId || !firstMessage.trim()} className="rounded bg-amazin-orange px-4 py-2 font-semibold text-gray-900 disabled:opacity-50">{busy ? 'Sending…' : 'Start conversation'}</button>
          </form>}
        </section>
      </div>
    </div>
  );
};

const ThreadButton: React.FC<{ thread: FeedbackThread; selected: boolean; sellerName: string; latest?: string; onClick: () => void }> = ({ thread, selected, sellerName, latest, onClick }) => <li><button onClick={onClick} className={`w-full rounded border p-3 text-left hover:border-amazin-orange ${selected ? 'border-amazin-orange bg-orange-50' : 'border-gray-200'}`}><span className="flex items-center justify-between gap-2"><span className="truncate font-medium text-gray-900">{sellerName}</span><Status status={thread.status} /></span><span className="mt-1 block truncate text-xs text-gray-600">{latest || 'Conversation started'}</span></button></li>;

export const Status: React.FC<{ status: FeedbackThread['status'] }> = ({ status }) => <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{status === 'open' ? 'Open' : 'Resolved'}</span>;

export const MessageList: React.FC<{ messages: FeedbackMessage[]; currentUser: string }> = ({ messages, currentUser }) => <div className="max-h-[55vh] min-h-36 space-y-3 overflow-y-auto rounded bg-gray-50 p-3" aria-live="polite">{messages.map(message => <div key={message.messageId} className={`flex ${message.senderType === 'customer' && message.senderName === currentUser ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.senderType === 'customer' && message.senderName === currentUser ? 'bg-blue-100 text-blue-950' : 'bg-white text-gray-800 shadow-sm'}`}><p className="mb-1 text-xs font-semibold text-gray-600">{message.senderName}</p><p className="whitespace-pre-wrap break-words">{message.messageText}</p><time className="mt-1 block text-right text-[10px] text-gray-500">{new Date(message.sentAt).toLocaleString()}</time></div></div>)}</div>;

export default FeedbackChatPage;
