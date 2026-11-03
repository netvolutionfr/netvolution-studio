import { tokenTypes as T, tokenize } from 'css-tree';

/** `start`: offset in the source, a stable key for rendering. */
export type CssSpan = { start: number; text: string; kind: string };

/**
 * Syntax colors of the project stylesheet editor (ADR-0023), from css-tree's tokenizer. An ident
 * opening a declaration (after `{` or `;`, followed by `:`, ended by `;` or `}` rather than `{`) is
 * a property, the rest of the declaration its value. Display only: `checkCustomCss` checks the sheet.
 */
export function highlightCss(source: string): CssSpan[] {
  const tokens: { type: number; start: number; text: string }[] = [];
  tokenize(source, (type, start, end) => tokens.push({ type, start, text: source.slice(start, end) }));
  const skip = (t?: { type: number }) => t?.type === T.WhiteSpace || t?.type === T.Comment;
  const near = (i: number, step: 1 | -1) => {
    while (skip(tokens[i])) i += step;
    return tokens[i];
  };
  const endsWithBlock = (i: number) => {
    for (; i < tokens.length; i++) {
      const type = tokens[i]?.type;
      if (type === T.LeftCurlyBracket) return true;
      if (type === T.Semicolon || type === T.RightCurlyBracket) return false;
    }
    return false;
  };
  let inValue = false;
  return tokens.map(({ type, start, text }, i) => {
    let kind = '';
    if (type === T.Ident && !inValue) {
      const before = near(i - 1, -1);
      const opens = !before || before.type === T.LeftCurlyBracket || before.type === T.Semicolon;
      if (opens && near(i + 1, 1)?.type === T.Colon && !endsWithBlock(i)) {
        kind = 'property';
        inValue = true;
      } else kind = before?.type === T.Delim && before.text === '.' ? 'selector' : 'tag';
    } else if (type === T.Comment) kind = 'comment';
    else if ([T.String, T.Url, T.BadString, T.BadUrl].includes(type)) kind = 'string';
    else if (type === T.AtKeyword) kind = 'at';
    else if (type === T.Function) kind = 'function';
    else if ([T.Ident, T.Number, T.Percentage, T.Dimension, T.Hash].includes(type))
      kind = inValue ? 'value' : 'selector';
    if (type === T.Semicolon || type === T.RightCurlyBracket || type === T.LeftCurlyBracket) inValue = false;
    return { start, text, kind };
  });
}
