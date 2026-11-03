import { registry } from '@ns/components';
import {
  AI_PERMISSIONS,
  AI_TASKS,
  type AiStatus,
  buildAiRequest,
  newNodeId,
  type Proposal,
  proposalFrom,
  t,
} from '@ns/core';
import { Sparkles } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '../ui/index.ts';
import { aiComplete, aiStatus } from './api.ts';
import { ReviewDialog } from './Review.tsx';
import { useEditor, useStore } from './store.ts';

const TASKS = [
  'title',
  'rewrite',
  'summarize',
  'tone',
  'seo',
  'structure',
  'testimonials',
  'tablet',
  'spacing',
  'sober',
  'palette',
] as const satisfies readonly (keyof typeof AI_TASKS)[];

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
  if (!status) return <p className="hint ds">{t('assistant.loading')}</p>;

  const node = selection ? doc.nodes[selection] : undefined;
  const page = doc.pages.find((p) => p.id === pageId);
  const scope = node
    ? t('assistant.scopeElement', { name: node.name ?? registry.get(node.type)?.label ?? node.type })
    : t('assistant.scopePage', { title: page?.title ?? t('assistant.currentPage') });

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
            {t('assistant.actsOn', {
              provider: status.provider ? t(`assistant.providers.${status.provider}`) : '',
              model: status.model ?? '',
              scope,
            })}
          </p>
          <fieldset className="assistant-tasks">
            <legend className="field-label">{t('assistant.taskExamples')}</legend>
            {TASKS.map((key) => (
              <Button key={key} size="sm" onClick={() => setInstruction(AI_TASKS[key])}>
                {t(`assistant.tasks.${key}`)}
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
              <span className="field-label">{t('assistant.instruction')}</span>
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
              {busy ? t('assistant.proposing') : t('assistant.propose')}
            </Button>
          </form>
          <p className="hint">{t('assistant.sent', { scope })}</p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {proposal && (
            <div className="assistant-result" role="status">
              {proposal.kind === 'error' ? (
                <p className="field-error">{t('assistant.refused', { message: proposal.message })}</p>
              ) : proposal.kind === 'text' ? (
                <p>
                  <strong>{t('assistant.suggestion')}</strong> {proposal.text}
                </p>
              ) : (
                <>
                  <p>{t('assistant.changes', { count: proposal.lines.length })}</p>
                  <Button size="sm" onClick={() => setReview(true)}>
                    {t('assistant.review')}
                  </Button>
                </>
              )}
            </div>
          )}
          {proposal?.kind === 'batch' && review && (
            <ReviewDialog
              title={t('assistant.proposal')}
              lines={proposal.lines}
              notice={proposal.text || undefined}
              acceptLabel={t('assistant.accept')}
              onAccept={() => {
                const r = store.applyBatch(
                  proposal.calls,
                  // Never the instruction: it may quote the client's texts (journal without content).
                  t('assistant.proposal'),
                  'ai',
                  AI_PERMISSIONS,
                );
                if (r.ok) setProposal(null);
                else setError(t('assistant.invalid', { message: r.error.message }));
              }}
              onClose={() => setReview(false)}
            />
          )}
        </>
      ) : (
        <>
          <p role="status">
            <strong>{t('assistant.disabled')}</strong> {status.reason}
          </p>
          <p className="hint">{t('assistant.enableHint')}</p>
        </>
      )}
      <p className="hint">
        {t('assistant.limits', {
          maxTokens: status.limits.maxTokens,
          perMinute: status.limits.perMinute,
          dailyTokens: status.limits.dailyTokens,
          usedToday: status.usedToday,
        })}
      </p>
    </div>
  );
}
