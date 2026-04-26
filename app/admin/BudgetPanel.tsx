'use client';

import { useState } from 'react';
import type { BudgetCategory } from '@/lib/types';

export function BudgetPanel({ initialCategories }: { initialCategories: BudgetCategory[] }) {
  const [categories, setCategories] = useState<BudgetCategory[]>(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BudgetCategory>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', allocated_amount: '', semester: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    const res = await fetch('/api/admin/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name,
        allocated_amount: parseFloat(addForm.allocated_amount),
        semester: addForm.semester,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setAddError(json.error ?? 'Failed to add category');
      setAddLoading(false);
      return;
    }

    setCategories(prev => [...prev, json]);
    setAddForm({ name: '', allocated_amount: '', semester: '' });
    setShowAdd(false);
    setAddLoading(false);
  }

  async function handleSave(id: string) {
    setSaveLoading(true);
    setSaveError('');

    const res = await fetch('/api/admin/budget', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm, allocated_amount: parseFloat(String(editForm.allocated_amount ?? 0)) }),
    });

    const json = await res.json();
    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save');
      setSaveLoading(false);
      return;
    }

    setCategories(prev => prev.map(c => c.id === id ? json : c));
    setEditingId(null);
    setSaveLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this budget category?')) return;
    setDeleteError('');

    const res = await fetch('/api/admin/budget', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();
    if (!res.ok) {
      setDeleteError(json.error ?? 'Failed to delete');
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Budget Categories</h2>
        <button onClick={() => setShowAdd(v => !v)} className="btn-primary">
          {showAdd ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 border border-zbt-navy-200 rounded-xl p-4 bg-zbt-navy-50">
          <h3 className="font-medium text-sm text-gray-700 mb-3">New Budget Category</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category Name</label>
              <input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Social Events"
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Allocated Amount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addForm.allocated_amount}
                onChange={e => setAddForm(f => ({ ...f, allocated_amount: e.target.value }))}
                required
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <input
                value={addForm.semester}
                onChange={e => setAddForm(f => ({ ...f, semester: e.target.value }))}
                required
                placeholder="e.g. Spring 2026"
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
          </div>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
          <div className="mt-3">
            <button type="submit" disabled={addLoading} className="btn-primary">
              {addLoading ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      )}

      {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zbt-navy-50 border-b border-zbt-navy-200">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Category</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Semester</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600">Allocated</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zbt-navy-100">
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-sm text-gray-400">
                  No budget categories yet.
                </td>
              </tr>
            )}
            {categories.map(c => (
              <tr key={c.id} className="hover:bg-zbt-navy-50">
                <td className="px-3 py-2.5">
                  {editingId === c.id ? (
                    <input
                      value={editForm.name ?? c.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-zbt-navy-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    />
                  ) : (
                    <span className="font-medium text-gray-800">{c.name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editingId === c.id ? (
                    <input
                      value={editForm.semester ?? c.semester}
                      onChange={e => setEditForm(f => ({ ...f, semester: e.target.value }))}
                      className="w-full border border-zbt-navy-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    />
                  ) : (
                    <span className="text-gray-500">{c.semester}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {editingId === c.id ? (
                    <input
                      type="number"
                      value={editForm.allocated_amount ?? c.allocated_amount}
                      onChange={e => setEditForm(f => ({ ...f, allocated_amount: parseFloat(e.target.value) }))}
                      className="w-24 border border-zbt-navy-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    />
                  ) : (
                    <span className="text-gray-600">${c.allocated_amount.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {editingId === c.id ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleSave(c.id)}
                        disabled={saveLoading}
                        className="text-xs text-zbt-navy border border-zbt-navy-200 rounded px-2 py-1 hover:bg-zbt-navy-50"
                      >
                        {saveLoading ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, allocated_amount: c.allocated_amount, semester: c.semester }); setSaveError(''); }}
                        className="text-xs text-zbt-navy border border-zbt-navy-200 rounded px-2 py-1 hover:bg-zbt-navy-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}
