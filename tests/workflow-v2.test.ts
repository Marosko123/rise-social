import { describe, expect, test } from 'vitest';

import { codexAgentArgs, sanitizeAgentEnvironment } from '@/agents/cliAgentRunner';
import {
  BrandProfileSchema,
  ContentBriefSchema,
  DraftPackSchema,
  RISE_BRAND_PROFILE,
} from '@/domain/schemas';
import { assertBriefMayDraft, classifyContentBrief } from '@/domain/risk';
import { validateDraftPack } from '@/domain/validation';

import { createFixtureDraft } from './fixtures';

describe('schema v2 workflow', () => {
  test('migrates a stored v1 draft to claim-addressable schema v2', () => {
    const current = createFixtureDraft();
    const legacy = {
      ...current,
      schemaVersion: 1,
      brandProfile: undefined,
      contentBrief: undefined,
      priorPosts: undefined,
      claims: undefined,
      scorecard: undefined,
      posts: current.posts.map(post => ({
        ...post,
        claimIds: undefined,
        slides: post.slides.map(slide => ({ ...slide, claimIds: undefined })),
        platforms: Object.fromEntries(
          Object.entries(post.platforms).map(([platform, value]) => [
            platform,
            { ...value, claimIds: undefined },
          ]),
        ),
      })),
    };

    const migrated = DraftPackSchema.parse(legacy);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.claims).toHaveLength(3);
    expect(migrated.posts.every(post => post.claimIds.length > 0)).toBe(true);
    expect(migrated.posts.every(post => post.slides.every(slide => slide.claimIds.length > 0))).toBe(
      true,
    );
  });

  test('stops high-risk content until the brief is explicitly approved', () => {
    const brief = ContentBriefSchema.parse({
      problem: 'Klientsky výsledok',
      audience: 'Firmy',
      objective: 'Vysvetliť výsledok',
      riskLevel: 'high',
      riskFlags: ['client-result'],
      requiresBriefApproval: true,
    });

    expect(() => assertBriefMayDraft(brief)).toThrow(/brief review/i);
    expect(() =>
      assertBriefMayDraft({
        ...brief,
        approvedAt: '2026-07-24T08:00:00.000Z',
      }),
    ).not.toThrow();
  });

  test('classifies metrics, named people, and client outcomes as high risk', () => {
    const brief = classifyContentBrief(
      'Zverejnime výsledok klienta ACME, úsporu 40 % a citáciu riaditeľa Jána.',
    );

    expect(brief.riskLevel).toBe('high');
    expect(brief.riskFlags).toEqual(
      expect.arrayContaining(['client-result', 'metric', 'named-person']),
    );
    expect(brief.requiresBriefApproval).toBe(true);
  });

  test('fails closed for confidential case-study results and multiplier metrics', () => {
    const brief = classifyContentBrief(
      'Dôverná prípadová štúdia Acme o navýšení obratu 10x.',
    );

    expect(brief.riskFlags).toEqual(
      expect.arrayContaining(['client-result', 'metric', 'non-public-story']),
    );
    expect(brief.requiresBriefApproval).toBe(true);
  });

  test('starts Codex without local config, rules, or shell filesystem tools', () => {
    expect(codexAgentArgs('/tmp/response.json')).toEqual(
      expect.arrayContaining([
        '--ignore-user-config',
        '--ignore-rules',
        '--disable',
        'shell_tool',
        '--search',
      ]),
    );
  });

  test('uses the approved Slovak Rise voice contract and blocks AI-like copy', () => {
    expect(BrandProfileSchema.parse(RISE_BRAND_PROFILE).preferredWords).toContain('softvér');
    const draft = createFixtureDraft();
    draft.posts[0].platforms.linkedin.caption =
      'V dnešnej dynamickej dobe s nadšením oznamujeme revolučný game-changer.';
    draft.posts[0].platforms.facebook.caption = 'Konkrétna vec. #jeden #dva #tri';

    const issues = validateDraftPack(draft);

    expect(issues.filter(issue => issue.code === 'banned-phrase').length).toBeGreaterThanOrEqual(3);
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'too-many-hashtags',
        path: 'posts.0.platforms.facebook.caption',
      }),
    );
  });

  test('never passes publisher, GitHub, or provider API credentials to model processes', () => {
    const sanitized = sanitizeAgentEnvironment({
      PATH: '/usr/bin',
      BUFFER_API_KEY: 'buffer-secret',
      CLOUDINARY_API_SECRET: 'cloud-secret',
      GITHUB_TOKEN: 'github-secret',
      GH_TOKEN: 'gh-secret',
      YOUTRACK_TOKEN: 'youtrack-secret',
      YOUTRACK_AI_PLANNER_TOKEN: 'planner-secret',
      OPENAI_API_KEY: 'openai-secret',
      ANTHROPIC_API_KEY: 'anthropic-secret',
    });

    expect(sanitized).toEqual({ PATH: '/usr/bin' });
  });
});
