import { createServerSupabaseClient } from '@/lib/supabase-server';
import { anthropic } from '@/lib/anthropic';
import { redirect } from 'next/navigation';
import { BudgetChart } from '@/components/BudgetChart';
import { PaymentTable } from '@/components/PaymentTable';
import { InsightCard } from '@/components/InsightCard';
import { ExecActions } from '@/components/ExecActions';
import { GradeDuesBreakdown } from '@/components/GradeDuesBreakdown';
import type { MemberDues, BudgetCategory, Expense, Suggestion, AIInsight } from '@/lib/types';

const FALLBACK_INSIGHTS: AIInsight[] = [
  {
    type: 'alert',
    severity: 'warning',
    title: 'AI insights temporarily unavailable',
    body: 'Could not generate insights at this time. Financial data is still accurate.',
  },
  {
    type: 'recommendation',
    severity: 'info',
    title: 'Review budget allocation',
    body: 'Manually review category spending against allocations for this semester.',
  },
  {
    type: 'prediction',
    severity: 'info',
    title: 'Dues collection in progress',
    body: 'Monitor payment status regularly to maintain chapter financial health.',
  },
];

async function fetchInsights(
  categories: BudgetCategory[],
  expenses: Expense[],
  dues: MemberDues[]
): Promise<AIInsight[]> {
  const totalBudget = categories.reduce((s, c) => s + c.allocated_amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalOwed = dues.reduce((s, d) => s + d.amount_owed, 0);
  const totalPaid = dues.reduce((s, d) => s + d.amount_paid, 0);
  const membersPaid = dues.filter(d => d.amount_paid >= d.amount_owed).length;

  const financialSummary = {
    totalBudget,
    totalSpent,
    budgetRemaining: totalBudget - totalSpent,
    totalDuesOwed: totalOwed,
    totalDuesCollected: totalPaid,
    collectionRate: totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0,
    membersPaid,
    totalMembers: dues.length,
    categoryBreakdown: categories.map(cat => ({
      category: cat.name,
      allocated: cat.allocated_amount,
      spent: expenses
        .filter(e => e.category_id === cat.id)
        .reduce((s, e) => s + e.amount, 0),
    })),
  };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a financial advisor for a college fraternity chapter.
Analyze this financial data and provide exactly 3 actionable insights.

Financial Data:
${JSON.stringify(financialSummary, null, 2)}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation outside the JSON.
Each object must have these exact fields:
- type: one of "alert" | "prediction" | "recommendation"
- severity: one of "info" | "warning" | "danger" | "success"
- title: short title (under 60 characters)
- body: 1-2 sentence explanation with specific numbers from the data

Severity guide: danger = immediate action needed, warning = attention needed, info = neutral observation, success = positive trend`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const insights: AIInsight[] = JSON.parse(jsonStr);

    if (!Array.isArray(insights) || insights.length !== 3) throw new Error('Bad format');
    return insights;
  } catch {
    return FALLBACK_INSIGHTS;
  }
}

export default async function ExecPage() {
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

  if (profile?.role !== 'exec') redirect('/dashboard');

  const [categoriesRes, expensesRes, rawDuesRes, suggestionsRes] = await Promise.all([
    supabase.from('budget_categories').select('*'),
    supabase.from('expenses').select('*'),
    supabase
      .from('members_dues')
      .select('*, profiles(name, grade)')
      .order('created_at', { ascending: true }),
    supabase
      .from('suggestions')
      .select('*')
      .eq('flagged', false)
      .order('vote_count', { ascending: false }),
  ]);

  const categories: BudgetCategory[] = categoriesRes.data ?? [];
  const expenses: Expense[] = expensesRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dues: MemberDues[] = (rawDuesRes.data ?? []).map((d: any) => ({
    ...d,
    name: d.profiles?.name ?? 'Unknown',
    grade: d.profiles?.grade ?? null,
  }));
  const suggestions: Suggestion[] = suggestionsRes.data ?? [];

  const insights = await fetchInsights(categories, expenses, dues);

  const totalCollected = dues.reduce((s, d) => s + d.amount_paid, 0);
  const totalOwed = dues.reduce((s, d) => s + d.amount_owed, 0);
  const pctPaid = totalOwed > 0 ? Math.round((totalCollected / totalOwed) * 100) : 0;
  const membersPaid = dues.filter(d => d.amount_paid >= d.amount_owed).length;
  const totalBudget = categories.reduce((s, c) => s + c.allocated_amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const stats = [
    { label: 'Total Collected', value: `$${totalCollected.toLocaleString()}` },
    { label: '% Members Paid', value: `${pctPaid}%` },
    { label: 'Members Paid', value: `${membersPaid} / ${dues.length}` },
    { label: 'Budget Remaining', value: `$${(totalBudget - totalSpent).toLocaleString()}` },
  ];

  const isAdmin = user.email === 'hudsonjmurray11@gmail.com';

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
          <span className="badge-exec">Exec</span>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <a href="/admin" className="badge-admin hover:opacity-90 transition-opacity">
              Admin
            </a>
          )}
          <span className="text-sm text-zbt-navy-100">{profile?.name}</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-zbt-navy">{stat.value}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="font-semibold text-gray-800 mb-3">AI Insights</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </section>

        <GradeDuesBreakdown dues={dues} />

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

        <div className="card-exec p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-gray-800">Payment Status</h2>
            <span className="badge-exec">Exec Only</span>
          </div>
          <PaymentTable dues={dues} />
        </div>

        <ExecActions categories={categories} suggestions={suggestions} />
      </main>
    </div>
  );
}
