// The app bundle drops the workspace symlinks (node_modules/@ns/*): resolve @ns/<pkg>[/sub] through
// packages/<pkg>/package.json "exports" instead. Loaded with `node --import`.
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const packages = new URL('./packages/', import.meta.url);

registerHooks({
  resolve(specifier, context, next) {
    const m = /^@ns\/([^/]+)(\/.+)?$/.exec(specifier);
    if (!m) return next(specifier, context);
    const dir = new URL(`${m[1]}/`, packages);
    const { exports } = JSON.parse(readFileSync(new URL('package.json', dir), 'utf8'));
    const target = exports[m[2] ? `.${m[2]}` : '.'];
    if (!target) return next(specifier, context);
    return { url: new URL(target, dir).href, shortCircuit: true, format: 'module-typescript' };
  },
});
