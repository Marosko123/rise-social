import { RISE_PUBLIC_ASSET_CATALOG_V1 } from '../../brand/assets.v1';
import { RISE_BRAND_ASSET_MANIFEST_V1 } from '../../brand/brand-assets.v1';
import { RISE_BRAND_COPY_V1 } from '../../brand/brand-copy.v1';
import { INSTAGRAM_CAROUSEL_PLAYBOOK_V1 } from '../../brand/instagram-carousel-playbook.v1';
import { RISE_VISUAL_GENERATION_PLAYBOOK_V1 } from '../../brand/visual-generation-playbook.v1';
import { RISE_CONTENT_PLAN } from '@/contentPlan/plan';

const PUBLIC_BASE_URL = 'https://marosko123.github.io/rise-social';
const RISE_ORIGIN = 'https://rise.sk';
const RIGHTS_CHECKED_AT = RISE_PUBLIC_ASSET_CATALOG_V1.checkedAt.slice(0, 10);
const BLOCKED_PROJECTS = new Set([
  'Personálno-mzdový systém',
  'VIAC AKO NI(c)K',
  'Bežecká mobilná aplikácia',
]);

export type PublicAssetUsageStatus =
  | 'approved'
  | 'reference-only'
  | 'blocked';

function recommendedUse(visualClass: string): string {
  switch (visualClass) {
    case 'branded-diagram':
      return 'Vysvetľujúci slide, architektúra alebo tok. Zachovať celý význam, poradie a čitateľné popisy.';
    case 'generated-illustration':
      return 'Iba editoriálny kontext po novom vizuálnom a ľudskom schválení; nie produktový dôkaz.';
    default:
      return 'Produktový kontext alebo detail Inside the Build. UI sa nesmie generovať, prepisovať ani významovo meniť.';
  }
}

function cropRule(visualClass: string): string {
  return visualClass === 'branded-diagram'
    ? 'Zachovať celý diagram a všetky významové popisy; orezať možno iba prázdny okraj po kontrole čitateľnosti.'
    : 'Zachovať pomer strán a podstatný produktový kontext; neorezať navigáciu, hodnoty ani prvky potrebné na pochopenie UI.';
}

function usageStatus(
  project: string,
  path: string,
): PublicAssetUsageStatus {
  if (project === 'Rise.sk' && !path.includes('/ai-edited/')) {
    return 'approved';
  }
  if (BLOCKED_PROJECTS.has(project) || path.includes('/ai-edited/')) {
    return 'blocked';
  }
  return 'reference-only';
}

const publicAssets = RISE_PUBLIC_ASSET_CATALOG_V1.assets.map(
  ([id, project, caseStudyUrl, path, visualClass, , quality]) => {
    const status = usageStatus(project, path);
    const aiEdited = path.includes('/ai-edited/');
    const generated = visualClass === 'generated-illustration';

    return {
      id,
      project,
      caseStudyUrl,
      previewUrl: new URL(path, RISE_ORIGIN).toString(),
      visualClass,
      recommendedUse: recommendedUse(visualClass),
      allowedPlatforms:
        status === 'approved'
          ? (['instagram', 'linkedin', 'facebook'] as const)
          : ([] as const),
      crop: cropRule(visualClass),
      quality,
      usageStatus: status,
      aiProvenance: aiEdited
        ? 'AI-edited public composition; original UI must remain unchanged and the composition is blocked until explicit visual approval.'
        : generated
          ? 'Generated editorial source; it is not product evidence and remains blocked for this protected project.'
          : 'No AI edit recorded for the public source asset.',
      redaction:
        BLOCKED_PROJECTS.has(project)
          ? 'pending-human-review'
          : 'not-required-for-reference',
      rightsCheckedAt: RIGHTS_CHECKED_AT,
    };
  },
);

const assetsByProject = new Map<string, string[]>();
for (const asset of publicAssets) {
  const ids = assetsByProject.get(asset.project) ?? [];
  ids.push(asset.id);
  assetsByProject.set(asset.project, ids);
}

function safeVisualStrategy(project: (typeof RISE_CONTENT_PLAN.projects)[number]) {
  if (project.id === 'rise-sk') {
    return 'Použiť schválený reálny screenshot Rise.sk ako produktový dôkaz; generatívna vrstva môže byť iba oddelené pokojné pozadie.';
  }
  if (project.requiresVisualApproval) {
    return 'Použiť iba anonymizovaný verejný kontext po osobitnej kontrole. Nevytvárať ľudí ani klientsky produkt; bezpečný fallback je originálny abstraktný diagram.';
  }
  return 'Verejný obrázok slúži iba ako referencia, kým nie sú potvrdené sociálne práva. Pre výstup použiť nové vlastnené zachytenie alebo samostatnú abstraktnú vrstvu.';
}

