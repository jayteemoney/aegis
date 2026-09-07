/**
 * Publish the compiler's ZK material into the UI's static assets.
 *
 *   node scripts/copy-zk.mjs
 *
 * The browser fetches proving keys over HTTP rather than reading them from
 * disk, so `contracts/managed/aegis/{keys,zkir}` has to be reachable under
 * `ui/public/zk`. Both directories are build output and stay gitignored; this
 * script is what keeps them in step.
 *
 * These files are not secrets. A proving key is derived from the public
 * circuit and is identical for every user; what stays private is the witness
 * data fed into it, which never leaves the browser tab.
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'contracts', 'managed', 'aegis');
const target = path.join(root, 'ui', 'public', 'zk');

try {
  await stat(source);
} catch {
  console.error(`Nothing to copy: ${source} does not exist. Run \`yarn compile\` first.`);
  process.exit(1);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const dir of ['keys', 'zkir']) {
  await cp(path.join(source, dir), path.join(target, dir), { recursive: true });
  console.log(`copied ${dir}/`);
}

console.log(`ZK material published to ui/public/zk`);
