import type { ContentPlan } from './schemas';
import { isTrendEvidenceFresh } from './schemas';

export interface ContentPlanIssue {
  code:
    | 'date-order'
    | 'expired-trend'
    | 'visual-not-allowed'
    | 'approval-mismatch'
    | 'duplicate-opening'
    | 'asset-class-mismatch';
  entryId: string;
  message: string;
}

function openingWords(value: string): string {
  return value
    .toLocaleLowerCase('sk')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

export function validateContentPlan(plan: ContentPlan): ContentPlanIssue[] {
  const issues: ContentPlanIssue[] = [];
  const projects = new Map(plan.projects.map(project => [project.id, project]));
  const trends = new Map(plan.trends.map(trend => [trend.id, trend]));
  const openings = new Map<string, string>();
  let previousDate = '';

  for (const entry of plan.entries) {
    if (previousDate && entry.publishOn <= previousDate) {
      issues.push({
        code: 'date-order',
        entryId: entry.id,
        message: 'Publishing dates must be strictly increasing.',
      });
    }
    previousDate = entry.publishOn;

    const opening = openingWords(entry.title);
    const priorEntryId = openings.get(opening);
    if (priorEntryId) {
      issues.push({
        code: 'duplicate-opening',
        entryId: entry.id,
        message: `Title opening duplicates ${priorEntryId}.`,
      });
    }
    openings.set(opening, entry.id);

    for (const trendId of entry.trendIds) {
      const trend = trends.get(trendId);
      const scheduledAt = new Date(`${entry.publishOn}T12:00:00.000Z`);
      if (trend && !isTrendEvidenceFresh(trend, scheduledAt)) {
        issues.push({
          code: 'expired-trend',
          entryId: entry.id,
          message: `Trend evidence "${trendId}" expires before publication.`,
        });
      }
    }

    for (const projectId of entry.projectIds) {
      const project = projects.get(projectId);
      if (!project) continue;
      if (!project.allowedVisuals.includes(entry.visual.kind)) {
        issues.push({
          code: 'visual-not-allowed',
          entryId: entry.id,
          message: `${project.name} does not allow visual kind ${entry.visual.kind}.`,
        });
      }
      if (entry.selectedAssetClass !== entry.visual.kind) {
        issues.push({
          code: 'asset-class-mismatch',
          entryId: entry.id,
          message: 'Selected asset class must match the detailed visual brief.',
        });
      }
      if (
        (project.requiresBriefApproval || project.requiresVisualApproval) &&
        entry.riskLevel !== 'high'
      ) {
        issues.push({
          code: 'approval-mismatch',
          entryId: entry.id,
          message: `${project.name} requires a high-risk approval gate.`,
        });
      }
    }
  }

  return issues;
}
