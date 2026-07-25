#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tsxBinary = join(projectRoot, 'node_modules', '.bin', 'tsx');
const result = spawnSync(tsxBinary, [join(projectRoot, 'src', 'cli.ts'), ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

process.exitCode = result.status ?? 1;
