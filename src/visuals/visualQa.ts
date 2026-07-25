import { readFile, stat } from 'node:fs/promises';

import { GenerationRecipeSchema, type AssetRecord, type PostConcept } from '@/domain/schemas';
import { isAssetRenderable } from '@/visuals/assetCatalog';

import { CAROUSEL_TEMPLATES, resolveCarouselTemplate, type CarouselTemplateId, type VisualLayout } from './carouselTemplates';

export type VisualQaFinding = {
  code:
    | 'template-slide-count'
    | 'cover-title-words'
    | 'cover-title-lines'
    | 'slide-body-words'
    | 'missing-alt'
    | 'unsafe-margin'
    | 'wrong-dimensions'
    | 'repeated-layout'
    | 'asset-not-allowed'
    | 'asset-rights'
    | 'asset-approval'
    | 'asset-redaction'
    | 'unknown-asset'
    | 'asset-path-mismatch'
    | 'generation-provenance'
    | 'generation-subject'
    | 'missing-file'
    | 'empty-file'
    | 'invalid-png'
    | 'wrong-png-dimensions';
  message: string;
  slide?: number;
};

export type VisualQaReport = {
  passed: boolean;
  findings: VisualQaFinding[];
  humanReview: string[];
};

type PreRenderInput = {
  template: CarouselTemplateId;
  title: string;
  dimensions: { width: number; height: number };
  safeMargin?: number;
  strictTemplate?: boolean;
  platform?: 'instagram' | 'linkedin' | 'facebook';
  project?: string;
  slides: Array<{ title: string; body: string; alt: string; layout?: VisualLayout; assetId?: string; imagePath?: string }>;
  assets: readonly AssetRecord[];
  generation?: unknown;
};

const countWords = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length;
const countLines = (value: string) => value.split(/\r?\n/u).filter(line => line.trim()).length;
const BANNED_GENERATIVE_SUBJECTS = /\b(person|people|portrait|face|human|logo|wordmark|text|typography|ui|interface|dashboard|metric|chart|graph|človek|človeka|ľudia|ľudí|tvár|tvare|osoba|osoby|logo|značka|text|písmo|rozhranie|obrazovka|dashboard|panel|metrika|metriky|graf|grafom|grafy|tabuľka|tabuľky)\b/iu;

function generativeSubjectIsBlocked(prompt: string): boolean {
  // “no text” / “bez textu” is a guardrail, not a request to render text.
  const subjectOnly = prompt.replace(
    /\b(?:no|without|bez)\s+(?:person|people|portrait|face|human|logo|wordmark|text|typography|ui|interface|dashboard|metric|chart|graph)(?:u|ov|y|a|e)?\b/giu,
    '',
  );
  return BANNED_GENERATIVE_SUBJECTS.test(subjectOnly);
}

function report(findings: VisualQaFinding[], humanReview: string[] = []): VisualQaReport {
  return { passed: findings.length === 0, findings, humanReview };
}

export function assessGenerationRecipe(input: unknown): VisualQaReport {
  const findings: VisualQaFinding[] = [];
  const parsed = GenerationRecipeSchema.safeParse(input);
  if (!parsed.success) {
    findings.push({
      code: 'generation-provenance',
      message: 'Generatívny vizuál vyžaduje úplný recipe kontrakt, samostatné povolenie a časový checkpoint človeka.',
    });
    return report(findings, ['Skontrolovať artefakty UI, logá, predmety a zmenu klientského UI.']);
  }
  const recipe = parsed.data;
  const generatedAt = Date.parse(recipe.generatedAt);
  const approvedAt = Date.parse(recipe.generationApprovedAt);
  if (!Number.isFinite(generatedAt) || !Number.isFinite(approvedAt) || approvedAt > generatedAt) {
    findings.push({
      code: 'generation-provenance',
      message: 'Schválenie generatívneho receptu musí mať platný čas a musí predchádzať alebo byť súčasné s vytvorením výstupu.',
    });
  }
  if (!recipe.subject || !['abstract', 'editorial-material'].includes(recipe.subject) || generativeSubjectIsBlocked(recipe.prompt)) {
    findings.push({
      code: 'generation-subject',
      message: 'Generatívny vizuál môže pokrývať iba abstraktný alebo editoriálny koncept bez ľudí, loga, textu, UI a metrík.',
    });
  }
  return report(findings, ['Skontrolovať artefakty UI, logá, predmety a zmenu klientského UI.']);
}

