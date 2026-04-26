'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { SuggestionBoard } from './SuggestionBoard';
import type { BudgetCategory, Suggestion } from '@/lib/types';

interface Props {
  categories: BudgetCategory[];
  suggestions: Suggestion[];
}

export function ExecActions({ categories, suggestions }: Props) {
  const supabase = createClient();

  const [form, setForm] = useState({
    category_id: categories[0]?.id ?? '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [expenseError, setExpenseError] = useState('');
  const [expenseSuccess, setExpenseSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setExpenseError('');
    setExpenseSuccess('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setExpenseError('Not authenticated');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('expenses').insert({
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      logged_by: user.id,
    });

    if (error) {
      setExpenseError(error.message);
    } else {
      setExpenseSuccess('Expense logged successfully.');
      setForm(f => ({ ...f, amount: '', description: '' }));
    }
    setSubmitting(false);
  }

  async function handleApprove(id: string) {
    await supabase.from('suggestions').update({ status: 'approved' }).eq('id', id);
  }

  async function handleDismiss(id: string) {
    await supabase.from('suggestions').update({ status: 'dismissed' }).eq('id', id);
  }

  return (
    <div className="space-y-8">
      <div className="card-exec p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-gray-800">Log Expense</h2>
          <span className="badge-exec">Exec Only</span>
        </div>
        <form onSubmit={handleExpenseSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
              className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Logging...' : 'Log Expense'}
            </button>
          </div>
          {expenseError && (
            <p className="sm:col-span-2 text-sm text-red-600">{expenseError}</p>
          )}
          {expenseSuccess && (
            <p className="sm:col-span-2 text-sm text-zbt-navy">{expenseSuccess}</p>
          )}
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Suggestion Board</h2>
        <SuggestionBoard
          initialSuggestions={suggestions}
          isExec={true}
          onApprove={handleApprove}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}