export const PUBLIC_VISUAL_ASSET_MANIFEST = {
  schemaVersion: '1.0',
  id: 'rise-public-visual-assets-v1',
  canonicalUrl: `${PUBLIC_BASE_URL}/visual-assets.json`,
  checkedAt: RIGHTS_CHECKED_AT,
  policy:
    'Verejná case study nie je automatické povolenie na sociálne použitie. ChatGPT smie použiť ako vložený dôkaz iba asset so stavom approved a iba na uvedených platformách.',
  statuses: {
    approved:
      'Môže byť navrhnutý pre uvedené platformy, stále však podlieha crop, vizuálnej QA a ľudskému schváleniu.',
    'reference-only':
      'Môže usmerniť art direction, ale nesmie byť vložený do výstupu bez nového potvrdenia práv.',
    blocked:
      'Nesmie byť použitý ani generatívne upravovaný, kým sa nedokončí uvedená kontrola.',
  },
  projects: RISE_CONTENT_PLAN.projects.map(project => ({
    id: project.id,
    name: project.name,
    caseStudyUrl: project.publicUrl,
    assetIds: assetsByProject.get(project.name) ?? [],
    safeVisualStrategy: safeVisualStrategy(project),
  })),
  assets: publicAssets,
} as const;

export const PUBLIC_VISUAL_PLAYBOOK = {
  schemaVersion: '1.0',
  canonicalUrl: `${PUBLIC_BASE_URL}/visual-playbook.json`,
  humanReadableUrl: `${PUBLIC_BASE_URL}/visual-playbook/`,
  markdownUrl: `${PUBLIC_BASE_URL}/visual-playbook.md`,
  assetManifestUrl: `${PUBLIC_BASE_URL}/visual-assets.json`,
  instagramCarouselPlaybookUrl: `${PUBLIC_BASE_URL}/instagram-carousel-playbook.json`,
  brandAssetManifestUrl: `${PUBLIC_BASE_URL}/brand-assets.json`,
  brandCopyUrl: `${PUBLIC_BASE_URL}/brand-copy.json`,
  contentPlanUrl: `${PUBLIC_BASE_URL}/content-plan/`,
  playbook: RISE_VISUAL_GENERATION_PLAYBOOK_V1,
} as const;

export const PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK = {
  ...INSTAGRAM_CAROUSEL_PLAYBOOK_V1,
  canonicalUrl: `${PUBLIC_BASE_URL}/instagram-carousel-playbook.json`,
  humanReadableUrl: `${PUBLIC_BASE_URL}/instagram-carousel-playbook/`,
  markdownUrl: `${PUBLIC_BASE_URL}/instagram-carousel-playbook.md`,
  brandAssetManifestUrl: `${PUBLIC_BASE_URL}/brand-assets.json`,
  brandCopyUrl: `${PUBLIC_BASE_URL}/brand-copy.json`,
  visualAssetManifestUrl: `${PUBLIC_BASE_URL}/visual-assets.json`,
} as const;

export const PUBLIC_BRAND_ASSET_MANIFEST =
  RISE_BRAND_ASSET_MANIFEST_V1;

export const PUBLIC_BRAND_COPY = RISE_BRAND_COPY_V1;

