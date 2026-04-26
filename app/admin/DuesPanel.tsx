'use client';

import { useState } from 'react';
import type { Grade } from '@/lib/types';

interface DuesRecord {
  id: string;
  profile_id: string;
  name: string;
  grade: Grade | null;
  amount_owed: number;
  amount_paid: number;
  semester: string;
}

interface Member {
  id: string;
  name: string;
  grade: Grade | null;
}

interface Props {
  initialDues: DuesRecord[];
  members: Member[];
}

export function DuesPanel({ initialDues, members }: Props) {
  const currentSemester = (() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `${month <= 6 ? 'Spring' : 'Fall'} ${year}`;
  })();

  const [semester, setSemester] = useState(currentSemester);
  const [dues, setDues] = useState<DuesRecord[]>(initialDues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOwed, setEditOwed] = useState('');
  const [editPaid, setEditPaid] = useState('');
  const [logMemberId, setLogMemberId] = useState(members[0]?.id ?? '');
  const [logAmount, setLogAmount] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const semesterDues = dues.filter(d => d.semester === semester);

  async function handleSaveDues(id: string) {
    setSaveLoading(true);
    setSaveError('');

    const res = await fetch('/api/admin/dues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        amount_owed: parseFloat(editOwed),
        amount_paid: parseFloat(editPaid),
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setSaveError(json.error ?? 'Failed to save');
      setSaveLoading(false);
      return;
    }

    setDues(prev => prev.map(d => d.id === id ? { ...d, amount_owed: json.amount_owed, amount_paid: json.amount_paid } : d));
    setEditingId(null);
    setSaveLoading(false);
  }

  async function handleLogPayment(e: React.FormEvent) {
    e.preventDefault();
    setLogLoading(true);
    setLogError('');

    const existing = dues.find(d => d.profile_id === logMemberId && d.semester === semester);
    if (!existing) {
      setLogError('No dues record found for this member and semester. Set dues first.');
      setLogLoading(false);
      return;
    }

    const newPaid = Math.min(existing.amount_paid + parseFloat(logAmount), existing.amount_owed);
    const res = await fetch('/api/admin/dues', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: existing.id, amount_paid: newPaid }),
    });

    const json = await res.json();
    if (!res.ok) {
      setLogError(json.error ?? 'Failed to log payment');
      setLogLoading(false);
      return;
    }

    setDues(prev => prev.map(d => d.id === existing.id ? { ...d, amount_paid: json.amount_paid } : d));
    setLogAmount('');
    setLogLoading(false);
  }

  async function handleBulkSet(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Set dues to $${bulkAmount} for ALL members for ${semester}?`)) return;
    setBulkLoading(true);

    const amount = parseFloat(bulkAmount);
    const results = await Promise.all(
      members.map(m =>
        fetch('/api/admin/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: m.id, amount_owed: amount, semester }),
        }).then(r => r.json())
      )
    );

    // Reload dues
    const res = await fetch(`/api/admin/dues?semester=${encodeURIComponent(semester)}`);
    const updated = await res.json();
    setDues(prev => {
      const otherSemesters = prev.filter(d => d.semester !== semester);
      return [...otherSemesters, ...updated];
    });

    setBulkAmount('');
    setBulkLoading(false);
    void results;
  }

  function statusLabel(d: DuesRecord) {
    if (d.amount_paid >= d.amount_owed && d.amount_owed > 0) return { label: 'Paid', cls: 'bg-zbt-navy-100 text-zbt-navy' };
    if (d.amount_paid > 0) return { label: 'Partial', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Overdue', cls: 'bg-red-100 text-red-600' };
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-semibold text-gray-800">Dues Management</h2>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-500">Semester:</label>
          <input
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="border border-zbt-navy-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <form onSubmit={handleLogPayment} className="border border-zbt-navy-200 rounded-xl p-4 bg-zbt-navy-50">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Log Payment Received</h3>
          <div className="space-y-2">
            <select
              value={logMemberId}
              onChange={e => setLogMemberId(e.target.value)}
              className="w-full border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}{m.grade ? ` (${m.grade})` : ''}</option>)}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount ($)"
                value={logAmount}
                onChange={e => setLogAmount(e.target.value)}
                required
                className="flex-1 border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
              />
              <button type="submit" disabled={logLoading} className="btn-primary">
                {logLoading ? '...' : 'Log'}
              </button>
            </div>
            {logError && <p className="text-xs text-red-600">{logError}</p>}
          </div>
        </form>

        <form onSubmit={handleBulkSet} className="border border-zbt-gold-100 rounded-xl p-4 bg-zbt-gold-50">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Bulk Set Dues for {semester}</h3>
          <p className="text-xs text-gray-500 mb-2">Sets the owed amount for every member. Existing payment records are preserved.</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount ($)"
              value={bulkAmount}
              onChange={e => setBulkAmount(e.target.value)}
              required
              className="flex-1 border border-zbt-navy-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy"
            />
            <button type="submit" disabled={bulkLoading} className="btn-primary">
              {bulkLoading ? '...' : 'Set All'}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zbt-navy-50 border-b border-zbt-navy-200">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Member</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600">Grade</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600">Owed</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600">Paid</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-600">Balance</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Status</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-600">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zbt-navy-100">
            {semesterDues.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-sm text-gray-400">
                  No dues records for {semester}. Use &quot;Bulk Set Dues&quot; to create them.
                </td>
              </tr>
            )}
            {semesterDues.map(d => {
              const { label, cls } = statusLabel(d);
              const balance = d.amount_owed - d.amount_paid;
              return (
                <tr key={d.id} className="hover:bg-zbt-navy-50">
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.grade ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {editingId === d.id ? (
                      <input
                        type="number"
                        value={editOwed}
                        onChange={e => setEditOwed(e.target.value)}
                        className="w-20 border border-zbt-navy-200 rounded px-2 py-1 text-sm text-right"
                      />
                    ) : (
                      <span className="text-gray-600">${d.amount_owed.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {editingId === d.id ? (
                      <input
                        type="number"
                        value={editPaid}
                        onChange={e => setEditPaid(e.target.value)}
                        className="w-20 border border-zbt-navy-200 rounded px-2 py-1 text-sm text-right"
                      />
                    ) : (
                      <span className="text-gray-600">${d.amount_paid.toFixed(2)}</span>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${balance > 0 ? 'text-red-600' : 'text-zbt-navy'}`}>
                    ${Math.abs(balance).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {editingId === d.id ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => handleSaveDues(d.id)}
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
                      <button
                        onClick={() => { setEditingId(d.id); setEditOwed(d.amount_owed.toString()); setEditPaid(d.amount_paid.toString()); setSaveError(''); }}
                        className="text-xs text-zbt-navy border border-zbt-navy-200 rounded px-2 py-1 hover:bg-zbt-navy-50"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}
