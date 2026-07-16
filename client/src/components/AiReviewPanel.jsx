import { Bug, ShieldAlert, Sparkles, Gauge, Lightbulb, Wand2 } from 'lucide-react';
import { CircularProgress } from '@/components/ui';
import { cn } from '@/utils';

const SEVERITY = {
  low: 'bg-gray-500/15 text-gray-500',
  medium: 'bg-amber-500/15 text-amber-500',
  high: 'bg-orange-500/15 text-orange-500',
  critical: 'bg-red-500/15 text-red-500',
};

function Section({ icon: Icon, title, count, children, accent = 'text-brand-500' }) {
  if (!count) return null;
  return (
    <div className="space-y-2">
      <p className={cn('flex items-center gap-2 text-sm font-semibold', accent)}>
        <Icon size={15} /> {title} <span className="text-xs text-gray-400 font-normal">({count})</span>
      </p>
      {children}
    </div>
  );
}

const Item = ({ children }) => (
  <div className="text-xs bg-gray-50 dark:bg-white/5 rounded-lg p-2.5 leading-relaxed">{children}</div>
);

/** Renders the structured AI review result (same shape for mock and real drivers) */
export function AiReviewPanel({ review }) {
  if (!review) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <CircularProgress value={review.score ?? 0} size={80} stroke={7} />
        <div className="flex-1">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={15} className="text-purple-500" /> AI Review
            {review.driver === 'mock' && (
              <span className="badge bg-amber-500/15 text-amber-500">mock mode</span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{review.summary}</p>
        </div>
      </div>

      <Section icon={Bug} title="Bugs" count={review.bugs?.length} accent="text-red-500">
        {review.bugs.map((b, i) => (
          <Item key={i}>
            {b.line && <span className="font-mono text-brand-400">L{b.line}: </span>}
            <span className="font-medium">{b.issue}</span>
            {b.fix && <span className="text-gray-400"> → {b.fix}</span>}
          </Item>
        ))}
      </Section>

      <Section icon={ShieldAlert} title="Security" count={review.security?.length} accent="text-orange-500">
        {review.security.map((s, i) => (
          <Item key={i}>
            <span className={cn('badge mr-2', SEVERITY[s.severity] || SEVERITY.medium)}>{s.severity}</span>
            {s.line && <span className="font-mono text-brand-400">L{s.line}: </span>}
            <span className="font-medium">{s.issue}</span>
            {s.fix && <span className="text-gray-400"> → {s.fix}</span>}
          </Item>
        ))}
      </Section>

      <Section icon={Wand2} title="Code Smells" count={review.codeSmells?.length} accent="text-amber-500">
        {review.codeSmells.map((c, i) => (
          <Item key={i}>
            {c.line && <span className="font-mono text-brand-400">L{c.line}: </span>}
            {c.issue}
            {c.suggestion && <span className="text-gray-400"> → {c.suggestion}</span>}
          </Item>
        ))}
      </Section>

      <Section icon={Gauge} title="Optimizations" count={review.optimizations?.length} accent="text-sky-500">
        {review.optimizations.map((o, i) => (
          <Item key={i}>{o.issue} <span className="text-gray-400">→ {o.suggestion}</span></Item>
        ))}
      </Section>

      <Section icon={Lightbulb} title="Best Practices" count={review.bestPractices?.length} accent="text-emerald-500">
        {review.bestPractices.map((b, i) => <Item key={i}>{b}</Item>)}
      </Section>

      {review.complexity && (
        <div className="text-xs bg-gray-50 dark:bg-white/5 rounded-lg p-3">
          <span className="font-semibold">Complexity: </span>
          <span className={cn('badge mr-1', SEVERITY[review.complexity.rating === 'high' ? 'critical' : review.complexity.rating] || SEVERITY.low)}>
            {review.complexity.rating}
          </span>
          <span className="text-gray-400">{review.complexity.details}</span>
        </div>
      )}
    </div>
  );
}
