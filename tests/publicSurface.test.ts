import { describe, expect, test } from 'vitest';
import {
  appendFileSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { findPublicSurfaceViolations } from '@/public/publicSurface';

function symlinkOrSkip(
  context: { skip: (reason?: string) => never },
  target: string,
  path: string,
  type: 'file' | 'dir',
) {
  try {
    symlinkSync(target, path, type);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS') {
      context.skip(`Operating system prohibits ${type} symlinks (${code}).`);
    }
    throw error;
  }
}

describe('public repository surface', () => {
  test.each([
    '.env.local',
    'data/studio.sqlite',
    'data/exports/run.zip',
    'browser-state/chrome.json',
    '--full-page',
    'notes/private-key.pem',
  ])('blocks forbidden public path %s without reading it', path => {
    expect(findPublicSurfaceViolations([{ path }])).toContainEqual(
      expect.objectContaining({ path, kind: 'forbidden-path' }),
    );
  });

  test('allows documented examples and reports secret-shaped text without echoing it', () => {
    const placeholder = 'BUFFER_API_KEY=replace-with-buffer-api-key';
    const credential = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    const violations = findPublicSurfaceViolations([
      { path: '.env.example', content: placeholder },
      { path: 'src/example.ts', content: `const leaked = "${credential}"` },
    ]);

    expect(violations).toEqual([
      {
        path: 'src/example.ts',
        kind: 'secret-pattern',
        detail: 'GitHub token pattern',
      },
    ]);
    expect(JSON.stringify(violations)).not.toContain(credential);
  });

  test('scans the allowed environment template content and YouTrack token format', () => {
    const githubCredential = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    const youTrackCredential = [
      'perm:',
      'YWRtaW4=',
      '.',
      'WW91VHJhY2s=',
      '.',
      'abcdefghijklmnopqrstuvwxyz012345',
    ].join('');
    const violations = findPublicSurfaceViolations([
      { path: '.env.example', content: `GITHUB_TOKEN=${githubCredential}` },
      { path: 'docs/example.txt', content: youTrackCredential },
    ]);

    expect(violations).toEqual([
      expect.objectContaining({ path: '.env.example', kind: 'secret-pattern' }),
      expect.objectContaining({
        path: 'docs/example.txt',
        kind: 'secret-pattern',
        detail: 'YouTrack permanent token pattern',
      }),
    ]);
    expect(JSON.stringify(violations)).not.toContain(githubCredential);
    expect(JSON.stringify(violations)).not.toContain(youTrackCredential);
  });

  test('rejects local developer home paths from public artifacts', () => {
    expect(
      findPublicSurfaceViolations([
        {
          path: 'public-site/out/profile-manifest.json',
          content: JSON.stringify({
            sourcePublicPath: ['/Users', 'developer', 'project', 'logo.svg'].join('/'),
          }),
        },
      ]),
    ).toContainEqual(
      expect.objectContaining({
        kind: 'secret-pattern',
        detail: 'absolute local home path',
      }),
    );
  });

  test('blocks a static export that exposes API routes or mutation forms', () => {
    const violations = findPublicSurfaceViolations([
      { path: 'public-site/out/api/runs/demo/approve/index.html' },
      {
        path: 'public-site/out/review/index.html',
        content: '<button>Schváliť a exportovať</button>',
      },
    ]);

    expect(violations).toEqual([
      expect.objectContaining({
        path: 'public-site/out/api/runs/demo/approve/index.html',
        kind: 'public-api-route',
      }),
      expect.objectContaining({
        path: 'public-site/out/review/index.html',
        kind: 'public-mutation-control',
      }),
    ]);
  });

  test.each(['check.sh', 'worker.py', 'settings.toml', 'service.ini'])(
    'CLI scans plausible text regardless of extension: %s',
    fileName => {
      const root = mkdtempSync(join(tmpdir(), 'rise-public-check-'));
      const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
      writeFileSync(join(root, fileName), `credential=${token}\n`);

      const result = spawnSync(
        resolve('node_modules/.bin/tsx'),
        [
          'scripts/check-public.ts',
          '--root',
          root,
          '--path',
          fileName,
        ],
        { cwd: process.cwd(), encoding: 'utf8' },
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${fileName}: GitHub token pattern`);
      expect(result.stderr).not.toContain(token);
    },
  );

  test('CLI rejects a forbidden path without reading its contents', () => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-forbidden-'));
    const forbiddenPath = join(root, '.env.local');
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    writeFileSync(forbiddenPath, token);
    chmodSync(forbiddenPath, 0o000);

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.env.local',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env.local: path is not allowed');
    expect(result.stderr).not.toContain(token);
  });

  test('CLI rejects secret-shaped ASCII content embedded in a binary asset', () => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-binary-'));
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    writeFileSync(
      join(root, 'preview.asset'),
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]),
        Buffer.from(token),
      ]),
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        'preview.asset',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('preview.asset: GitHub token pattern');
    expect(result.stderr).not.toContain(token);
  });

  test('CLI scans bounded chunks beyond 2 MiB without exposing the matched secret', () => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-large-text-'));
    const fileName = 'large-source.txt';
    const filePath = join(root, fileName);
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    writeFileSync(filePath, Buffer.alloc(2 * 1024 * 1024 + 4_096, 0x61));
    appendFileSync(filePath, `\ncredential=${token}\n`);

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        fileName,
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${fileName}: GitHub token pattern`);
    expect(result.stderr).not.toContain(token);
  });

  test('CLI detects a secret spanning the 64 KiB scan boundary', () => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-boundary-'));
    const fileName = 'boundary-source.txt';
    const filePath = join(root, fileName);
    const tokenTail = 'p_abcdefghijklmnopqrstuvwxyz0123456789';

    writeFileSync(filePath, Buffer.alloc(64 * 1024 - 3, 0x61));
    appendFileSync(filePath, '\ngh');
    appendFileSync(filePath, tokenTail);

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        fileName,
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${fileName}: GitHub token pattern`);
    expect(result.stderr).not.toContain(`gh${tokenTail}`);
  });

  test('CLI rejects a file symlink without reading its outside target', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-file-link-'));
    const outside = mkdtempSync(join(tmpdir(), 'rise-public-outside-file-'));
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    const target = join(outside, 'outside-secret.txt');
    const linkName = 'linked-source.txt';
    writeFileSync(target, token);
    symlinkOrSkip(context, target, join(root, linkName), 'file');

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        linkName,
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${linkName}: symbolic links are not allowed`);
    expect(result.stderr).not.toContain('GitHub token pattern');
    expect(result.stderr).not.toContain(token);
  });

  test('CLI rejects a directory symlink before recursing outside its root', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-dir-link-'));
    const outside = mkdtempSync(join(tmpdir(), 'rise-public-outside-dir-'));
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    mkdirSync(join(outside, 'nested'));
    writeFileSync(join(outside, 'nested', 'outside-secret.txt'), token);
    const linkName = 'linked-directory';
    symlinkOrSkip(context, outside, join(root, linkName), 'dir');

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        `${linkName}/nested/outside-secret.txt`,
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `${linkName}/nested/outside-secret.txt: symbolic links are not allowed`,
    );
    expect(result.stderr).not.toContain('GitHub token pattern');
    expect(result.stderr).not.toContain(token);
  });

  test('CLI skips only the canonical Claude skill alias without following it', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-skill-alias-'));
    mkdirSync(join(root, '.agents', 'skills'), { recursive: true });
    mkdirSync(join(root, '.claude'));
    symlinkOrSkip(
      context,
      '../.agents/skills',
      join(root, '.claude', 'skills'),
      'dir',
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.claude/skills',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Public surface check passed');
  });

  test('CLI rejects the canonical Claude skill alias when its target is missing', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-missing-skill-target-'));
    mkdirSync(join(root, '.claude'));
    symlinkOrSkip(
      context,
      '../.agents/skills',
      join(root, '.claude', 'skills'),
      'dir',
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.claude/skills',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '.claude/skills: canonical skill alias target must be an existing non-symlink directory',
    );
  });

  test('CLI rejects the canonical Claude skill alias when its target is a file', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-file-skill-target-'));
    mkdirSync(join(root, '.agents'), { recursive: true });
    writeFileSync(join(root, '.agents', 'skills'), 'not a directory');
    mkdirSync(join(root, '.claude'));
    symlinkOrSkip(
      context,
      '../.agents/skills',
      join(root, '.claude', 'skills'),
      'dir',
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.claude/skills',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '.claude/skills: canonical skill alias target must be an existing non-symlink directory',
    );
  });

  test('CLI rejects the canonical Claude skill alias when its target is another symlink', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-linked-skill-target-'));
    const outside = mkdtempSync(join(tmpdir(), 'rise-public-outside-skills-'));
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    writeFileSync(join(outside, 'outside-secret.txt'), token);
    mkdirSync(join(root, '.agents'), { recursive: true });
    symlinkOrSkip(context, outside, join(root, '.agents', 'skills'), 'dir');
    mkdirSync(join(root, '.claude'));
    symlinkOrSkip(
      context,
      '../.agents/skills',
      join(root, '.claude', 'skills'),
      'dir',
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.claude/skills',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '.claude/skills: canonical skill alias target must be an existing non-symlink directory',
    );
    expect(result.stderr).not.toContain('GitHub token pattern');
    expect(result.stderr).not.toContain(token);
  });

  test('CLI rejects the canonical Claude skill alias when a target ancestor is a symlink', context => {
    const root = mkdtempSync(join(tmpdir(), 'rise-public-linked-skill-ancestor-'));
    const outside = mkdtempSync(join(tmpdir(), 'rise-public-outside-agents-'));
    const token = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    mkdirSync(join(outside, 'skills'));
    writeFileSync(join(outside, 'skills', 'outside-secret.txt'), token);
    symlinkOrSkip(context, outside, join(root, '.agents'), 'dir');
    mkdirSync(join(root, '.claude'));
    symlinkOrSkip(
      context,
      '../.agents/skills',
      join(root, '.claude', 'skills'),
      'dir',
    );

    const result = spawnSync(
      resolve('node_modules/.bin/tsx'),
      [
        'scripts/check-public.ts',
        '--root',
        root,
        '--path',
        '.claude/skills',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '.claude/skills: canonical skill alias target must be an existing non-symlink directory',
    );
    expect(result.stderr).not.toContain('GitHub token pattern');
    expect(result.stderr).not.toContain(token);
  });
});
