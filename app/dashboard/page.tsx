import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { BudgetChart } from '@/components/BudgetChart';
import { SuggestionBoard } from '@/components/SuggestionBoard';
import { GradeDuesBreakdown } from '@/components/GradeDuesBreakdown';
import type { BudgetCategory, Expense, MemberDues, Suggestion } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'exec') redirect('/exec');

  const [categoriesRes, expensesRes, myDuesRes, suggestionsRes, allDuesRes] = await Promise.all([
    supabase.from('budget_categories').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('members_dues').select('*').eq('profile_id', user.id),
    supabase
      .from('suggestions')
      .select('*')
      .eq('flagged', false)
      .order('vote_count', { ascending: false }),
    supabase.from('members_dues').select('amount_owed, amount_paid, profiles(grade)'),
  ]);

  const categories: BudgetCategory[] = categoriesRes.data ?? [];
  const expenses: Expense[] = expensesRes.data ?? [];
  const myDues: MemberDues[] = myDuesRes.data ?? [];
  const suggestions: Suggestion[] = suggestionsRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDues: MemberDues[] = (allDuesRes.data ?? []).map((d: any) => ({
    ...d,
    grade: d.profiles?.grade ?? null,
  }));

  const totalCollected = allDues.reduce((s, d) => s + d.amount_paid, 0);
  const totalOwed = allDues.reduce((s, d) => s + d.amount_owed, 0);
  const pctPaid = totalOwed > 0 ? Math.round((totalCollected / totalOwed) * 100) : 0;
  const membersPaid = allDues.filter(d => d.amount_paid >= d.amount_owed).length;
  const totalBudget = categories.reduce((s, c) => s + c.allocated_amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const stats = [
    { label: 'Total Collected', value: `$${totalCollected.toLocaleString()}` },
    { label: '% Members Paid', value: `${pctPaid}%` },
    { label: 'Members Fully Paid', value: `${membersPaid} / ${allDues.length}` },
    { label: 'Budget Remaining', value: `$${(totalBudget - totalSpent).toLocaleString()}` },
  ];

  return (
    <div className="min-h-screen bg-zbt-navy-50">
      <nav className="bg-zbt-navy border-b border-zbt-navy-dark px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-tight">GW ZBT</span>
          <span className="text-xs font-semibold text-zbt-gold uppercase tracking-widest border border-zbt-gold rounded px-1.5 py-0.5">
            Treasury
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user.email === 'hudsonjmurray11@gmail.com' && (
            <a href="/admin" className="badge-admin hover:opacity-90 transition-opacity">
              Admin
            </a>
          )}
          <span className="text-sm text-zbt-navy-100">{profile?.name}</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-zbt-navy">{stat.value}</p>
            </div>
          ))}
        </div>

        <GradeDuesBreakdown dues={allDues} />

        {myDues.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-800 mb-4">My Dues</h2>
            <div className="space-y-2">
              {myDues.map(d => {
                const balance = d.amount_owed - d.amount_paid;
                const isPaid = d.amount_paid >= d.amount_owed;
                return (
                  <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-zbt-navy-100 last:border-0">
                    <span className="text-gray-500 font-medium">{d.semester}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        ${d.amount_paid.toFixed(2)} <span className="text-gray-400">of</span> ${d.amount_owed.toFixed(2)}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isPaid ? 'bg-zbt-navy-100 text-zbt-navy' : balance > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isPaid ? 'Paid' : `$${balance.toFixed(2)} due`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Budget Breakdown</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No budget data available yet.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map((cat, i) => {
                  const spent = expenses
                    .filter(e => e.category_id === cat.id)
                    .reduce((s, e) => s + e.amount, 0);
                  const pct = cat.allocated_amount > 0
                    ? Math.min(100, Math.round((spent / cat.allocated_amount) * 100))
                    : 0;
                  const colors = ['#002F6C', '#0044A0', '#C4A44A', '#FFB81C', '#ADBFDE'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={cat.id} className="border border-zbt-navy-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2 truncate">{cat.name}</p>
                      <div className="w-full h-1.5 bg-zbt-navy-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>${spent.toLocaleString()} spent</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">${cat.allocated_amount.toLocaleString()} budgeted</p>
                    </div>
                  );
                })}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <BudgetChart categories={categories} expenses={expenses} view="donut" />
                <BudgetChart categories={categories} expenses={expenses} view="bar" />
              </div>
            </>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Suggestion Board</h2>
          <SuggestionBoard initialSuggestions={suggestions} />
        </div>
      </main>
    </div>
  );
}
