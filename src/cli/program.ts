import { Command, Option } from 'commander';

import { assertDemoOptions, type PrepareCliInput } from './prepare';

export interface CliServices {
  prepare(input: PrepareCliInput): Promise<{ runId: string; url: string }>;
  review(runId?: string): Promise<{ url: string }>;
  exportRun(runId: string): Promise<{ zipPath: string }>;
  doctor(): Promise<{ ok: boolean; checks: string[] }>;
  importHistory(file: string): Promise<{ imported: number }>;
  syncBoard(runId: string, apply: boolean): Promise<{ status: string; issueUrl?: string }>;
  archiveRun(runId: string): Promise<{ directory: string }>;
  stageRun(runId: string): Promise<{ status: string; remoteCount: number }>;
  scheduleRun(runId: string): Promise<{ status: string; remoteCount: number }>;
  cleanup(runId?: string): Promise<{ deleted: number; pending: number; errors: number }>;
  profilePack(outputDirectory?: string): Promise<{ directory: string }>;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function createCliProgram(
  services: CliServices,
  writeLine: (line: string) => void = console.log,
): Command {
  const program = new Command()
    .name('rise-social')
    .description('Prepare and review source-backed Rise.sk social content.')
    .showHelpAfterError()
    .exitOverride();

  program
    .command('doctor')
    .description('Check local tools and optional integrations without exposing secrets.')
    .action(async () => {
      const result = await services.doctor();
      result.checks.forEach(check => writeLine(check));
      writeLine(result.ok ? 'Rise Social Studio je pripravené.' : 'Niektoré povinné kontroly zlyhali.');
    });

  const history = program.command('history').description('Manage prior public Rise posts.');
  const profile = program.command('profile').description('Prepare local, manual-only social profile materials.');
  profile
    .command('pack')
    .description('Create a deterministic local profile pack; it never edits a live profile.')
    .option('--output <directory>', 'Local output directory outside the approved-content archive.')
    .action(async (options: { output?: string }) => {
      const result = await services.profilePack(options.output);
      writeLine(`Lokálny profilový balík: ${result.directory}`);
      writeLine('Živé profilové zmeny zostávajú manuálne a vyžadujú samostatné schválenie.');
    });
  history
    .command('import')
    .description('Import prior post history from JSON or CSV.')
    .argument('<file>', 'Path to a JSON or CSV history file.')
    .action(async (file: string) => {
      const result = await services.importHistory(file);
      writeLine(`Importované historické príspevky: ${result.imported}.`);
    });

  const board = program.command('board').description('Synchronize content runs to Rise YouTrack.');
  board
    .command('sync')
    .description('Preview or apply an idempotent RISE issue synchronization.')
    .argument('<run-id>', 'Exact content run id.')
    .option('--apply', 'Apply the YouTrack mutation. Default is dry-run.', false)
    .action(async (runId: string, options: { apply: boolean }) => {
      const result = await services.syncBoard(runId, options.apply);
      writeLine(`Board sync: ${result.status}.`);
      if (result.issueUrl) writeLine(result.issueUrl);
    });

  program
    .command('archive')
    .description('Store one approved, non-demo pack in the Git-owned archive.')
    .argument('<run-id>', 'Exact browser-approved content run id.')
    .action(async (runId: string) => {
      const result = await services.archiveRun(runId);
      writeLine(`Archív: ${result.directory}`);
    });

  program
    .command('prepare')
    .description('Prepare one adaptive, source-backed master post or a gated mini-campaign.')
    .argument('<brief>', 'Exact topic or editorial brief.')
    .option('--demo', 'Create the offline public-source demo without model calls.', false)
    .addOption(
      new Option('--mode <mode>', 'Choose adaptive, single-post, or mini-campaign planning.')
        .choices(['auto', 'single', 'campaign'])
        .default('auto'),
    )
    .option(
      '--audience <audience>',
      'owners, product, operations, marketing, or a custom audience description.',
      'owners',
    )
    .addOption(
      new Option('--goal <goal>', 'Choose the business goal.')
        .choices(['awareness', 'consideration', 'conversation'])
        .default('consideration'),
    )
    .addOption(
      new Option('--project <slug>', 'Add one canonical public Rise project slug.')
        .argParser(collect)
        .default([]),
    )
    .addOption(
      new Option('-s, --source <url>', 'Add an explicitly approved public source URL.')
        .argParser(collect)
        .default([]),
    )
    .option(
      '--allow-generative-visuals',
      'Record generative intent and stop for manual art-direction approval.',
      false,
    )
    .action(async (
      brief: string,
      options: {
        demo: boolean;
        mode: PrepareCliInput['mode'];
        audience: string;
        goal: PrepareCliInput['goal'];
        project: string[];
        source: string[];
        allowGenerativeVisuals: boolean;
      },
    ) => {
      const input: PrepareCliInput = {
        brief,
        demo: options.demo,
        mode: options.mode,
        audience: options.audience,
        goal: options.goal,
        projects: options.project,
        sources: options.source,
        allowGenerativeVisuals: options.allowGenerativeVisuals,
      };
      assertDemoOptions(input);
      const result = await services.prepare(input);
      writeLine(`Pripravený balík ${result.runId}`);
      writeLine(result.url);
    });

  program
    .command('review')
    .description('Open the latest or selected run in the local review app.')
    .argument('[run-id]', 'Exact content run id.')
    .action(async (runId?: string) => {
      const result = await services.review(runId);
      writeLine(result.url);
    });

  program
    .command('export')
    .description('Export one browser-approved run.')
    .argument('<run-id>', 'Exact content run id.')
    .action(async (runId: string) => {
      const result = await services.exportRun(runId);
      writeLine(`Export: ${result.zipPath}`);
    });

  program
    .command('stage')
    .description('Create and verify Buffer drafts without scheduling them.')
    .argument('<run-id>', 'Exact browser-approved content run id.')
    .action(async (runId: string) => {
      const result = await services.stageRun(runId);
      writeLine(`Stav: ${result.status}. Buffer koncepty: ${result.remoteCount}.`);
      writeLine('Pred plánovaním ich skontrolujte a balík znovu schváľte v prehliadači.');
    });

  program
    .command('schedule')
    .description('Schedule one browser-approved run through Buffer.')
    .argument('<run-id>', 'Exact content run id.')
    .action(async (runId: string) => {
      const result = await services.scheduleRun(runId);
      writeLine(`Stav: ${result.status}. Vzdialené príspevky: ${result.remoteCount}.`);
    });

  program
    .command('cleanup')
    .description('Remove due Cloudinary media after Buffer confirms publication.')
    .argument('[run-id]', 'Optional exact content run id; otherwise checks all runs.')
    .action(async (runId?: string) => {
      const result = await services.cleanup(runId);
      writeLine(
        `Cloudinary: odstránené ${result.deleted}, čakajúce ${result.pending}, chyby ${result.errors}.`,
      );
    });

  return program;
}
