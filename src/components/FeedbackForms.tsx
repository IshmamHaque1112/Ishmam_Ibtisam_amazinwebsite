import React, { useId, useState } from 'react';

// Review and tag forms shared by the product and seller pages. Both wait for
// the save to finish, show errors inline (no alert pop-ups), and let the page
// re-render with the new entry instead of reloading the site.

export interface ReviewInput {
  rating: number;
  title?: string;
  reviewText?: string;
}

const RATING_WORDS = ['Horrid', 'Bad', 'Fine', 'Good', 'Great'];
const MAX_TITLE = 100;
const MAX_TEXT = 2000;

export const ReviewForm: React.FC<{
  subject: string; // "product" or "seller", used in the placeholder text
  onSubmit: (review: ReviewInput) => Promise<void>;
  onDone: () => void;
}> = ({ subject, onSubmit, onDone }) => {
  const id = useId();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        rating,
        title: title.trim() || undefined,
        reviewText: text.trim() || undefined
      });
      onDone();
    } catch {
      setError('Your review could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4" aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`} className="font-semibold text-gray-900 mb-3">Write a review</h3>
      <fieldset className="mb-3">
        <legend className="block text-sm text-gray-700 mb-1">
          Rating: {rating} of 5 ({RATING_WORDS[rating - 1]})
        </legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              aria-pressed={rating === star}
              className={`text-2xl leading-none px-1 rounded ${rating >= star ? 'text-amber-600' : 'text-gray-400'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mb-3">
        <label htmlFor={`${id}-title`} className="block text-sm text-gray-700 mb-1">Title (optional)</label>
        <input
          id={`${id}-title`}
          type="text"
          value={title}
          maxLength={MAX_TITLE}
          onChange={e => setTitle(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-3 py-1.5"
          placeholder="Summarize your review"
        />
      </div>
      <div className="mb-3">
        <label htmlFor={`${id}-text`} className="block text-sm text-gray-700 mb-1">Review (optional)</label>
        <textarea
          id={`${id}-text`}
          value={text}
          maxLength={MAX_TEXT}
          onChange={e => setText(e.target.value)}
          className="w-full text-sm border border-gray-300 rounded px-3 py-1.5"
          rows={4}
          placeholder={`Share your experience with this ${subject}`}
        />
      </div>
      {error && (
        <p className="text-sm bg-red-50 text-red-800 rounded p-2 mb-3" role="alert">{error}</p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="text-sm font-semibold bg-amazin-orange text-gray-900 px-4 py-2 rounded hover:bg-amazin-yellow disabled:bg-gray-300 disabled:text-gray-600"
      >
        {saving ? 'Saving…' : 'Submit review'}
      </button>
    </form>
  );
};

const MAX_TAG = 30;

export const TagForm: React.FC<{
  existing: string[];
  onSubmit: (tagName: string) => Promise<void>;
  onDone: () => void;
}> = ({ existing, onSubmit, onDone }) => {
  const id = useId();
  const [tag, setTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = tag.trim().replace(/\s+/g, ' ');
    if (!name) {
      setError('Enter a tag first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name);
      setTag('');
      onDone();
    } catch {
      setError('Your tag could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const alreadyThere = existing.some(t => t.toLowerCase() === tag.trim().toLowerCase());

  return (
    <form onSubmit={handleSubmit} className="mb-3">
      <label htmlFor={`${id}-tag`} className="block text-sm text-gray-700 mb-1">New tag</label>
      <div className="flex gap-2">
        <input
          id={`${id}-tag`}
          type="text"
          value={tag}
          maxLength={MAX_TAG}
          onChange={e => setTag(e.target.value)}
          placeholder="e.g. sturdy, runs small"
          className="flex-1 min-w-0 text-sm border border-gray-300 rounded px-3 py-1.5"
          aria-describedby={`${id}-hint`}
        />
        <button
          type="submit"
          disabled={saving}
          className="text-sm font-semibold bg-amazin-orange text-gray-900 px-3 py-1.5 rounded hover:bg-amazin-yellow disabled:bg-gray-300 disabled:text-gray-600"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-gray-600 mt-1">
        {alreadyThere ? 'Others already used this tag. Adding it counts your vote.' : `Up to ${MAX_TAG} characters.`}
      </p>
      {error && (
        <p className="text-sm bg-red-50 text-red-800 rounded p-2 mt-2" role="alert">{error}</p>
      )}
    </form>
  );
};
