import { useEditor } from './store.ts';

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR');

/** Operation journal (CS-09, ADR-0013): every recorded change, its origin and counts; never content. */
export function Journal() {
  const journal = useEditor((s) => s.journal);
  return (
    <div className="ds journal">
      <p className="hint">
        Opérations de cette session, de la plus récente à la plus ancienne. Le contenu modifié n’est pas
        consigné.
      </p>
      {journal.length === 0 && <p className="hint">Aucune opération.</p>}
      <ol className="journal-list" aria-label="Journal des opérations">
        {[...journal].reverse().map((r) => (
          <li key={`${r.at}-${r.label}`} className="journal-row">
            <span className="journal-meta">
              {time(r.at)} ·{' '}
              <span className={`journal-origin journal-${r.origin}`}>
                {r.origin === 'ai' ? 'IA' : 'Vous'}
              </span>
            </span>
            <strong>{r.label}</strong>
            <span className="hint">{r.changes}</span>
            <code className="journal-commands">{[...new Set(r.commands)].join(', ')}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
