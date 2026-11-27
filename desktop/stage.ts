// Desktop application (ADR-0028): stages the Studio server as the Docker runtime image does
// (Dockerfile, stage 2) under src-tauri/resources/app, and copies the running Node as the sidecar
// binary (in CI, the official build installed by actions/setup-node from .nvmrc).
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const tauri = join(import.meta.dirname, 'src-tauri');
const app = join(tauri, 'resources/app');
// npm through the running Node (npm_execpath, set by `npm run`): no shell, also on Windows (npm.cmd).
const npm = (args: string[], cwd: string) =>
  process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args], cwd)
    : run('npm', args, cwd);
const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
  });

npm(['run', 'build', '-w', '@ns/studio'], repo);

rmSync(app, { recursive: true, force: true });
const workspaces = [
  'apps/studio',
  'apps/guide',
  'packages/core',
  'packages/components',
  'packages/export-astro',
  'tests/e2e',
  'tests/fidelity',
];
for (const f of ['package.json', 'package-lock.json', ...workspaces.map((w) => `${w}/package.json`)])
  cpSync(join(repo, f), join(app, f));
npm(['ci', '--omit=dev', '--no-audit', '--no-fund'], app);
// Workspace links (resolved by resolve-ns.mjs, the bundle drops them) and packages of the Studio UI
// only, already compiled into apps/studio/dist.
for (const p of ['@ns', 'lucide-react', '@radix-ui'])
  rmSync(join(app, 'node_modules', p), { recursive: true, force: true });
for (const p of [
  'packages',
  'templates',
  'fonts/catalog.json',
  'fonts/files',
  'apps/studio/server.ts',
  'apps/studio/dev-server',
  'apps/studio/dist',
])
  cpSync(join(repo, p), join(app, p), { recursive: true });
cpSync(join(import.meta.dirname, 'resolve-ns.mjs'), join(app, 'resolve-ns.mjs'));

const triple = /host: (\S+)/.exec(execFileSync('rustc', ['-vV'], { encoding: 'utf8' }))?.[1];
const ext = process.platform === 'win32' ? '.exe' : '';
mkdirSync(join(tauri, 'binaries'), { recursive: true });
const node = join(tauri, 'binaries', `node-${triple}${ext}`);
cpSync(process.execPath, node);
chmodSync(node, 0o755);
