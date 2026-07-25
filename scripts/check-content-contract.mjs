import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    './node_modules/vitest/vitest.mjs',
    'run',
    'tests/workflow-v2.test.ts',
    'tests/agenticContract.test.ts',
    'tests/repositoryConfig.test.ts',
  ],
  { cwd: process.cwd(), stdio: 'inherit', env: process.env },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Content schema and rules contract valid.');
