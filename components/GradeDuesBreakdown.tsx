'use client';

import type { MemberDues, Grade } from '@/lib/types';

const GRADES: Grade[] = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

interface GradeStats {
  grade: Grade;
  total: number;
  paid: number;
  partial: number;
  overdue: number;
  pct: number;
}

export function GradeDuesBreakdown({ dues }: { dues: MemberDues[] }) {
  const stats: GradeStats[] = GRADES.map(grade => {
    const members = dues.filter(d => d.grade === grade);
    const total = members.length;
    const paid = members.filter(d => d.amount_owed > 0 && d.amount_paid >= d.amount_owed).length;
    const partial = members.filter(d => d.amount_paid > 0 && d.amount_paid < d.amount_owed).length;
    const overdue = members.filter(d => d.amount_paid === 0 && d.amount_owed > 0).length;
    return { grade, total, paid, partial, overdue, pct: total > 0 ? Math.round((paid / total) * 100) : 0 };
  }).filter(s => s.total > 0);

  if (stats.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-2">Dues by Class Year</h2>
        <p className="text-sm text-gray-400">
          No grade data available. Assign grades to members in the Admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-800 mb-5">Dues by Class Year</h2>
      <div className="space-y-5">
        {stats.map(s => (
          <div key={s.grade}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-800">{s.grade}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 font-medium">{s.paid} paid</span>
                {s.partial > 0 && (
                  <span className="text-amber-600">{s.partial} partial</span>
                )}
                {s.overdue > 0 && (
                  <span className="text-red-500">{s.overdue} overdue</span>
                )}
                <span className="text-gray-400">{s.total} total</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-zbt-navy-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zbt-navy rounded-full transition-all duration-500"
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{s.pct}% complete</p>
          </div>
        ))}
      </div>
    </div>
  );
}
