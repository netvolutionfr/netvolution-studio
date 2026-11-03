import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = resolve(import.meta.dirname, '..');
const markdown = execFileSync('git', ['ls-files', '*.md'], { cwd: repo, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

describe('documentation (ADR-0024)', () => {
  it('relative links point to existing files', () => {
    const broken = markdown.flatMap((file) => {
      const text = readFileSync(join(repo, file), 'utf8').replace(/```[\s\S]*?```/g, '');
      return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
        .map((m) => (m[1] as string).split('#')[0] as string)
        .filter((target) => target && !/^(?:[a-z]+:|\/)/.test(target))
        .filter((target) => !existsSync(join(repo, dirname(file), decodeURIComponent(target))))
        .map((target) => `${file} → ${target}`);
    });
    expect(broken).toEqual([]);
  });
});
