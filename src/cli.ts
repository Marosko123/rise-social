#!/usr/bin/env node

import { config } from 'dotenv';

import { createCliProgram } from '@/cli/program';
import { defaultCliServices } from '@/cli/services';

config({ path: ['.env.local', '.env'], quiet: true });

await createCliProgram(defaultCliServices).parseAsync(process.argv);
