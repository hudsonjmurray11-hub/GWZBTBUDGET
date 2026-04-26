'use client';

import { useState } from 'react';
import type { Suggestion } from '@/lib/types';
import { VoteButton } from './VoteButton';

const CATEGORIES = [
  'Social',
  'National Dues',
  'Housing',
  'Philanthropy',
  'Brotherhood/Misc',
  'General',
];

interface Props {
  initialSuggestions: Suggestion[];
  isExec?: boolean;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function SuggestionBoard({ initialSuggestions, isExec, onApprove, onDismiss }: Props) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitted) return;

    if (sessionStorage.getItem('chapter_suggestion_submitted')) {
      setSubmitError('You have already submitted a suggestion this session.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, category }),
    });

    if (!res.ok) {
      const json = await res.json();
      setSubmitError(json.error ?? 'Submission failed.');
      setSubmitting(false);
      return;
    }

    const newSuggestion: Suggestion = await res.json();
    setSuggestions(prev => [newSuggestion, ...prev]);
    sessionStorage.setItem('chapter_suggestion_submitted', 'true');
    setSubmitted(true);
    setBody('');
    setSubmitting(false);
  }

  function statusBadge(status: Suggestion['status']) {
    const map: Record<Suggestion['status'], string> = {
      pending: 'bg-gray-100 text-gray-600',
      approved: 'bg-zbt-navy-100 text-zbt-navy',
      dismissed: 'bg-red-100 text-red-600',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {!submitted ? (
        <form onSubmit={handleSubmit} className="border border-zbt-navy-200 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm text-gray-700">Submit an anonymous suggestion</h3>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
          >
            {CATEGORIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Your suggestion (min 10 characters)..."
            rows={3}
            required
            minLength={10}
            className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy resize-none"
          />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Anonymously'}
          </button>
        </form>
      ) : (
        <div className="border border-zbt-navy-200 bg-zbt-navy-50 rounded-xl p-4 text-sm text-zbt-navy">
          Your suggestion was submitted anonymously.
        </div>
      )}

      <div className="space-y-3">
        {suggestions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No suggestions yet.</p>
        )}
        {suggestions.map(s => (
          <div key={s.id} className="border border-zbt-navy-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">{s.anon_name}</span>
                  <span className="text-xs text-gray-400">&bull;</span>
                  <span className="text-xs text-gray-400">{s.category}</span>
                  {statusBadge(s.status)}
                </div>
                <p className="text-sm text-gray-800">{s.body}</p>
              </div>
              <VoteButton suggestion={s} />
            </div>
            {isExec && s.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onApprove?.(s.id)}
                  className="text-xs text-zbt-navy border border-zbt-navy-200 rounded-lg px-3 py-1 hover:bg-zbt-navy-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => onDismiss?.(s.id)}
                  className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
