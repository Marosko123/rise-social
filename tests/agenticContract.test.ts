import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

const root = process.cwd();
const skillNames = [
  'rise-brand-context',
  'rise-social-research',
  'rise-social-continuity',
  'rise-slovak-human-copy',
  'rise-linkedin-post',
  'rise-instagram-post',
  'rise-facebook-post',
  'rise-carousel',
  'rise-editorial-review',
  'rise-youtrack-sync',
  'rise-publish-approved',
  'rise-topic-intake',
  'rise-campaign-architect',
  'rise-asset-librarian',
  'rise-visual-director',
  'rise-generative-visual',
  'rise-visual-qa',
  'rise-content-measurement',
];

describe('portable agentic contract', () => {
  test('shares one concise contract across Codex, Claude, and ChatGPT', () => {
    const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    const chatgpt = readFileSync(join(root, 'CHATGPT_PROJECT_INSTRUCTIONS.md'), 'utf8');

    expect(agents).toContain('topic → business brief → risk gate → research → claim ledger');
    expect(agents.toLocaleLowerCase('en')).toContain('never auto-merge');
    expect(agents.split('\n').length).toBeLessThan(90);
    expect(claude).toContain('@AGENTS.md');
    expect(chatgpt).toContain('read-only');
  });

  test('keeps canonical skills in .agents and exposes a relative Claude symlink', () => {
    const claudeSkills = join(root, '.claude', 'skills');
    expect(lstatSync(claudeSkills).isSymbolicLink()).toBe(true);
    expect(readlinkSync(claudeSkills)).toBe('../.agents/skills');

    for (const skillName of skillNames) {
      const content = readFileSync(
        join(root, '.agents', 'skills', skillName, 'SKILL.md'),
        'utf8',
      );
      expect(content).toMatch(new RegExp(`^---\\nname: ${skillName}\\n`, 'u'));
      expect(content).toMatch(/\ndescription: Use when /u);
      expect(content).toContain('## Stop conditions');
    }
  });

  test('pins the upstream workflow and defines both human-gated workflows', () => {
    const upstream = JSON.parse(
      readFileSync(join(root, '.agentic', 'upstream.json'), 'utf8'),
    ) as { commit: string };
    const workflows = JSON.parse(
      readFileSync(join(root, '.agentic', 'workflows.json'), 'utf8'),
    ) as { development: string[]; content: string[] };

    expect(upstream.commit).toBe('fd52a26b726ace5db1195c4b50ce4689eca22add');
    expect(workflows.development).toEqual([
      'intake',
      'plan',
      'human-approval',
      'build',
      'tests',
      'independent-review',
      'draft-pr',
    ]);
    expect(workflows.content).toEqual([
      'topic-intake',
      'business-brief',
      'risk-gate',
      'research',
      'claim-ledger',
      'continuity',
      'visual-directions',
      'asset-rights',
      'draft',
      'platform-specialization',
      'render',
      'independent-critique',
      'revision',
      'independent-validation',
      'human-approval',
      'export-schedule-approval',
      'measurement',
    ]);
  });

  test('gives ChatGPT and every visual skill one canonical generation playbook', () => {
    const playbookPath = 'brand/visual-generation-playbook.v1.ts';
    const chatgpt = readFileSync(
      join(root, 'CHATGPT_PROJECT_INSTRUCTIONS.md'),
      'utf8',
    );
    expect(chatgpt).toContain(playbookPath);
    expect(chatgpt).toContain(
      'https://marosko123.github.io/rise-social/visual-playbook.json',
    );
    expect(chatgpt).toContain(
      'https://marosko123.github.io/rise-social/visual-assets.json',
    );
    expect(chatgpt).toContain('“vytvor obrázok”');

    for (const skillName of [
      'rise-brand-context',
      'rise-asset-librarian',
      'rise-visual-director',
      'rise-generative-visual',
      'rise-visual-qa',
    ]) {
      expect(
        readFileSync(
          join(root, '.agents', 'skills', skillName, 'SKILL.md'),
          'utf8',
        ),
      ).toContain(playbookPath);
    }
  });

  test('gives ChatGPT and carousel skills one canonical application carousel contract', () => {
    const carouselPlaybook = 'brand/instagram-carousel-playbook.v1.ts';
    const chatgpt = readFileSync(
      join(root, 'CHATGPT_PROJECT_INSTRUCTIONS.md'),
      'utf8',
    );
    for (const marker of [
      carouselPlaybook,
      'https://marosko123.github.io/rise-social/instagram-carousel-playbook.json',
      'https://marosko123.github.io/rise-social/brand-assets.json',
      'https://marosko123.github.io/rise-social/brand-copy.json',
    ]) {
      expect(chatgpt).toContain(marker);
    }

    for (const skillName of [
      'rise-brand-context',
      'rise-carousel',
      'rise-asset-librarian',
      'rise-visual-director',
      'rise-slovak-human-copy',
      'rise-visual-qa',
    ]) {
      const skill = readFileSync(
        join(root, '.agents', 'skills', skillName, 'SKILL.md'),
        'utf8',
      );
      expect(skill, skillName).toContain(carouselPlaybook);
      expect(skill, skillName).toContain('app-case-study');
    }
  });
});
