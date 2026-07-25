import { resolve, sep } from 'node:path';

import type { AssetRecord, Platform } from '@/domain/schemas';
export { RISE_ASSET_CATALOG } from '@/visuals/assetCatalogData';

export function resolveCatalogAssetPath(asset: Pick<AssetRecord, 'path'>, publicRoot: string): string {
  if (!asset.path?.startsWith('/')) throw new Error('Asset path must be catalogue-relative and start with /.');
  const root = resolve(publicRoot);
  const candidate = resolve(root, `.${asset.path}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new Error('Asset path resolves outside the configured public root.');
  }
  return candidate;
}

export type AssetSelectionRequest = {
  project: string;
  platform: Platform;
  includeApprovalRequired?: boolean;
};

const VISUAL_PRIORITY: Record<AssetRecord['visualClass'], number> = {
  'product-screenshot': 0,
  'screen-recording': 0,
  'branded-diagram': 1,
  'team-photo': 2,
  'data-visual': 1,
  'new-documentation': 3,
  'generated-illustration': 5,
};

function assetPriority(asset: AssetRecord): number {
  if (asset.origin === 'public-licensed') return 4;
  if (asset.origin === 'generated') return 5;
  return VISUAL_PRIORITY[asset.visualClass];
}

/** Candidate discovery may show pending records but never authorizes rendering. */
export function findAssetCandidates(
  assets: readonly AssetRecord[],
  request: AssetSelectionRequest,
): AssetRecord[] {
  return assets.filter(asset => asset.project === request.project && asset.allowedPlatforms.includes(request.platform));
}

export function isAssetRenderable(asset: AssetRecord, request: Omit<AssetSelectionRequest, 'includeApprovalRequired'>): boolean {
  if (asset.project !== request.project || !asset.allowedPlatforms.includes(request.platform)) return false;
  if (asset.confidentiality !== 'public' || asset.redactionStatus === 'pending') return false;
  if (!asset.approved || asset.requiresVisualApproval) return false;
  if (asset.origin === 'public-licensed' && (!asset.rightsNote?.trim() || !asset.rightsEvidence?.trim())) return false;
  if (['client-approved', 'public-licensed'].includes(asset.origin) && asset.rightsStatus !== 'confirmed') return false;
  return true;
}

/** Selects a final renderable asset only; `includeApprovalRequired` is discovery-only. */
export function selectOwnedAsset(
  assets: readonly AssetRecord[],
  request: AssetSelectionRequest,
): AssetRecord | undefined {
  return assets
    .filter(asset => isAssetRenderable(asset, request))
    .sort((left, right) => assetPriority(left) - assetPriority(right))[0];
}
