import { defineConfig, globalIgnores } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default defineConfig([
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  globalIgnores([
    '.worktrees/**',
    '.next/**',
    'public-site/.next/**',
    'public-site/out/**',
    'coverage/**',
    'data/**',
    'dist/**',
    'next-env.d.ts',
    'public-site/next-env.d.ts',
  ]),
]);
