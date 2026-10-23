import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGrossingHistory } from '../src/lib/grossing.mjs';

export const REPOSITORY = 'Aks22-64/openkitty';
export const DATA_PATH = 'src/data/grossing-history.json';
const shaPattern = /^[a-f0-9]{40}$/;

// Update one fixed data file. A concurrent main-branch update causes a safe
// failure at the non-forced ref update; it can never be overwritten.
export async function publishSnapshot({ content, expectedHead, api }) {
  if (!shaPattern.test(expectedHead)) throw new Error('Invalid expected head');
  validateGrossingHistory(JSON.parse(content));
  if (Buffer.byteLength(content) > 2_000_000) throw new Error('History exceeds serving limit');
  const repo = await api('GET', '');
  if (repo.full_name !== REPOSITORY || repo.private !== false || repo.default_branch !== 'main') throw new Error('Publication target must be the configured public repository');
  const ref = await api('GET', '/git/ref/heads/main');
  if (ref.object.sha !== expectedHead) throw new Error('Main changed during collection; retry from the new head');
  const parent = await api('GET', `/git/commits/${expectedHead}`);
  if (!shaPattern.test(parent.tree.sha)) throw new Error('Invalid parent tree');
  const blob = await api('POST', '/git/blobs', { content, encoding: 'utf-8' });
  const tree = await api('POST', '/git/trees', { base_tree: parent.tree.sha, tree: [{ path: DATA_PATH, mode: '100644', type: 'blob', sha: blob.sha }] });
  const commit = await api('POST', '/git/commits', {
    message: 'chore(data): collect daily grossing snapshot [skip ci]', tree: tree.sha, parents: [expectedHead],
  });
  if (!shaPattern.test(commit.sha)) throw new Error('Invalid data commit');
  await api('PATCH', '/git/refs/heads/main', { sha: commit.sha, force: false });
  return commit.sha;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.GITHUB_REPOSITORY !== REPOSITORY || process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_TOKEN) throw new Error('Publication is restricted to the repository main-branch workflow');
  const token = process.env.GITHUB_TOKEN;
  const api = async (method, path, body) => {
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`GitHub publication failed: HTTP ${response.status}`);
    return response.json();
  };
  const content = await readFile(new URL('../src/data/grossing-history.json', import.meta.url), 'utf8');
  const expectedHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const sha = await publishSnapshot({ content, expectedHead, api });
  console.log(`Published daily snapshot: ${sha}`);
}
