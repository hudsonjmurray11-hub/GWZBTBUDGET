import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { anthropic } from '@/lib/anthropic';
import type { AIInsight } from '@/lib/types';

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

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'exec') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [categoriesRes, expensesRes, duesRes] = await Promise.all([
    supabase.from('budget_categories').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('members_dues').select('*'),
  ]);

  const categories = categoriesRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const dues = duesRes.data ?? [];

  const totalBudget = categories.reduce((s, c) => s + c.allocated_amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const totalOwed = dues.reduce((s, d) => s + d.amount_owed, 0);
  const totalPaid = dues.reduce((s, d) => s + d.amount_paid, 0);
  const membersPaid = dues.filter(d => d.amount_paid >= d.amount_owed).length;

  const categorySpending = categories.map(cat => ({
    category: cat.name,
    allocated: cat.allocated_amount,
    spent: expenses
      .filter(e => e.category_id === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  }));

  const financialSummary = {
    totalBudget,
    totalSpent,
    budgetRemaining: totalBudget - totalSpent,
    totalDuesOwed: totalOwed,
    totalDuesCollected: totalPaid,
    collectionRate: totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0,
    membersPaid,
    totalMembers: dues.length,
    categoryBreakdown: categorySpending,
  };

  const prompt = `You are a financial advisor for a college fraternity chapter.
Analyze this financial data and provide exactly 3 actionable insights.

Financial Data:
${JSON.stringify(financialSummary, null, 2)}

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation outside the JSON.
Each object must have these exact fields:
- type: one of "alert" | "prediction" | "recommendation"
- severity: one of "info" | "warning" | "danger" | "success"
- title: short title (under 60 characters)
- body: 1-2 sentence explanation with specific numbers from the data

Severity guide: danger = immediate action needed, warning = attention needed, info = neutral observation, success = positive trend`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const insights: AIInsight[] = JSON.parse(jsonStr);

    if (!Array.isArray(insights) || insights.length !== 3) {
      throw new Error('Invalid insight format from AI');
    }

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json(FALLBACK_INSIGHTS);
  }
}
