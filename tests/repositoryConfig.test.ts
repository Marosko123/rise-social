import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { assertWithinLfsBudget } from '@/repository/lfsBudget';

const root = process.cwd();

describe('repository safety configuration', () => {
  test('pins the audited Next release and exposes the complete Pages gate', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies: { next: string };
      devDependencies: { 'eslint-config-next': string };
      scripts: Record<string, string>;
    };
    const ci = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');

    expect(packageJson.dependencies.next).toBe('15.5.21');
    expect(packageJson.devDependencies['eslint-config-next']).toBe('15.5.21');
    for (const script of [
      'verify',
      'verify:push',
      'verify:pages',
      'audit:ci',
      'check:public',
      'build:pages',
      'test:pages',
    ]) {
      expect(packageJson.scripts[script]).toBeTruthy();
    }
    expect(ci).toContain('npm ci');
    expect(ci).toContain('npm run verify:pages');
    expect(ci).not.toMatch(/BUFFER_|CLOUDINARY_|codex exec|claude --print/u);
  });

  test('live smoke follows the ChatGPT-first root and approval-gated contracts', () => {
    const ci = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');

    expect(ci).toContain(
      'grep -F "Rise.sk je softvérová a produktová firma." "$smoke_dir/root.html"',
    );
    expect(ci).not.toContain(
      'grep -F "90-dňový content plán" "$smoke_dir/root.html"',
    );
    expect(ci).toContain(
      'fetch "chatgpt-context.json" chatgpt-context.json',
    );
    expect(ci).toContain('fetch "starter-pack.json" starter-pack.json');
    expect(ci).toContain(
      `grep -F '"status":"awaiting-human-approval"' "$smoke_dir/starter-pack.json"`,
    );
  });

  test('uses a blocking audit without a stale advisory exception', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    const operatingModel = readFileSync(
      join(root, 'docs', 'GITHUB_OPERATING_MODEL.md'),
      'utf8',
    );

    expect(packageJson.scripts['audit:ci']).toBe('npm audit --audit-level=high');
    expect(packageJson.scripts['audit:known-next']).toBeUndefined();
    expect(readme).not.toContain('15.5.20');
    expect(operatingModel).not.toContain('Dočasná Next výnimka');
  });

  test('routes task intake to YouTrack instead of creating a second GitHub task source', () => {
    const config = readFileSync(join(root, '.github', 'ISSUE_TEMPLATE', 'config.yml'), 'utf8');
    expect(config).toContain('blank_issues_enabled: false');
    expect(config).toContain('https://rise.youtrack.cloud/issues/RISE');
    expect(config).not.toContain('github.com/users/Marosko123/projects');
  });

  test('blocks local LFS usage beyond ten GiB without enabling payment', () => {
    expect(() => assertWithinLfsBudget(10 * 1024 ** 3)).not.toThrow();
    expect(() => assertWithinLfsBudget(10 * 1024 ** 3 + 1)).toThrow(/10 GiB/i);
  });

  test('keeps linked development worktrees outside the root test discovery surface', () => {
    const vitestConfig = readFileSync(join(root, 'vitest.config.ts'), 'utf8');
    const eslintConfig = readFileSync(join(root, 'eslint.config.mjs'), 'utf8');
    const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8')) as {
      exclude: string[];
    };

    expect(vitestConfig).toContain('configDefaults.exclude');
    expect(vitestConfig).toContain("'.worktrees/**'");
    expect(eslintConfig).toContain("'.worktrees/**'");
    expect(tsconfig.exclude).toContain('.worktrees');
  });
});