export function renderPublicInstagramCarouselPlaybookMarkdown(): string {
  const playbook = PUBLIC_INSTAGRAM_CAROUSEL_PLAYBOOK;
  const narrative = playbook.narrative
    .map(
      (slide, index) =>
        `${index + 1}. **${slide.role}** — ${slide.question} ${slide.evidence}${
          slide.required ? '' : ' Ak chýba dôkaz, tento slide sa vynechá.'
        }`,
    )
    .join('\n');
  const sources = playbook.sources
    .map(source => `- [${source.id}](${source.url}) — ${source.role}`)
    .join('\n');

  return `# Rise Instagram App Carousel

Kanonická verzia: \`${playbook.id}\` · kontrola ${playbook.checkedAt}

${playbook.purpose}

## Načítanie pre ChatGPT

\`${playbook.loadOrder.join(' → ')}\`

## Formát

- ${playbook.format.width} × ${playbook.format.height} px, ${playbook.format.aspectRatio}
- ${playbook.format.columns}-stĺpcový grid, bezpečný okraj ${playbook.format.safeMargin} px
- ${playbook.format.slideCount.preferred} slidov; ${playbook.format.slideCount.fallback} iba ak chýba verejný dôkaz

## Príbeh aplikácie

${narrative}

## Text

- Cover: ${playbook.text.coverHeadline.minWords}–${playbook.text.coverHeadline.maxWords} slov, najviac ${playbook.text.coverHeadline.maxLines} riadky
- Obsahový headline: ${playbook.text.contentHeadline.minWords}–${playbook.text.contentHeadline.maxWords} slov
- Body: ${playbook.text.body.minWords}–${playbook.text.body.maxWords} slov, najviac ${playbook.text.body.maxSentences} vety
- Slide spolu: najviac ${playbook.text.slideTotal.maxWords} slov
- Callout: ${playbook.text.callout.minWords}–${playbook.text.callout.maxWords} slová, najviac ${playbook.text.callout.maxCount}
- ${playbook.text.claimRule}

## Brand a produktový dôkaz

- Playfair Display iba na krátky headline; Inter na funkčný text.
- Canvas ${playbook.palette.canvas}; surface ${playbook.palette.surface}; gold ${playbook.palette.gold}; text ${playbook.palette.strongText}.
- ${playbook.productEvidence.preserve}
- ${playbook.productEvidence.rights}
- Logo: asset \`${playbook.logo.symbolAssetId}\` + presný text \`${playbook.logo.wordmarkText}\`.

## QA

${playbook.qa.beforeRender.map(item => `- Pred renderom: ${item}`).join('\n')}
${playbook.qa.afterRender.map(item => `- Po renderi: ${item}`).join('\n')}

## Verejné kontrakty

- Brand assety: ${PUBLIC_BASE_URL}/brand-assets.json
- Kanonické texty: ${PUBLIC_BASE_URL}/brand-copy.json
- Bezpečný katalóg obrázkov: ${PUBLIC_BASE_URL}/visual-assets.json
- Vizuálny AI playbook: ${PUBLIC_BASE_URL}/visual-playbook.json

## Zdroje

${sources}
`;
}

export function renderPublicVisualPlaybookMarkdown(): string {
  const playbook = RISE_VISUAL_GENERATION_PLAYBOOK_V1;
  const formats = Object.values(playbook.platformFormats)
    .map(format => `- ${format.label}: ${format.width} × ${format.height} px; ${format.cropRule}`)
    .join('\n');
  const recipes = playbook.seriesRecipes
    .map(
      recipe =>
        `### ${recipe.label}\n\n- Hrdina: ${recipe.hero}\n- Úloha AI: ${recipe.aiRole}\n- Kompozícia: ${recipe.composition}\n- Nikdy: ${recipe.never}`,
    )
    .join('\n\n');
  const sources = playbook.sources
    .map(
      source =>
        `- [${source.label}](${source.url}) — ${source.role} Kontrola: ${source.checkedAt}; platnosť: ${source.expiresAt}.`,
    )
    .join('\n');

  return `# Rise Visual System

Kanonická verzia: \`${playbook.id}\` · kontrola ${playbook.checkedAt}

${playbook.promise}

## Povinný workflow

\`${playbook.chatGptWorkflow.steps.join(' → ')}\`

${playbook.chatGptWorkflow.topicOnly}

${playbook.chatGptWorkflow.directGeneration}

${playbook.chatGptWorkflow.missingAsset}

## Brand lock

- Paleta: canvas ${playbook.brandLock.palette.canvas}; surface ${playbook.brandLock.palette.surface}; elevated ${playbook.brandLock.palette.elevated}; Rise gold ${playbook.brandLock.palette.gold}; text ${playbook.brandLock.palette.strongText}.
- Kompozícia: ${playbook.brandLock.composition.join('; ')}.
- Materiály: ${playbook.brandLock.materials.join('; ')}.
- Svetlo: ${playbook.brandLock.lighting.join('; ')}.
- Pravidlo: ${playbook.brandLock.statement}

## Formáty

${formats}

## Série

${recipes}

## Povinný obrazový brief

\`${playbook.promptContract.join(' → ')}\`

${playbook.promptTemplate.map(item => `- ${item}`).join('\n')}

## Negative prompt

${playbook.negativePrompt}

## Výsledok musí priložiť

${playbook.resultContract.map(item => `- ${item}`).join('\n')}

## Verejné dáta

- Asset manifest: ${PUBLIC_BASE_URL}/visual-assets.json
- Strojový playbook: ${PUBLIC_BASE_URL}/visual-playbook.json
- Obsahový plán: ${PUBLIC_BASE_URL}/content-plan/
- Rise portfólio: https://rise.sk/portfolio

## Oficiálne zdroje

${sources}
`;
}
