import { execFileSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const limit = 10 * 1024 ** 3;

async function bytesIn(directory) {
  let bytes = 0;
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return 0;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    bytes += entry.isDirectory() ? await bytesIn(path) : (await stat(path)).size;
  }
  return bytes;
}

export async function checkLfsBudget(root = process.cwd()) {
  let gitCommonDirectory;
  try {
    const raw = execFileSync(
      'git',
      ['rev-parse', '--git-common-dir'],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    gitCommonDirectory = resolve(root, raw);
  } catch {
    gitCommonDirectory = join(root, '.git');
  }
  const objectBytes = await bytesIn(
    join(gitCommonDirectory, 'lfs', 'objects'),
  );
  if (objectBytes > limit) {
    throw new Error(
      `Git LFS objects use ${objectBytes} bytes, above the 10 GiB free safety ceiling. Push blocked; paid overage stays disabled.`,
    );
  }
  return objectBytes;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bytes = await checkLfsBudget();
  console.log(`Git LFS local objects: ${bytes} / ${limit} bytes.`);
}
