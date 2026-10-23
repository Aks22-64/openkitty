import { execFileSync } from 'node:child_process';
// Vercel: exit 0 skips a build, exit 1 builds it. Any uncertainty builds.
try {
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const base = /^[a-f0-9]{40}$/.test(previous ?? '') ? previous : 'HEAD^';
  const changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  if (changed.length && changed.every(path => path === 'src/data/grossing-history.json')) {
    console.log('Only public chart observations changed; runtime reads the updated history.');
    process.exit(0);
  }
} catch { /* Missing git history must never suppress a code deployment. */ }
process.exit(1);
