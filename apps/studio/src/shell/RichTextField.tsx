import { t } from '@ns/core';
import { useEffect, useId, useRef, useState } from 'react';
import { type Inline, parse, type RichValue, render, toParagraphs } from '../rich.ts';
import { useTransaction } from './fields.tsx';
import { type FormatAction, FormatToolbar } from './RichFormat.tsx';

export type { Inline, RichValue };

/**
 * Rich text: bold, italic, color, links and line breaks; with `paragraphs`, several paragraphs
 * (Enter starts a new one, Shift+Enter breaks the line). Uses contentEditable + execCommand.
 * ponytail: execCommand is deprecated but universally supported; replace with a dedicated editor
 * only if richer content is required (lists or headings inside a text).
 */
export function RichTextField(props: {
  label: string;
  value: RichValue;
  paragraphs?: boolean;
  onChange: (v: Inline[] | Inline[][]) => { ok: boolean };
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const tx = useTransaction(props.label);
  const [invalid, setInvalid] = useState(false);
  const multi = props.paragraphs === true;
  const paragraphs = toParagraphs(props.value);
  // The selection, kept while a color is chosen outside the editor.
  const saved = useRef<Range | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-rendered when the value changes.
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) render(ref.current, paragraphs, multi);
  }, [props.value, multi]);

  const sync = () => {
    if (!ref.current) return;
    tx.edit();
    const next = parse(ref.current, multi);
    setInvalid(!props.onChange(multi ? next : (next[0] ?? [])).ok);
  };
  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    if (saved.current) {
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(saved.current);
      saved.current = null;
    }
    document.execCommand(command, false, arg);
    sync();
  };
  const keepSelection = () => {
    const range = getSelection()?.rangeCount ? getSelection()?.getRangeAt(0) : null;
    if (range && ref.current?.contains(range.commonAncestorContainer)) saved.current = range.cloneRange();
  };
  const format = (action: FormatAction) => {
    if (action.command === 'color') {
      document.execCommand('styleWithCSS', false, 'true');
      exec('foreColor', action.value);
    } else if (action.command === 'link') exec('createLink', action.value);
    else exec(action.command);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: focusout of the whole field (editor + link form), not a control.
    <div
      className="field field-stack"
      onBlur={(e) => {
        // Leaving the field ends the edit; moving to its link form keeps the text and the selection.
        if (e.currentTarget.contains(e.relatedTarget)) return;
        tx.end();
        setInvalid(false);
        if (ref.current) render(ref.current, toParagraphs(props.value), multi);
      }}
    >
      <span id={id} className="field-label">
        {props.label}
      </span>
      <FormatToolbar onFormat={format} onKeep={keepSelection} />
      {/* biome-ignore lint/a11y/useSemanticElements: a contentEditable textbox has no native equivalent. */}
      <div
        ref={ref}
        role="textbox"
        tabIndex={0}
        aria-multiline={multi}
        aria-labelledby={id}
        aria-invalid={invalid}
        className="rt-editor"
        contentEditable
        suppressContentEditableWarning
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={sync}
        onKeyDown={(e) => {
          // Enter: a new paragraph (paragraphs) or a line break (one paragraph); Shift+Enter: a line break.
          if (e.key !== 'Enter' || (multi && !e.shiftKey)) return;
          e.preventDefault();
          document.execCommand('insertLineBreak');
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand(
            'insertText',
            false,
            e.clipboardData.getData('text/plain').replace(/\s+/g, ' '),
          );
        }}
      />
      {invalid && <span className="field-error">{t('richText.invalid')}</span>}
    </div>
  );
}
