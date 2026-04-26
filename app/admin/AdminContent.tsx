'use client';

import { useState, useRef, useEffect } from 'react';
import { MembersPanel } from './MembersPanel';
import { DuesPanel } from './DuesPanel';
import { BudgetPanel } from './BudgetPanel';
import type { BudgetCategory, Grade, Role } from '@/lib/types';

const EDIT_PASSWORD = 'KETKRISHVSZELYTEHUDSON';

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  grade: Grade | null;
}

interface DuesRecord {
  id: string;
  profile_id: string;
  name: string;
  grade: Grade | null;
  amount_owed: number;
  amount_paid: number;
  semester: string;
}

interface Props {
  members: Member[];
  dues: DuesRecord[];
  categories: BudgetCategory[];
}

export function AdminContent({ members, dues, categories }: Props) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showModal]);

  function openModal() {
    setPasswordInput('');
    setPasswordError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setPasswordInput('');
    setPasswordError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === EDIT_PASSWORD) {
      setIsEditMode(true);
      closeModal();
    } else {
      setPasswordError('Incorrect password. Try again.');
      setPasswordInput('');
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }

  return (
    <>
      {/* Edit mode toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage members, dues, and budget categories. Changes take effect immediately.
          </p>
        </div>
        <div>
          {isEditMode ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4M5 11h14l1 10H4L5 11z" />
                </svg>
                Editing Enabled
              </span>
              <button
                onClick={() => setIsEditMode(false)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock
              </button>
            </div>
          ) : (
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-zbt-navy rounded-lg px-4 py-2 hover:bg-zbt-navy-dark transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Enable Editing
            </button>
          )}
        </div>
      </div>

      <MembersPanel initialMembers={members} isEditMode={isEditMode} />
      <DuesPanel initialDues={dues} members={members} isEditMode={isEditMode} />
      <BudgetPanel initialCategories={categories} isEditMode={isEditMode} />

      {/* Password modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          onKeyDown={handleKeyDown}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zbt-navy-50">
                <svg className="w-5 h-5 text-zbt-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Enter Edit Password</h2>
                <p className="text-xs text-gray-500">Required to unlock editing on this page</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                  placeholder="Password"
                  autoComplete="off"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zbt-navy placeholder-gray-400"
                />
                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{passwordError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-zbt-navy text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-zbt-navy-dark transition-colors"
                >
                  Unlock Editing
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl py-2.5 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
