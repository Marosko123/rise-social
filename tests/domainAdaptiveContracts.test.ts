import { describe, expect, test } from 'vitest';

import { resolveCampaignDecision } from '@/domain/adaptivePlanning';
import * as domain from '@/domain/schemas';
import { createFixtureDraft } from './fixtures';

describe('adaptive planning domain contract', () => {
  test('exposes the planning, visual, and review contracts for a single-post default', () => {
    expect(domain).toHaveProperty('TopicRequestSchema');
    expect(domain).toHaveProperty('EditorialBriefSchema');
    expect(domain).toHaveProperty('CampaignDecisionSchema');
    expect(domain).toHaveProperty('AssetRecordSchema');
    expect(domain).toHaveProperty('VisualDirectionSchema');
    expect(domain).toHaveProperty('GenerationRecipeSchema');
    expect(domain).toHaveProperty('ReviewReportSchema');
    expect(domain.ThemeSchema.safeParse('decision-education').success).toBe(true);
  });

  test('keeps auto mode to one post until every expansion threshold passes', () => {
    const request = domain.TopicRequestSchema.parse({
      topic: 'Ako vyberať prvý automatizovaný krok.',
      audience: 'Produktové tímy.',
      goal: 'Pomôcť urobiť ďalšie rozhodnutie.',
      mode: 'auto',
      requestedPostCount: 3,
    });

    expect(
      resolveCampaignDecision(request, {
        evidenceInsightCount: 3,
        visualClassCount: 1,
        buyerQuestionCount: 2,
      }).postCount,
    ).toBe(1);
    expect(
      resolveCampaignDecision(request, {
        evidenceInsightCount: 3,
        visualClassCount: 2,
        buyerQuestionCount: 2,
      }).postCount,
    ).toBe(3);
  });

  test('does not accept a review with a failing score as passed', () => {
    const report = domain.ReviewReportSchema.parse({
      approved: true,
      blocker: false,
      issues: [],
      revisionInstructions: '',
      scorecard: {
        factualAccuracy: 4,
        voice: 4,
        specificity: 3,
        continuity: 4,
        visualClarity: 4,
        businessFit: 4,
        passed: true,
        notes: ['Špecifickosť potrebuje úpravu.'],
      },
    });

    expect(domain.reviewReportPasses(report)).toBe(false);
  });

  test('binds a claim URL and checked date to its declared source', () => {
    const draft = createFixtureDraft();
    draft.claims[0].sourceUrl = 'https://invented.example/not-approved';

    expect(() => domain.DraftPackSchema.parse(draft)).toThrow(/claim source url/i);

    const stale = createFixtureDraft();
    stale.claims[0].checkedAt = '2026-07-25T08:00:00.000Z';
    expect(() => domain.DraftPackSchema.parse(stale)).toThrow(/claim checked date/i);
  });

  test('preserves complete visual provenance and generation approval fields', () => {
    const asset = {
      id: 'asset-grantai-ui',
      visualClass: 'product-screenshot',
      origin: 'rise-owned',
      owner: 'Rise',
      license: 'owned',
      project: 'GrantAI',
      confidentiality: 'public',
      allowedPlatforms: ['instagram', 'linkedin'],
      requiresRedaction: false,
      approved: true,
    };
    expect(domain.AssetRecordSchema.parse(asset)).toMatchObject(asset);

    const direction = {
      visualClass: 'product-screenshot',
      rationale: 'Ukazuje reálny verejný tok produktu.',
      narrative: 'Od problému po ďalší krok.',
      layout: 'split-screen',
      assetIds: ['asset-grantai-ui'],
      crop: 'center',
      safeZones: ['top', 'bottom'],
      allowGenerativeVisuals: false,
    };
    expect(domain.VisualDirectionSchema.parse(direction)).toMatchObject(direction);

    const recipe = {
      visualDirectionId: 'direction-1',
      model: 'image-model',
      prompt: 'Abstraktný diagram pracovného toku.',
      negativePrompt: 'text, logo',
      referenceAssetIds: ['asset-grantai-ui'],
      parameters: { aspectRatio: '4:5' },
      disclosure: 'AI-generated supporting illustration.',
      generatedAt: '2026-07-25T08:00:00.000Z',
      generationApproved: true,
      generationApprovedAt: '2026-07-25T08:01:00.000Z',
      width: 1080,
      height: 1350,
      allowGenerativeVisuals: true,
    };
    expect(domain.GenerationRecipeSchema.parse(recipe)).toMatchObject(recipe);
  });
});
