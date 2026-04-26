import type { AIInsight } from '@/lib/types';

const severityConfig = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
  },
};

const typeLabel: Record<AIInsight['type'], string> = {
  alert: 'Alert',
  prediction: 'Prediction',
  recommendation: 'Recommendation',
};

export function InsightCard({ insight }: { insight: AIInsight }) {
  const config = severityConfig[insight.severity];
  return (
    <div className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
          {typeLabel[insight.type]}
        </span>
      </div>
      <h3 className={`font-semibold text-sm mb-1 ${config.text}`}>{insight.title}</h3>
      <p className={`text-xs leading-relaxed ${config.text} opacity-80`}>{insight.body}</p>
    </div>
  );
}
