import { type Message, t, tm } from '@ns/core';
import { CircleCheck, CircleX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../ui/index.ts';

/**
 * Review of a batch before it is applied (ADR-0013): the changes in sentences, then accept (one undo
 * step) or reject (nothing changes). Reused by the AI assistant's proposals.
 */
export function ReviewDialog(props: {
  title: string;
  lines: Message[];
  notice?: Message | string | undefined;
  acceptLabel?: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  return (
    <dialog
      ref={dialog}
      className="ui-dialog review-dialog"
      aria-labelledby="review-title"
      onClose={props.onClose}
    >
      <h2 id="review-title">{props.title}</h2>
      {props.notice && (
        <p className="hint">{typeof props.notice === 'string' ? props.notice : tm(props.notice)}</p>
      )}
      <ul className="review-lines" aria-label={t('review.changes')}>
        {props.lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list for this review.
          <li key={i}>{tm(line)}</li>
        ))}
      </ul>
      <div className="dialog-actions">
        <Button type="button" icon={CircleX} onClick={() => dialog.current?.close()}>
          {t('review.reject')}
        </Button>
        <Button
          type="button"
          variant="primary"
          icon={CircleCheck}
          onClick={() => {
            props.onAccept();
            dialog.current?.close();
          }}
        >
          {props.acceptLabel ?? t('review.apply')}
        </Button>
      </div>
    </dialog>
  );
}
