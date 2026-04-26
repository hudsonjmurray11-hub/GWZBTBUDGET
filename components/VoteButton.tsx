'use client';

import { useState } from 'react';
import type { Suggestion } from '@/lib/types';

async function getBrowserFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    (navigator.hardwareConcurrency ?? 0).toString(),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function VoteButton({ suggestion }: { suggestion: Suggestion }) {
  const [count, setCount] = useState(suggestion.vote_count);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (voted || loading) return;
    setLoading(true);

    try {
      const vote_token = await getBrowserFingerprint();
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion_id: suggestion.id, vote_token }),
      });

      if (res.ok) {
        setCount(c => c + 1);
        setVoted(true);
      } else if (res.status === 409) {
        setVoted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading}
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors shrink-0
        ${
          voted
            ? 'bg-zbt-navy-50 border-zbt-navy-200 text-zbt-navy cursor-default'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }`}
    >
      <span>{voted ? '✓' : '↑'}</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}
