import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AgentRunner } from './socialPackOrchestrator';
import type { ModelName } from '@/domain/schemas';

export function sanitizeAgentEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const allowed = new Set([
    'PATH',
    'HOME',
    'TMPDIR',
    'TMP',
    'TEMP',
    'USER',
    'LOGNAME',
    'SHELL',
    'LANG',
    'LANGUAGE',
    'LC_ALL',
    'LC_CTYPE',
    'TERM',
    'COLORTERM',
    'NO_COLOR',
    'FORCE_COLOR',
    'TZ',
    'CI',
  ]);
  return Object.fromEntries(
    Object.entries(environment).filter(([key]) => allowed.has(key)),
  );
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runProcess(
  command: string,
  args: string[],
  options: { cwd: string; input?: string; timeoutMs: number },
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: sanitizeAgentEnvironment(process.env) as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} exceeded ${options.timeoutMs} ms.`));
    }, options.timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

function unwrapClaudeOutput(output: string): string {
  try {
    const parsed = JSON.parse(output) as { result?: unknown; structured_output?: unknown };
    if (parsed.structured_output) return JSON.stringify(parsed.structured_output);
    if (typeof parsed.result === 'string') return parsed.result;
  } catch {
    return output;
  }
  return output;
}

export function codexAgentArgs(outputPath: string): string[] {
  return [
    'exec',
    '--ignore-user-config',
    '--ignore-rules',
    '--disable',
    'shell_tool',
    '--search',
    '--sandbox',
    'read-only',
    '--ephemeral',
    '--skip-git-repo-check',
    '--output-last-message',
    outputPath,
    '-',
  ];
}

export class CliAgentRunner implements AgentRunner {
  constructor(
    private readonly options: {
      codexBin?: string;
      claudeBin?: string;
      timeoutMs?: number;
    } = {},
  ) {}

  async run(model: ModelName, prompt: string): Promise<string> {
    const workspace = await mkdtemp(join(tmpdir(), 'rise-social-agent-'));
    const timeoutMs = this.options.timeoutMs ?? 300_000;
    try {
      if (model === 'codex') {
        const outputPath = join(workspace, 'response.json');
        const result = await runProcess(
          this.options.codexBin ?? process.env.RISE_SOCIAL_CODEX_BIN ?? 'codex',
          codexAgentArgs(outputPath),
          { cwd: workspace, input: prompt, timeoutMs },
        );
        if (result.exitCode !== 0) {
          throw new Error(`Codex failed: ${result.stderr.slice(-2_000)}`);
        }
        return readFile(outputPath, 'utf8');
      }

      const result = await runProcess(
        this.options.claudeBin ?? process.env.RISE_SOCIAL_CLAUDE_BIN ?? 'claude',
        [
          '--print',
          '--output-format',
          'json',
          '--permission-mode',
          'plan',
          '--tools',
          'WebSearch,WebFetch',
          '--no-session-persistence',
          prompt,
        ],
        { cwd: workspace, timeoutMs },
      );
      if (result.exitCode !== 0) {
        throw new Error(`Claude failed: ${result.stderr.slice(-2_000)}`);
      }
      return unwrapClaudeOutput(result.stdout);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