export function qaCarouselBeforeRender(input: PreRenderInput): VisualQaReport {
  const findings: VisualQaFinding[] = [];
  const humanReview = ['Skontrolovať artefakty UI, logá, predmety a zmenu klientského UI.'];
  const template = CAROUSEL_TEMPLATES[input.template];
  if ((input.strictTemplate ?? true) && input.slides.length !== template.slides.length) {
    findings.push({ code: 'template-slide-count', message: `Šablóna ${input.template} vyžaduje ${template.slides.length} slidov.` });
  }
  if (countWords(input.title) > 7) {
    findings.push({ code: 'cover-title-words', message: 'Cover môže mať najviac sedem slov.', slide: 1 });
  }
  if (countLines(input.title) > 2) {
    findings.push({ code: 'cover-title-lines', message: 'Cover môže mať najviac dva riadky.', slide: 1 });
  }
  if (input.dimensions.width !== 1080 || input.dimensions.height !== 1350) {
    findings.push({ code: 'wrong-dimensions', message: 'Carousel musí mať 1080 × 1350 px.' });
  }
  if ((input.safeMargin ?? 84) < 84) {
    findings.push({ code: 'unsafe-margin', message: 'Bezpečný okraj obsahu musí mať aspoň 84 px.' });
  }
  const layouts: VisualLayout[] = [];
  for (const [index, slide] of input.slides.entries()) {
    if (countWords(slide.body) > 45) {
      findings.push({ code: 'slide-body-words', message: 'Obsahový slide môže mať najviac 45 slov.', slide: index + 1 });
    }
    if (!slide.alt.trim()) {
      findings.push({ code: 'missing-alt', message: 'Každý slide musí mať zmysluplný alt text.', slide: index + 1 });
    }
    if (slide.layout) layouts.push(slide.layout);
    if (slide.imagePath && !slide.assetId) {
      findings.push({ code: 'unknown-asset', message: 'Slide s obrázkom musí odkazovať na stabilné catalogue asset ID.', slide: index + 1 });
    }
    if (slide.imagePath && slide.assetId) {
      const asset = input.assets.find(candidate => candidate.id === slide.assetId);
      if (!asset) {
        findings.push({ code: 'unknown-asset', message: `Slide odkazuje na neznámy asset ${slide.assetId}.`, slide: index + 1 });
      } else if (asset.path !== slide.imagePath) {
        findings.push({ code: 'asset-path-mismatch', message: `Slide path nezodpovedá evidovanému assetu ${asset.id}.`, slide: index + 1 });
      }
    }
  }
  if (layouts.length >= 3 && new Set(layouts).size === 1) {
    findings.push({ code: 'repeated-layout', message: 'Carousel musí striedať užitočné layouty namiesto opakovania jedného mockupu.' });
  }
  for (const asset of input.assets) {
    if (input.platform && !asset.allowedPlatforms.includes(input.platform)) {
      findings.push({ code: 'asset-not-allowed', message: `Asset ${asset.id} nie je povolený pre platformu ${input.platform}.` });
    }
    if (input.project && asset.project !== input.project) {
      findings.push({ code: 'asset-not-allowed', message: `Asset ${asset.id} nepatrí do vybraného projektu.` });
    }
    if (asset.origin === 'public-licensed' && !asset.rightsNote?.trim()) {
      findings.push({ code: 'asset-rights', message: `Externý asset ${asset.id} nemá zaznamenanú licenciu.` });
    }
    if (asset.confidentiality === 'confidential' || asset.redactionStatus === 'pending') {
      findings.push({ code: 'asset-redaction', message: `Asset ${asset.id} nie je renderovateľný bez samostatne dokončenej redakcie.` });
    }
    if (['client-approved', 'public-licensed'].includes(asset.origin) && asset.rightsStatus !== 'confirmed') {
      findings.push({ code: 'asset-rights', message: `Asset ${asset.id} čaká na potvrdenie práv pre publikovanie.` });
    }
    if (!asset.approved || asset.requiresVisualApproval) {
      findings.push({ code: 'asset-approval', message: `Asset ${asset.id} čaká na vizuálne schválenie.` });
    }
  }
  if (input.generation) findings.push(...assessGenerationRecipe(input.generation).findings);
  return report(findings, humanReview);
}

