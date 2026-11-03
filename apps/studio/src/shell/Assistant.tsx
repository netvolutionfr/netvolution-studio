import { registry } from '@ns/components';
import {
  AI_PERMISSIONS,
  AI_TASKS,
  type AiStatus,
  buildAiRequest,
  newNodeId,
  type Proposal,
  proposalFrom,
} from '@ns/core';
import { Sparkles } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '../ui/index.ts';
import { aiComplete, aiStatus } from './api.ts';
import { ReviewDialog } from './Review.tsx';
import { useEditor, useStore } from './store.ts';

const PROVIDERS = {
  anthropic: 'Anthropic',
  openai: 'Compatible OpenAI',
  simulated: 'Simulé (tests, démonstration)',
} as const;

const TASKS: [keyof typeof AI_TASKS, string][] = [
  ['title', 'Titre'],
  ['rewrite', 'Reformuler'],
  ['summarize', 'Résumer'],
  ['tone', 'Ton'],
  ['seo', 'SEO'],
  ['structure', 'Structure depuis un brief'],
  ['testimonials', 'Section témoignages'],
  ['tablet', '2 colonnes sur tablette'],
  ['spacing', 'Harmoniser les espacements'],
  ['sober', 'Variante sobre'],
  ['palette', 'Appliquer la palette'],
];

/**
 * AI assistant panel (CS-08, CS-09, ADR-0014): an instruction on the selection (or the page), sent
 * through the server; the answer becomes a checked batch, reviewed as a diff, applied only if
 * accepted (one undo step, journal origin « IA »). Rejecting leaves no trace.
 */
export function Assistant() {
  const store = useStore();
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection);
  const doc = useEditor((s) => s.doc);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [review, setReview] = useState(false);
  const id = useId();
  useEffect(() => {
    aiStatus()
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error && !status) return <p className="field-error ds">{error}</p>;
  if (!status) return <p className="hint ds">Chargement…</p>;

  const node = selection ? doc.nodes[selection] : undefined;
  const page = doc.pages.find((p) => p.id === pageId);
  const scope = node
    ? `l’élément « ${node.name ?? registry.get(node.type)?.label ?? node.type} »`
    : `la page « ${page?.title ?? 'courante'} »`;

  async function ask() {
    setError(null);
    setProposal(null);
    const state = store.getState();
    const request = buildAiRequest({
      site: state.doc,
      pageId: state.pageId,
      selectedId: state.selection,
      instruction,
      registry,
      maxTokens: status?.limits.maxTokens ?? 4000,
    });
    if ('error' in request) return setError(request.error);
    setBusy(true);
    try {
      const response = await aiComplete(request);
      // Checked against the site as it is now: the user may have edited it meanwhile.
      const next = proposalFrom(store.getState().doc, response, { registry, newId: newNodeId });
      setProposal(next);
      setReview(next.kind === 'batch');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      aiStatus().then(setStatus, () => {});
    }
  }

  return (
    <div className="ds assistant">
      {status.enabled ? (
        <>
          <p className="hint">
            {status.provider ? PROVIDERS[status.provider] : ''} ({status.model}) · agit sur {scope}.
          </p>
          <fieldset className="assistant-tasks">
            <legend className="field-label">Demandes types</legend>
            {TASKS.map(([key, label]) => (
              <Button key={key} size="sm" onClick={() => setInstruction(AI_TASKS[key])}>
                {label}
              </Button>
            ))}
          </fieldset>
          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <label className="field field-stack" htmlFor={id}>
              <span className="field-label">Consigne</span>
              <textarea
                id={id}
                rows={4}
                maxLength={4000}
                required
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary" icon={Sparkles} disabled={busy || !instruction.trim()}>
              {busy ? 'Proposition en cours…' : 'Proposer'}
            </Button>
          </form>
          <p className="hint">
            Envoyé au fournisseur : la consigne, {scope} (sa structure et ses textes), les types de composants
            et les noms des tokens. Ni les autres pages, ni les médias, ni les réglages.
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {proposal && (
            <div className="assistant-result" role="status">
              {proposal.kind === 'error' ? (
                <p className="field-error">Proposition refusée : {proposal.message}</p>
              ) : proposal.kind === 'text' ? (
                <p>
                  <strong>Suggestion (sans effet sur le site) :</strong> {proposal.text}
                </p>
              ) : (
                <>
                  <p>{proposal.lines.length} changement(s) proposé(s).</p>
                  <Button size="sm" onClick={() => setReview(true)}>
                    Revoir la proposition
                  </Button>
                </>
              )}
            </div>
          )}
          {proposal?.kind === 'batch' && review && (
            <ReviewDialog
              title="Proposition de l’assistant"
              lines={proposal.lines}
              notice={proposal.text || undefined}
              acceptLabel="Accepter"
              onAccept={() => {
                const r = store.applyBatch(
                  proposal.calls,
                  // Never the instruction: it may quote the client's texts (journal without content).
                  'Proposition de l’assistant',
                  'ai',
                  AI_PERMISSIONS,
                );
                if (r.ok) setProposal(null);
                else setError(`Proposition devenue invalide : ${r.error.message}`);
              }}
              onClose={() => setReview(false)}
            />
          )}
        </>
      ) : (
        <>
          <p role="status">
            <strong>Assistant désactivé.</strong> {status.reason}
          </p>
          <p className="hint">
            Pour l’activer, renseignez <code>NS_AI_PROVIDER</code> et la clé du fournisseur dans le fichier{' '}
            <code>.env</code> du serveur (voir <code>.env.example</code>), puis relancez le Studio. Les clés
            restent sur le serveur.
          </p>
        </>
      )}
      <p className="hint">
        Limites : {status.limits.maxTokens} jetons par réponse, {status.limits.perMinute} requêtes par minute,{' '}
        {status.limits.dailyTokens} jetons par jour ({status.usedToday} utilisés aujourd’hui). L’IA ne publie
        et n’exporte jamais : chaque proposition est à valider, puis s’annule comme toute modification.
      </p>
    </div>
  );
}
