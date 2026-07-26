import { RISE_PUBLIC_ASSET_CATALOG_V1 } from '../../brand/assets.v1';
import {
  AssetRecordSchema,
  type AssetRecord,
  type Platform,
} from '@/domain/schemas';

const ALL_PLATFORMS: Platform[] = ['instagram', 'linkedin', 'facebook'];

export type CatalogAsset = AssetRecord & {
  sourceUrl: string;
  path: string;
  rightsNote: string;
  rightsEvidence: string;
  qualityNote: string;
  aiEdited: boolean;
  requiresVisualApproval: boolean;
};

function isRiseOwnedProject(project: string): boolean {
  return ['Rise.sk', 'MapaTrhu', 'GrantAI', 'MojaFirma'].includes(project);
}

function catalogAsset(
  [
    id,
    project,
    sourceUrl,
    path,
    visualClass,
    contentSha256,
    qualityNote,
  ]: (typeof RISE_PUBLIC_ASSET_CATALOG_V1.assets)[number],
): CatalogAsset {
  const riseOwned = isRiseOwnedProject(project);
  const protectedProject = [
    'Personálno-mzdový systém',
    'VIAC AKO NI(c)K',
    'Bežecká mobilná aplikácia',
  ].includes(project);
  const aiEdited = path.includes('/ai-edited/');

  return AssetRecordSchema.parse({
    id,
    visualClass,
    origin: riseOwned ? 'rise-owned' : 'client-approved',
    owner: riseOwned ? 'Rise.sk' : `${project} / držiteľ práv nepotvrdený`,
    license: riseOwned ? 'owned' : 'client-approved',
    project,
    confidentiality: protectedProject ? 'approval-required' : 'public',
    allowedPlatforms: riseOwned ? ALL_PLATFORMS : [],
    redactionStatus: protectedProject ? 'pending' : 'not-required',
    sourceUrl,
    path,
    contentSha256,
    approved: riseOwned && !aiEdited,
    rightsNote: riseOwned
      ? 'Rise-created web asset; rights are held by Rise.sk.'
      : 'Verejné zobrazenie na rise.sk nie je povolenie na opätovné použitie v sociálnych sieťach.',
    rightsEvidence: riseOwned
      ? 'Interné vlastníctvo Rise.sk; verejná case study slúži ako zdrojový odkaz.'
      : `Chýba doložené povolenie klienta pre sociálne použitie; verejný zdroj: ${sourceUrl}`,
    rightsStatus: riseOwned ? 'confirmed' : 'needs-confirmation',
    ...(riseOwned
      ? { rightsReference: 'Rise.sk internal ownership register' }
      : {}),
    qualityNote,
    aiEdited,
    requiresVisualApproval: !riseOwned || protectedProject || aiEdited,
  }) as CatalogAsset;
}

/**
 * Browser-safe canonical asset metadata. Filesystem resolution stays in
 * assetCatalog.ts, while plan validation and rendering share these exact
 * rights, confidentiality and platform records.
 */
export const RISE_ASSET_CATALOG = {
  version: RISE_PUBLIC_ASSET_CATALOG_V1.version,
  checkedAt: RISE_PUBLIC_ASSET_CATALOG_V1.checkedAt,
  assets: RISE_PUBLIC_ASSET_CATALOG_V1.assets.map(catalogAsset),
} as const;
