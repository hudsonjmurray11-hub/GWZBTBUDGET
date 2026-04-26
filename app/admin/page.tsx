import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { AdminContent } from './AdminContent';

const ADMIN_EMAIL = 'hudsonjmurray11@gmail.com';

export default async function AdminPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard');

  const admin = createAdminClient();

  const [profilesRes, { data: authData }, categoriesRes, rawDuesRes] = await Promise.all([
    admin.from('profiles').select('*').order('name'),
    admin.auth.admin.listUsers(),
    admin.from('budget_categories').select('*').order('name'),
    admin.from('members_dues').select('*, profiles(name, grade)').order('created_at'),
  ]);

  const profiles = profilesRes.data ?? [];
  const authUsers = authData?.users ?? [];
  const categories = categoriesRes.data ?? [];

  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']));
  const members = profiles.map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dues = (rawDuesRes.data ?? []).map((d: any) => ({
    ...d,
    name: d.profiles?.name ?? 'Unknown',
    grade: d.profiles?.grade ?? null,
  }));

  return (
    <div className="min-h-screen bg-zbt-navy-50">
      <nav className="bg-zbt-navy border-b border-zbt-navy-dark px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white tracking-tight">GW ZBT</span>
            <span className="text-xs font-semibold text-zbt-gold uppercase tracking-widest border border-zbt-gold rounded px-1.5 py-0.5">
              Treasury
            </span>
          </div>
          <span className="badge-admin">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/exec" className="text-sm text-zbt-navy-100 hover:text-white transition-colors">
            ← Back to Exec
          </a>
          <span className="text-sm text-zbt-navy-200">{user.email}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <AdminContent members={members} dues={dues} categories={categories} />
      </main>
    </div>
  );
}