/** Legacy concepts get a safe visual layout but retain their historical 4–8 slide count. */
export function qaPostBeforeRender(post: PostConcept, assets: readonly AssetRecord[] = []): VisualQaReport {
  const template = resolveCarouselTemplate(post.carouselTemplate, post.theme);
  const assetFindings: VisualQaFinding[] = [];
  const referenced = post.slides.filter(slide => slide.imagePath);
  const referencedIds = new Set(referenced.flatMap(slide => (slide.assetId ? [slide.assetId] : [])));
  const selectedAssets = assets.filter(asset => referencedIds.has(asset.id));
  for (const slide of referenced) {
    const asset = selectedAssets.find(candidate => candidate.id === slide.assetId);
    if (!asset || !post.project) {
      assetFindings.push({ code: 'asset-not-allowed', message: 'Renderovaný asset vyžaduje deklarovaný projekt a evidovaný asset record.' });
      continue;
    }
    for (const platform of ['instagram', 'linkedin', 'facebook'] as const) {
      if (!isAssetRenderable(asset, { project: post.project, platform })) {
        assetFindings.push({ code: 'asset-not-allowed', message: `Asset ${asset.id} nie je renderovateľný pre ${platform}.` });
      }
    }
  }
  const base = qaCarouselBeforeRender({
    template: template.id,
    title: post.slides[0]?.title ?? post.title,
    dimensions: { width: 1080, height: 1350 },
    strictTemplate: Boolean(post.carouselTemplate),
    slides: post.slides.map(slide => ({ title: slide.title, body: slide.body, alt: slide.alt, layout: slide.visualLayout, assetId: slide.assetId, imagePath: slide.imagePath })),
    assets: selectedAssets,
  });
  return report([...base.findings, ...assetFindings], base.humanReview);
}

function readPngDimensions(contents: Buffer): { width: number; height: number } | undefined {
  const signature = '89504e470d0a1a0a';
  if (contents.length < 24 || contents.subarray(0, 8).toString('hex') !== signature) return undefined;
  if (contents.subarray(12, 16).toString('ascii') !== 'IHDR') return undefined;
  return { width: contents.readUInt32BE(16), height: contents.readUInt32BE(20) };
}

/** Deterministic post-render gate. It validates dimensions/files, then requires visual human inspection. */
export async function qaRenderedSlides(paths: readonly string[], expectedCount = 1): Promise<VisualQaReport> {
  const findings: VisualQaFinding[] = [];
  if (paths.length !== expectedCount) {
    findings.push({ code: 'missing-file', message: `Renderer vrátil ${paths.length} PNG namiesto očakávaných ${expectedCount}.` });
  }
  for (const path of paths) {
    try {
      const metadata = await stat(path);
      if (metadata.size === 0) {
        findings.push({ code: 'empty-file', message: `Vyrenderovaný súbor je prázdny: ${path}` });
        continue;
      }
      const dimensions = readPngDimensions(await readFile(path));
      if (!dimensions) {
        findings.push({ code: 'invalid-png', message: `Vyrenderovaný súbor nie je platný PNG: ${path}` });
      } else if (dimensions.width !== 1080 || dimensions.height !== 1350) {
        findings.push({ code: 'wrong-png-dimensions', message: `PNG musí mať 1080 × 1350 px: ${path}` });
      }
    } catch {
      findings.push({ code: 'missing-file', message: `Chýba vyrenderovaný súbor: ${path}` });
    }
  }
  return report(findings, ['Skontrolovať artefakty UI, logá, predmety a zmenu klientského UI.']);
}
