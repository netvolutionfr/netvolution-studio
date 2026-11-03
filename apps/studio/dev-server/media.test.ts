import { describe, expect, it } from 'vitest';
import { checkSvg, guessFont } from './media.ts';

const ok =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#1d4ed8"/></svg>';

describe('SVG policy (refusal, never rewriting)', () => {
  it('accepts plain vector drawings, internal references and inline styles', () => {
    expect(checkSvg(ok)).toBeNull();
    expect(
      checkSvg(
        '<?xml version="1.0"?><!-- logo --><svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs>' +
          '<style>.a{fill:url(#g)}</style><rect class="a" width="4" height="4"/><use href="#g"/></svg>',
      ),
    ).toBeNull();
  });

  it.each([
    ['script', '<svg><script>alert(1)</script></svg>'],
    ['script with spaces', '<svg>< script >alert(1)</script></svg>'],
    ['event attribute', '<svg onload="alert(1)"></svg>'],
    ['event attribute on child', '<svg><rect width="1" onmouseover="alert(1)"/></svg>'],
    ['javascript href', '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>'],
    ['entity-encoded javascript', '<svg><a href="&#106;avascript:alert(1)">x</a></svg>'],
    ['hex-entity-encoded event', '<svg &#x6f;nload="alert(1)"></svg>'],
    ['split javascript', '<svg><a href="java\tscript:alert(1)">x</a></svg>'],
    ['foreignObject', '<svg><foreignObject><iframe src="https://evil.example"/></foreignObject></svg>'],
    ['external image', '<svg><image href="https://evil.example/track.png"/></svg>'],
    ['xlink external', '<svg><use xlink:href="https://evil.example/a.svg#x"/></svg>'],
    ['data URI', '<svg><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>'],
    ['external CSS url', '<svg><style>rect{fill:url(https://evil.example/x)}</style></svg>'],
    ['CSS import', '<svg><style>@import "https://evil.example/x.css";</style></svg>'],
    [
      'DOCTYPE / XXE',
      '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
    ],
    ['animate to javascript', '<svg><a><set attributeName="href" to="javascript:alert(1)"/></a></svg>'],
    ['HTML disguised as SVG', '<html><body><script>alert(1)</script></body></html>'],
    ['embedded object', '<svg><object data="x.swf"/></svg>'],
  ])('refuses %s', (_label, svg) => {
    expect(checkSvg(svg)).not.toBeNull();
  });
});

describe('guessFont (ADR-0018)', () => {
  it('reads family, weight and style from usual file names', () => {
    expect(guessFont('Inter-SemiBoldItalic.woff2')).toEqual({
      family: 'Inter',
      weight: { min: 600, max: 600 },
      style: 'italic',
    });
    expect(guessFont('lora-latin-wght-normal.woff2')).toEqual({
      family: 'Lora',
      weight: { min: 100, max: 900 },
      style: 'normal',
    });
    expect(guessFont('PlayfairDisplay-Regular.woff2').family).toBe('Playfair Display');
    expect(guessFont('<script>.woff2').family).toBe('Script');
  });
});
