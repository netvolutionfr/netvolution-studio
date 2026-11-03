import { describe, expect, it } from 'vitest';
import { testRegistry } from '../test-registry.ts';
import { createRegistry } from './registry.ts';

describe('registry', () => {
  it('checks nesting rules', () => {
    expect(testRegistry.canContain('box', 'label')).toBe(true);
    expect(testRegistry.canContain('label', 'box')).toBe(false);
    expect(testRegistry.canContain('box', 'unknown')).toBe(false);
  });

  it('refuses duplicate types', () => {
    const [box] = testRegistry.list();
    if (!box) throw new Error('fixture');
    expect(() => createRegistry([box, box])).toThrow(/Duplicate/);
  });
});
