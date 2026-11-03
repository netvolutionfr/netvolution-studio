import { formatDate, t, tm } from '@ns/core';
import { useEditor } from './store.ts';

const time = (iso: string) => formatDate(iso, { timeStyle: 'medium' });

/** Operation journal (CS-09, ADR-0013): every recorded change, its origin and counts; never content. */
export function Journal() {
  const journal = useEditor((s) => s.journal);
  return (
    <div className="ds journal">
      <p className="hint">{t('journal.hint')}</p>
      {journal.length === 0 && <p className="hint">{t('journal.empty')}</p>}
      <ol className="journal-list" aria-label={t('journal.title')}>
        {[...journal].reverse().map((r) => (
          <li key={`${r.at}-${r.label}`} className="journal-row">
            <span className="journal-meta">
              {time(r.at)} ·{' '}
              <span className={`journal-origin journal-${r.origin}`}>
                {r.origin === 'ai' ? t('journal.ai') : t('journal.you')}
              </span>
            </span>
            <strong>{r.label}</strong>
            <span className="hint">{tm(r.changes)}</span>
            <code className="journal-commands">{[...new Set(r.commands)].join(', ')}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
