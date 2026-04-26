'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BudgetCategory, Expense } from '@/lib/types';

interface Props {
  categories: BudgetCategory[];
  expenses: Expense[];
  view?: 'donut' | 'bar';
}

const COLORS = ['#002F6C', '#0044A0', '#C4A44A', '#FFB81C', '#ADBFDE'];

export function BudgetChart({ categories, expenses, view = 'donut' }: Props) {
  const data = categories.map((cat, i) => {
    const spent = expenses
      .filter(e => e.category_id === cat.id)
      .reduce((s, e) => s + e.amount, 0);
    return {
      name: cat.name,
      allocated: cat.allocated_amount,
      spent,
      fill: COLORS[i % COLORS.length],
    };
  });

  if (view === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? [`$${value.toLocaleString()}`, ''] : [String(value), '']
            }
          />
          <Legend />
          <Bar dataKey="allocated" name="Allocated" fill="#002F6C" radius={[4, 4, 0, 0]} />
          <Bar dataKey="spent" name="Spent" fill="#C4A44A" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          dataKey="allocated"
          nameKey="name"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            typeof value === 'number' ? `$${value.toLocaleString()}` : String(value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
