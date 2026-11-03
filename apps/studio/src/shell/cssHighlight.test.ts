import { describe, expect, it } from 'vitest';
import { highlightCss } from './cssHighlight.ts';

const kinds = (css: string) =>
  highlightCss(css)
    .filter((s) => s.kind)
    .map((s) => `${s.kind}:${s.text}`)
    .join(' ');

describe('CSS editor highlighting (ADR-0023)', () => {
  it('tells selectors from properties, also in nested rules', () => {
    expect(kinds('@media (x) { a:hover { color: #fff; } }')).toBe(
      'at:@media tag:x tag:a tag:hover property:color value:#fff',
    );
    expect(kinds('.carte { background: url("ns-asset:a1") 10px; /* c */ }')).toBe(
      'selector:carte property:background function:url( string:"ns-asset:a1" value:10px comment:/* c */',
    );
  });

  it('keeps the text intact, even when invalid', () => {
    for (const css of ['.a{b:c}/*d*/', '.a { color: "x', '@@@ {{ ;'])
      expect(
        highlightCss(css)
          .map((s) => s.text)
          .join(''),
      ).toBe(css);
  });
});
