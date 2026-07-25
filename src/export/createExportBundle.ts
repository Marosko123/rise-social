import { createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { basename, join } from 'node:path';

import archiver from 'archiver';

import { computeApprovalDigest } from '@/domain/approval';
import { assertRunReadyForApproval } from '@/domain/approvalReadiness';
import type { AssetRecord, ContentRun, PostConcept, SourceEvidence } from '@/domain/schemas';
import { publishingText, trackedPlatformLink } from '@/domain/tracking';

export interface RenderedPostAssets {
  postId: string;
  slides: string[];
  pdf: string;
}

export interface AssetRenderer {
  render(post: PostConcept, destination: string, assets?: readonly AssetRecord[]): Promise<RenderedPostAssets>;
}

export interface ExportBundleResult {
  directory: string;
  zipPath: string;
  digest: string;
  fileDigests: Record<string, string>;
}

function safeSegment(value: string): string {
  const segment = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  if (!segment) throw new Error(`Unsafe empty path segment derived from "${value}".`);
  return segment;
}

async function archiveFiles(
  directory: string,
  zipPath: string,
  relativePaths: string[],
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve(archive.pointer()));
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    for (const relativePath of relativePaths) {
      archive.file(join(/*turbopackIgnore: true*/ directory, relativePath), {
        name: relativePath,
      });
    }
    void archive.finalize();
  });
}

async function writePlatformFiles(
  post: PostConcept,
  postDirectory: string,
  postPrefix: string,
  rendered: RenderedPostAssets,
  sources: SourceEvidence[],
  runId: string,
  generatedAt: string,
): Promise<string[]> {
  const relativePaths: string[] = [];
  for (const platform of ['instagram', 'linkedin', 'facebook'] as const) {
    const destination = join(postDirectory, platform);
    await mkdir(destination, { recursive: true });
    const variant = post.platforms[platform];
    const caption = publishingText(
      variant.caption,
      variant.link,
      platform,
      runId,
      post.id,
      new Date(generatedAt),
    );
    const commonFiles = ['caption.txt', 'alt-text.txt', 'schedule.txt', 'sources.json'];
    await Promise.all([
      writeFile(join(destination, 'caption.txt'), `${caption}\n`, 'utf8'),
      writeFile(join(destination, 'alt-text.txt'), `${variant.altText}\n`, 'utf8'),
      writeFile(join(destination, 'schedule.txt'), `${variant.scheduledFor}\n`, 'utf8'),
      writeFile(join(destination, 'sources.json'), `${JSON.stringify(sources, null, 2)}\n`, 'utf8'),
    ]);
    relativePaths.push(...commonFiles.map(file => `${postPrefix}/${platform}/${file}`));
    if (variant.link) {
      await writeFile(
        join(destination, 'tracked-link.txt'),
        `${trackedPlatformLink(
          variant.link,
          platform,
          runId,
          post.id,
          new Date(generatedAt),
        )}\n`,
        'utf8',
      );
      relativePaths.push(`${postPrefix}/${platform}/tracked-link.txt`);
    }

    if (platform === 'linkedin') {
      await copyFile(
        /*turbopackIgnore: true*/ rendered.pdf,
        join(destination, 'carousel.pdf'),
      );
      await writeFile(join(destination, 'title.txt'), `${post.title}\n`, 'utf8');
      relativePaths.push(
        `${postPrefix}/${platform}/carousel.pdf`,
        `${postPrefix}/${platform}/title.txt`,
      );
    } else {
      await Promise.all(
        rendered.slides.map((slide, index) =>
          copyFile(
            /*turbopackIgnore: true*/ slide,
            join(destination, `slide-${String(index + 1).padStart(2, '0')}.png`),
          ),
        ),
      );
      relativePaths.push(
        ...rendered.slides.map(
          (_, index) =>
            `${postPrefix}/${platform}/slide-${String(index + 1).padStart(2, '0')}.png`,
        ),
      );
    }
  }
  return relativePaths;
}

export async function createExportBundle(
  run: ContentRun,
  outputRoot: string,
  renderer: AssetRenderer,
): Promise<ExportBundleResult> {
  if (!run.approval) throw new Error('Run must be approved before export.');
  assertRunReadyForApproval(run);
  const digest = computeApprovalDigest(run.draft);
  if (run.approval.digest !== digest || run.approval.revision !== run.revision) {
    throw new Error('Run approval is stale; review and approve the current revision.');
  }

  const runDirectory = join(/*turbopackIgnore: true*/ outputRoot, safeSegment(run.id));
  const directory = join(runDirectory, digest);
  const zipPath = join(runDirectory, `${digest}.zip`);
  await mkdir(directory, { recursive: true });
  const renderDirectory = await mkdtemp(join(runDirectory, '.render-'));
  const archivePaths: string[] = [];

  try {
    for (const [index, post] of run.draft.posts.entries()) {
      const postPrefix = `${String(index + 1).padStart(2, '0')}-${safeSegment(post.theme)}`;
      const postDirectory = join(directory, postPrefix);
      const renderTarget = join(renderDirectory, safeSegment(post.id));
      await mkdir(renderTarget, { recursive: true });
      const rendered = await renderer.render(post, renderTarget, run.draft.assetRecords);
      const sources = run.draft.sources.filter(source => post.sourceIds.includes(source.id));
      archivePaths.push(
        ...(await writePlatformFiles(
          post,
          postDirectory,
          postPrefix,
          rendered,
          sources,
          run.id,
          run.draft.generatedAt,
        )),
      );
    }

    await Promise.all([
      writeFile(join(directory, 'sources.json'), `${JSON.stringify(run.draft.sources, null, 2)}\n`, 'utf8'),
      writeFile(
        join(directory, 'publishing-links.json'),
        `${JSON.stringify(
          {
            metaBusinessSuite: 'https://business.facebook.com/latest/content_calendar',
            linkedinPage: 'https://www.linkedin.com/company/rise-sk/admin/page-posts/published/',
          },
          null,
          2,
        )}\n`,
        'utf8',
      ),
      writeFile(
        join(directory, 'manifest.json'),
        `${JSON.stringify(
          {
            runId: run.id,
            revision: run.revision,
            digest,
            approvedAt: run.approval.approvedAt,
            postCount: run.draft.posts.length,
          },
          null,
          2,
        )}\n`,
        'utf8',
      ),
    ]);
    archivePaths.push('sources.json', 'publishing-links.json', 'manifest.json');

    const fileDigests = Object.fromEntries(
      await Promise.all(
        archivePaths.map(async relativePath => [
          relativePath,
          createHash('sha256')
            .update(await readFile(join(directory, relativePath)))
            .digest('hex'),
        ]),
      ),
    );
    const zipSize = await archiveFiles(directory, zipPath, archivePaths);
    if (zipSize === 0) throw new Error('Export ZIP is empty.');

    if (basename(zipPath) !== `${digest}.zip`) {
      throw new Error('Export manifest does not match the approved digest.');
    }
    return { directory, zipPath, digest, fileDigests };
  } finally {
    await rm(renderDirectory, { recursive: true, force: true });
  }
}
