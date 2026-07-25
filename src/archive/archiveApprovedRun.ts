import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { computeApprovalDigest } from '@/domain/approval';
import {
  ArchiveManifestSchema,
  type ArchiveManifest,
  type ContentRun,
} from '@/domain/schemas';

function isDemo(run: ContentRun): boolean {
  return run.draft.warnings.some(warning => /(?:demo|ukáž)/iu.test(warning));
}

export function createArchiveManifest(
  run: ContentRun,
  files: string[],
  now = new Date(),
): ArchiveManifest {
  if (!run.approval) throw new Error('Only an approved run can be archived.');
  if (isDemo(run)) throw new Error('Demo or ukážkový run cannot enter the approved archive.');
  const digest = computeApprovalDigest(run.draft);
  if (run.approval.digest !== digest || run.approval.revision !== run.revision) {
    throw new Error('Only the current approved digest can be archived.');
  }
  return ArchiveManifestSchema.parse({
    runId: run.id,
    digest,
    archivedAt: now.toISOString(),
    revision: run.revision,
    approvedOnly: true,
    files: [...new Set(files)].sort(),
  });
}

async function listFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, path)));
    else files.push(relative(root, path));
  }
  return files;
}

export async function archiveApprovedRun(
  run: ContentRun,
  exportDirectory: string,
  archiveRoot: string,
  now = new Date(),
): Promise<{ directory: string; manifest: ArchiveManifest }> {
  const digest = computeApprovalDigest(run.draft);
  const directory = join(archiveRoot, run.id, digest);
  const manifestPath = join(directory, 'archive-manifest.json');
  try {
    const existing = ArchiveManifestSchema.parse(
      JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
    );
    if (existing.digest !== digest) throw new Error('Existing archive digest mismatch.');
    return { directory, manifest: existing };
  } catch (error) {
    if (
      error instanceof Error &&
      !('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')
    ) {
      throw error;
    }
  }

  await mkdir(directory, { recursive: true });
  await cp(exportDirectory, directory, { recursive: true, errorOnExist: true, force: false });
  const files = (await listFiles(directory)).filter(file => file !== 'archive-manifest.json');
  const manifest = createArchiveManifest(run, files, now);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { directory, manifest };
}
