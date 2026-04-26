import type { MemberDues } from '@/lib/types';

function paymentStatus(dues: MemberDues): { label: string; classes: string } {
  if (dues.amount_paid >= dues.amount_owed)
    return { label: 'Paid', classes: 'bg-zbt-navy-100 text-zbt-navy' };
  if (dues.amount_paid > 0)
    return { label: 'Partial', classes: 'bg-amber-100 text-amber-700' };
  return { label: 'Overdue', classes: 'bg-red-100 text-red-600' };
}

export function PaymentTable({ dues }: { dues: MemberDues[] }) {
  if (dues.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No dues records for this semester.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zbt-navy-200">
      <table className="w-full text-sm">
        <thead className="bg-zbt-navy-50 border-b border-zbt-navy-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Grade</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Owed</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zbt-navy-100">
          {dues.map(d => {
            const status = paymentStatus(d);
            const balance = d.amount_owed - d.amount_paid;
            return (
              <tr key={d.id} className="hover:bg-zbt-navy-50">
                <td className="px-4 py-3 font-medium text-gray-800">{d.name ?? 'Unknown'}</td>
                <td className="px-4 py-3 text-gray-500">{d.grade ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  ${d.amount_owed.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  ${d.amount_paid.toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    balance > 0 ? 'text-red-600' : 'text-zbt-navy'
                  }`}
                >
                  ${Math.abs(balance).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.classes}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
