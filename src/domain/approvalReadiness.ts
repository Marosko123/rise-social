import {
  reviewReportPasses,
  type ContentRun,
  type Platform,
} from '@/domain/schemas';
import { isAssetRenderable } from '@/visuals/assetCatalog';
import { assertFreshClaimLedger } from '@/workflow/sourceFreshness';

const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'facebook'];

export function assertRunReadyForApproval(
  run: ContentRun,
  now = new Date(),
): void {
  const workflow = run.draft.workflowContext;
  if (!workflow) {
    throw new Error('Workflow evidence is required before approval.');
  }
  if (workflow.editorialBrief?.approvalState !== 'approved') {
    throw new Error('The editorial brief and risk gate require approval.');
  }
  if (!workflow.firstCritique) {
    throw new Error('The independent first critique is required before approval.');
  }
  assertFreshClaimLedger(
    workflow.claimLedger,
    run.draft.sources.map(source => ({ id: source.id, url: source.url })),
    now,
  );
  if (!workflow.finalValidation || !reviewReportPasses(workflow.finalValidation)) {
    throw new Error('Final independent review must pass before approval.');
  }
  if (workflow.assetRights.some(right => right.status !== 'confirmed')) {
    throw new Error('All selected visual rights must be confirmed before approval.');
  }

  const selectedAssetIds = new Set(
    workflow.visualDirections.flatMap(direction => direction.assetIds),
  );
  for (const assetId of selectedAssetIds) {
    const asset = run.draft.assetRecords.find(record => record.id === assetId);
    if (!asset || PLATFORMS.some(platform =>
      !isAssetRenderable(asset, { project: asset.project, platform })
    )) {
      throw new Error(`Selected visual asset "${assetId}" is not renderable on every platform.`);
    }
  }

  if (workflow.visualDirections.length > 0) {
    for (const direction of workflow.visualDirections) {
      const finding = workflow.visualQaFindings?.find(
        item => item.visualDirectionId === direction.id,
      );
      if (
        !finding ||
        finding.status !== 'pass' ||
        !finding.altTextPassed ||
        !finding.cropPassed
      ) {
        throw new Error(`Visual QA must pass for "${direction.id ?? 'selected direction'}".`);
      }
    }
  }
}
