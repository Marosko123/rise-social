import { describe, expect, test, vi } from 'vitest';

import { createCliProgram, type CliServices } from '@/cli/program';

function services(): CliServices {
  return {
    prepare: vi.fn().mockResolvedValue({ runId: 'run-new', url: 'http://127.0.0.1:4173/review?run=run-new' }),
    review: vi.fn().mockResolvedValue({ url: 'http://127.0.0.1:4173/review?run=run-new' }),
    exportRun: vi.fn().mockResolvedValue({ zipPath: '/tmp/rise.zip' }),
    doctor: vi.fn().mockResolvedValue({ ok: true, checks: ['Node.js: OK'] }),
    importHistory: vi.fn().mockResolvedValue({ imported: 3 }),
    syncBoard: vi.fn().mockResolvedValue({ status: 'pending', issueUrl: undefined }),
    archiveRun: vi.fn().mockResolvedValue({ directory: '/tmp/archive' }),
    stageRun: vi.fn().mockResolvedValue({ status: 'drafted', remoteCount: 9 }),
    scheduleRun: vi.fn().mockResolvedValue({ status: 'scheduled', remoteCount: 9 }),
    cleanup: vi.fn().mockResolvedValue({ deleted: 15, pending: 0, errors: 0 }),
    profilePack: vi.fn().mockResolvedValue({ directory: '/tmp/rise-profile-pack' }),
  };
}

describe('rise-social CLI', () => {
  test('prepares an explicit demo brief without starting a publishing action', async () => {
    const injected = services();
    const output: string[] = [];
    const program = createCliProgram(injected, line => output.push(line));

    await program.parseAsync(['node', 'rise-social', 'prepare', 'GrantAI v praxi', '--demo']);

    expect(injected.prepare).toHaveBeenCalledWith({
      brief: 'GrantAI v praxi',
      demo: true,
      mode: 'auto',
      audience: 'owners',
      goal: 'consideration',
      projects: [],
      sources: [],
      allowGenerativeVisuals: false,
    });
    expect(injected.scheduleRun).not.toHaveBeenCalled();
    expect(injected.exportRun).not.toHaveBeenCalled();
    expect(injected.profilePack).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('http://127.0.0.1:4173/review?run=run-new');
  });

  test('passes every production planning option without invoking a mutation command', async () => {
    const injected = services();
    const program = createCliProgram(injected);

    await program.parseAsync([
      'node',
      'rise-social',
      'prepare',
      'Modernizovať alebo prepisovať',
      '--mode',
      'campaign',
      '--audience',
      'operations',
      '--goal',
      'conversation',
      '--project',
      'slates',
      '--project',
      'rise-sk',
      '--source',
      'https://rise.sk/blog/modernizacia',
      '--source',
      'https://rise.sk/portfolio/slates',
      '--allow-generative-visuals',
    ]);

    expect(injected.prepare).toHaveBeenCalledWith({
      brief: 'Modernizovať alebo prepisovať',
      demo: false,
      mode: 'campaign',
      audience: 'operations',
      goal: 'conversation',
      projects: ['slates', 'rise-sk'],
      sources: [
        'https://rise.sk/blog/modernizacia',
        'https://rise.sk/portfolio/slates',
      ],
      allowGenerativeVisuals: true,
    });
    expect(injected.exportRun).not.toHaveBeenCalled();
    expect(injected.stageRun).not.toHaveBeenCalled();
    expect(injected.scheduleRun).not.toHaveBeenCalled();
    expect(injected.profilePack).not.toHaveBeenCalled();
  });

  test.each([
    ['--mode', 'bulk'],
    ['--goal', 'sales'],
  ])('rejects unsupported %s values before prepare', async (flag, value) => {
    const injected = services();
    const program = createCliProgram(injected);

    await expect(
      program.parseAsync([
        'node',
        'rise-social',
        'prepare',
        'Bezpečná téma',
        flag,
        value,
      ]),
    ).rejects.toThrow();

    expect(injected.prepare).not.toHaveBeenCalled();
  });

  test.each([
    ['--allow-generative-visuals'],
    ['--project', 'rise-sk'],
    ['--source', 'https://rise.sk'],
    ['--mode', 'single'],
    ['--audience', 'product'],
    ['--goal', 'awareness'],
  ])('rejects demo combined with production option %s', async (...productionOption) => {
    const injected = services();
    const program = createCliProgram(injected);

    await expect(
      program.parseAsync([
        'node',
        'rise-social',
        'prepare',
        'Ukážka',
        '--demo',
        ...productionOption,
      ]),
    ).rejects.toThrow(/demo/i);

    expect(injected.prepare).not.toHaveBeenCalled();
  });

  test('requires an exact run id for export and scheduling', async () => {
    const injected = services();
    const output: string[] = [];
    const program = createCliProgram(injected, line => output.push(line));

    await program.parseAsync(['node', 'rise-social', 'export', 'run-exact']);
    await program.parseAsync(['node', 'rise-social', 'stage', 'run-exact']);
    await program.parseAsync(['node', 'rise-social', 'schedule', 'run-exact']);

    expect(injected.exportRun).toHaveBeenCalledWith('run-exact');
    expect(injected.stageRun).toHaveBeenCalledWith('run-exact');
    expect(injected.scheduleRun).toHaveBeenCalledWith('run-exact');
    expect(output.join('\n')).toContain('/tmp/rise.zip');
    expect(output.join('\n')).toContain('9');
  });

  test('runs guarded hosted-media cleanup for an exact run', async () => {
    const injected = services();
    const output: string[] = [];
    const program = createCliProgram(injected, line => output.push(line));

    await program.parseAsync(['node', 'rise-social', 'cleanup', 'run-exact']);

    expect(injected.cleanup).toHaveBeenCalledWith('run-exact');
    expect(output.join('\n')).toContain('odstránené 15');
  });

  test('supports doctor, history import, dry-run board sync, and approved archive', async () => {
    const injected = services();
    const output: string[] = [];
    const program = createCliProgram(injected, line => output.push(line));

    await program.parseAsync(['node', 'rise-social', 'doctor']);
    await program.parseAsync(['node', 'rise-social', 'history', 'import', 'history.json']);
    await program.parseAsync(['node', 'rise-social', 'board', 'sync', 'run-exact']);
    await program.parseAsync(['node', 'rise-social', 'archive', 'run-exact']);

    expect(injected.doctor).toHaveBeenCalledOnce();
    expect(injected.importHistory).toHaveBeenCalledWith('history.json');
    expect(injected.syncBoard).toHaveBeenCalledWith('run-exact', false);
    expect(injected.archiveRun).toHaveBeenCalledWith('run-exact');
    expect(output.join('\n')).toContain('/tmp/archive');
  });

  test('requires apply before a manual board mutation', async () => {
    const injected = services();
    const program = createCliProgram(injected);

    await program.parseAsync([
      'node',
      'rise-social',
      'board',
      'sync',
      'run-exact',
      '--apply',
    ]);

    expect(injected.syncBoard).toHaveBeenCalledWith('run-exact', true);
  });

  test('creates only a local profile pack and passes an explicit output directory', async () => {
    const injected = services();
    const output: string[] = [];
    const program = createCliProgram(injected, line => output.push(line));

    await program.parseAsync(['node', 'rise-social', 'profile', 'pack', '--output', '/tmp/rise-profiles']);

    expect(injected.profilePack).toHaveBeenCalledWith('/tmp/rise-profiles');
    expect(injected.stageRun).not.toHaveBeenCalled();
    expect(injected.scheduleRun).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('/tmp/rise-profile-pack');
  });
});
