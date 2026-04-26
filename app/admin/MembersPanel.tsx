'use client';

import { useState } from 'react';
import type { Grade, Role } from '@/lib/types';

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  grade: Grade | null;
}

const GRADES: (Grade | '')[] = ['', 'Freshman', 'Sophomore', 'Junior', 'Senior'];
const ROLES: Role[] = ['member', 'exec'];

export function MembersPanel({ initialMembers, isEditMode }: { initialMembers: Member[]; isEditMode: boolean }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: 'member' as Role, grade: '' as Grade | '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        grade: addForm.grade || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setAddError(json.error ?? 'Failed to add member');
      setAddLoading(false);
      return;
    }

    setMembers(prev => [...prev, json]);
    setAddForm({ name: '', email: '', password: '', role: 'member', grade: '' });
    setShowAdd(false);
    setAddLoading(false);
  }

  function startEdit(m: Member) {
    setEditingId(m.id);
    setEditForm({ name: m.name, role: m.role, grade: m.grade });
    setSaveError('');
  }

  async function handleSave(id: string) {
    setSaveLoading(true);
    setSaveError('');

    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    });

    const json = await res.json();
    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save');
      setSaveLoading(false);
      return;
    }

    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...editForm } as Member : m));
    setEditingId(null);
    setSaveLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this member? This cannot be undone.')) return;

    const res = await fetch('/api/admin/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== id));
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Members</h2>
        {isEditMode && (
          <button onClick={() => setShowAdd(v => !v)} className="btn-primary">
            {showAdd ? 'Cancel' : '+ Add Member'}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-6 border border-zbt-navy-200 rounded-xl p-4 bg-zbt-navy-50">
          <h3 className="font-medium text-sm text-gray-700 mb-3">New Member</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temp Password</label>
              <input
                type="password"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
              <select
                value={addForm.grade}
                onChange={e => setAddForm(f => ({ ...f, grade: e.target.value as Grade | '' }))}
                className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              >
                {GRADES.map(g => <option key={g} value={g}>{g || '— No grade —'}</option>)}
              </select>
            </div>
          </div>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={addLoading} className="btn-primary">
              {addLoading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zbt-navy-50 border-b border-zbt-navy-200">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Name</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Email</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Role</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Grade</th>
              {isEditMode && <th className="text-center px-3 py-2.5 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zbt-navy-100">
            {members.map(m => (
              <tr key={m.id} className="hover:bg-zbt-navy-50">
                <td className="px-3 py-2.5">
                  {editingId === m.id ? (
                    <input
                      value={editForm.name ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-zbt-navy-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    />
                  ) : (
                    <span className="font-medium text-gray-800">{m.name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{m.email}</td>
                <td className="px-3 py-2.5">
                  {editingId === m.id ? (
                    <select
                      value={editForm.role ?? m.role}
                      onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                      className="border border-zbt-navy-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'exec' ? 'badge-exec' : 'bg-gray-100 text-gray-600'}`}>
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editingId === m.id ? (
                    <select
                      value={editForm.grade ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, grade: (e.target.value || null) as Grade | null }))}
                      className="border border-zbt-navy-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zbt-navy"
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g || '— None —'}</option>)}
                    </select>
                  ) : (
                    <span className="text-gray-500">{m.grade ?? '—'}</span>
                  )}
                </td>
                {isEditMode && (
                  <td className="px-3 py-2.5 text-center">
                    {editingId === m.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSave(m.id)}
                          disabled={saveLoading}
                          className="text-xs text-zbt-navy border border-zbt-navy-200 rounded px-2 py-1 hover:bg-zbt-navy-50"
                        >
                          {saveLoading ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(m)}
                          className="text-xs text-zbt-navy border border-zbt-navy-200 rounded px-2 py-1 hover:bg-zbt-navy-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}
