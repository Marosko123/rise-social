import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { RISE_BRAND_ASSET_MANIFEST_V1 } from '../brand/brand-assets.v1';
import { RISE_BRAND_COPY_V1 } from '../brand/brand-copy.v1';

const destinationRoot = resolve(
  process.cwd(),
  'public-site',
  'public',
  'brand',
);

const sourceByFileName = {
  'Rise_logo.svg': 'public/rise/gradient/Rise_logo.svg',
  'Rise_logo_transparent.png':
    'public/rise/gradient/Rise_logo_transparent.png',
  'Rise_logo_text_transparent.png':
    'public/rise/gradient/Rise_logo_text_transparent.png',
  'Rise_logo_circle.png': 'public/rise/gradient/Rise_logo_circle.png',
  'Inter-Regular.woff': 'assets/fonts/Inter/Inter-Regular.woff',
  'Inter-SemiBold.woff': 'assets/fonts/Inter/Inter-SemiBold.woff',
  'PlayfairDisplay-Regular.ttf':
    'assets/fonts/Playfair_Display/static/PlayfairDisplay-Regular.ttf',
  'PlayfairDisplay-SemiBold.ttf':
    'assets/fonts/Playfair_Display/static/PlayfairDisplay-SemiBold.ttf',
  'LICENSE-Playfair-Display.txt': 'assets/fonts/Playfair_Display/OFL.txt',
} as const;

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function findRiseSourceRoot(): string | undefined {
  const explicit = process.env.RISE_SK_SOURCE_ROOT;
  if (explicit) {
    return resolve(explicit);
  }
  let cursor = process.cwd();
  while (dirname(cursor) !== cursor) {
    const candidate = join(cursor, 'rise.sk', 'rise_webpage');
    if (existsSync(join(candidate, 'src', 'data', 'portfolio-projects.ts'))) {
      return candidate;
    }
    cursor = dirname(cursor);
  }
  return undefined;
}

function sourceFor(
  sourceRoot: string,
  fileName: string,
): string | undefined {
  if (fileName === 'LICENSE-Inter.txt') {
    const candidates = [
      join(
        sourceRoot,
        'node_modules',
        '@fontsource',
        'inter',
        'LICENSE',
      ),
      resolve(
        process.cwd(),
        'node_modules',
        '@fontsource',
        'inter',
        'LICENSE',
      ),
    ];
    return candidates.find(existsSync);
  }
  const relative =
    sourceByFileName[fileName as keyof typeof sourceByFileName];
  return relative ? join(sourceRoot, relative) : undefined;
}

const write = process.argv.includes('--write');
const sourceRoot = findRiseSourceRoot();
const errors: string[] = [];

for (const asset of RISE_BRAND_ASSET_MANIFEST_V1.assets) {
  const destination = join(destinationRoot, asset.fileName);
  const source = sourceRoot
    ? sourceFor(sourceRoot, asset.fileName)
    : undefined;

  if (write) {
    if (!source || !existsSync(source)) {
      errors.push(`Missing allowlisted source for ${asset.fileName}.`);
      continue;
    }
    mkdirSync(destinationRoot, { recursive: true });
    copyFileSync(source, destination);
  }

  if (!existsSync(destination)) {
    errors.push(`Missing public brand asset ${asset.fileName}.`);
    continue;
  }
  const destinationHash = sha256(destination);
  if (destinationHash !== asset.sha256) {
    errors.push(
      `${asset.fileName} has ${destinationHash}; expected ${asset.sha256}.`,
    );
  }
  if (source && existsSync(source)) {
    const sourceHash = sha256(source);
    if (sourceHash !== asset.sha256) {
      errors.push(
        `Rise source drift for ${asset.fileName}: ${sourceHash}; snapshot expects ${asset.sha256}.`,
      );
    }
  }
}

if (sourceRoot) {
  const copySources = [
    ['messages/sk.json', RISE_BRAND_COPY_V1.sourceFiles[0].sha256],
    [
      'src/data/portfolio-projects.ts',
      RISE_BRAND_COPY_V1.sourceFiles[1].sha256,
    ],
  ] as const;
  for (const [relative, expected] of copySources) {
    const actual = sha256(join(sourceRoot, relative));
    if (actual !== expected) {
      errors.push(
        `Canonical copy source drift for ${relative}: ${actual}; snapshot expects ${expected}.`,
      );
    }
  }
} else {
  console.warn(
    'Rise.sk source repo is unavailable; verified committed public hashes only.',
  );
}

if (errors.length) {
  throw new Error(errors.join('\n'));
}

console.log(
  `${write ? 'Synchronized and verified' : 'Verified'} ${
    RISE_BRAND_ASSET_MANIFEST_V1.assets.length
  } Rise brand files${sourceRoot ? ' against the source repo' : ''}.`,
);
