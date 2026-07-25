import type { AssetRecord, PostConcept } from '@/domain/schemas';
import { isAssetRenderable, resolveCatalogAssetPath } from '@/visuals/assetCatalog';

/**
 * Produces the only image paths allowed to reach the browser. Slide metadata is
 * a reference, never authority: both ID and relative path must match a selected
 * approved asset record.
 */
export function resolvePostAssetsForRender(
  post: PostConcept,
  assets: readonly AssetRecord[],
  publicAssetRoot?: string,
): PostConcept {
  const slides = post.slides.map(slide => {
    if (!slide.imagePath) return slide;
    if (!slide.assetId) throw new Error('Slide image requires a stable asset ID.');
    if (!post.project) throw new Error('Slide image requires a declared post project.');
    const asset = assets.find(candidate => candidate.id === slide.assetId);
    if (!asset) throw new Error(`Unknown selected asset: ${slide.assetId}.`);
    if (asset.path !== slide.imagePath) throw new Error(`Slide image path does not match selected asset ${asset.id}.`);
    for (const platform of ['instagram', 'linkedin', 'facebook'] as const) {
      if (!isAssetRenderable(asset, { project: post.project, platform })) {
        throw new Error(`Selected asset ${asset.id} is not approved for ${platform} render.`);
      }
    }
    if (!publicAssetRoot) throw new Error('Image rendering requires an explicit public asset root.');
    if (!asset.contentSha256) {
      throw new Error(`Selected asset ${asset.id} has no approved content digest.`);
    }
    const resolvedPath = resolveCatalogAssetPath(asset, publicAssetRoot);
    const currentDigest = createHash('sha256')
      .update(readFileSync(resolvedPath))
      .digest('hex');
    if (currentDigest !== asset.contentSha256) {
      throw new Error(`Selected asset ${asset.id} changed after its content digest was approved.`);
    }
    return { ...slide, imagePath: resolvedPath };
  });
  return { ...post, slides };
}
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
