import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser } from 'playwright-core';

type PlatformId = 'linkedin' | 'instagram' | 'facebook';
type AssetName =
  | 'linkedin-cover.png'
  | 'facebook-cover.png'
  | 'profile-master.png'
  | 'profile-32px.png'
  | 'instagram-grid-preview.png';

export type ProfileLinkSet = {
  portfolio: string;
  contact: string;
  articles: string;
};

export type ProfilePlatform = {
  role: string;
  nameField: string;
  category: string;
  tagline?: string;
  about?: string;
  bio?: string;
  intro?: string;
  specialties?: readonly string[];
  highlights?: readonly string[];
  pinnedPostBriefs: readonly string[];
  cta: string;
  links: ProfileLinkSet;
  imageSizes: ReadonlyArray<{ file: AssetName; width: number; height: number; safeZoneNote: string }>;
  manualChecklist: readonly string[];
};

export type RiseProfileManifest = {
  version: 1;
  name: 'Rise.sk';
  promise: 'Softvér, ktorý prináša výsledky.';
  secondarySentence: 'Softvér, dáta a AI. Jeden tím od návrhu po prevádzku.';
  handleFallbackOrder: readonly ['@rise.sk', '@risesk', '@risesksoftware'];
  visualIdentity: {
    palette: Readonly<Record<'canvas' | 'surface' | 'elevated' | 'gold' | 'strongText' | 'bodyText' | 'line', string>>;
    typography: { display: string; functional: string; displayRule: string };
    profileMark: string;
  };
  brandAsset: {
    path: string;
    sourcePublicPath: string;
    sha256: string;
    provenance: string;
  };
  platforms: Record<PlatformId, ProfilePlatform>;
  assetMetadata: Record<AssetName, { width: number; height: number; safeZoneNote: string; purpose: string }>;
  gridPreview: {
    rhythm: string;
    tiles: ReadonlyArray<{
      label: string;
      kind: 'product-proof' | 'diagram' | 'photo-slot';
      assetId?: string;
      assetState: string;
    }>;
  };
  liveChangePolicy: string;
};

const PALETTE = {
  canvas: '#080807',
  surface: '#0C0C0C',
  elevated: '#141414',
  gold: '#DAB549',
  strongText: '#F8F4EC',
  bodyText: '#D5D3D0',
  line: '#2B2924',
} as const;

function trackedUrl(path: string, platform: PlatformId, destination: keyof ProfileLinkSet): string {
  const url = new URL(path, 'https://rise.sk');
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', `${platform}-profile`);
  url.searchParams.set('utm_campaign', `rise-profile-${platform}-${destination}`);
  url.searchParams.set('utm_content', `${platform}-${destination}-profile-link`);
  return url.toString();
}

function profileLinks(platform: PlatformId): ProfileLinkSet {
  return {
    portfolio: trackedUrl('/portfolio', platform, 'portfolio'),
    contact: trackedUrl('/kontakt', platform, 'contact'),
    articles: trackedUrl('/blog', platform, 'articles'),
  };
}

const LINKEDIN_ABOUT = `Rise.sk je softvérová firma z Bratislavy. Staviame interné systémy, webové a mobilné aplikácie, dátové riešenia a AI automatizácie pre firmy, ktoré od technológií očakávajú reálny obchodný výsledok.

Jeden tím prepája produktovú stratégiu, UX/UI, vývoj, integrácie a prevádzku. Ak je to súčasť riešenia, prepájame tiež web, organický obsah, SEO a meranie.

Pomáhame najmä vtedy, keď vzniká nový digitálny produkt, manuálny proces potrebuje spoľahlivú automatizáciu alebo existujúci systém treba bezpečne modernizovať.

Verejné prípadové štúdie: rise.sk/portfolio`;

const ASSET_METADATA = {
  'linkedin-cover.png': {
    width: 4200,
    height: 700,
    safeZoneNote: 'Veta je vo viditeľnej strednej zóne x=1050–3150; kraje sa môžu na menších zariadeniach orezať.',
    purpose: 'LinkedIn cover s viditeľnou vetou a abstraktnou Rise geometriou, bez vymysleného UI.',
  },
  'facebook-cover.png': {
    width: 851,
    height: 315,
    safeZoneNote: 'Ľavá zóna x=0–245 zostáva pokojná pre prekrytie profilovou fotografiou; veta je vpravo v zóne x=455–785.',
    purpose: 'Facebook cover s viditeľnou vetou a abstraktnou Rise geometriou, bez ľudí a produktu.',
  },
  'profile-master.png': {
    width: 320,
    height: 320,
    safeZoneNote: 'Zlatý znak je uložený v stredovom kruhu s voľným okrajom pre kruhový orez.',
    purpose: 'Spoločný profilový master – zlatý Rise znak na čiernom pozadí bez wordmarku.',
  },
  'profile-32px.png': {
    width: 32,
    height: 32,
    safeZoneNote: 'Náhľad overuje čitateľnosť znaku pri minimálnej veľkosti 32 px.',
    purpose: 'Kontrolný náhľad profilového znaku pri 32 px.',
  },
  'instagram-grid-preview.png': {
    width: 1080,
    height: 1080,
    safeZoneNote: 'Každá z deviatich dlaždíc má samostatnú kompozíciu; návrh nie je puzzle mriežka.',
    purpose: 'Náhľad rytmu gridu: produktový dôkaz, vysvetľujúci diagram, ľudský moment.',
  },
} as const satisfies Record<AssetName, { width: number; height: number; safeZoneNote: string; purpose: string }>;

const GRID_TILES = [
  { label: 'Inside the Build · Rise.sk', kind: 'product-proof', assetId: 'rise-home', assetState: 'Vlastnený verejný produktový asset; do masteru nie je vložený, kým sa samostatne nepotvrdí aktuálnosť.' },
  { label: 'Decision Notes · MojaFirma', kind: 'diagram', assetId: 'mojafirma-document-flow', assetState: 'Verejný diagram je len zdrojový slot; sociálne práva vyžadujú potvrdenie.' },
  { label: 'People Behind the Product · foto', kind: 'photo-slot', assetState: 'Fotodokumentácia tímu sa vloží až po samostatnom schválení osoby a použitia.' },
  { label: 'Inside the Build · MapaTrhu', kind: 'product-proof', assetId: 'mapatrhu-map', assetState: 'Verejný produktový asset je zdrojový slot; sociálne práva vyžadujú potvrdenie.' },
  { label: 'Decision Notes · Slates', kind: 'diagram', assetId: 'slates-architecture', assetState: 'Verejný diagram je zdrojový slot; sociálne práva vyžadujú potvrdenie.' },
  { label: 'People Behind the Product · demo', kind: 'photo-slot', assetState: 'Žiadna osoba ani UI nie sú generované; pred použitím vložiť schválenú dokumentáciu.' },
  { label: 'Inside the Build · GrantAI', kind: 'product-proof', assetId: 'grantai-ui', assetState: 'Verejný produktový asset je zdrojový slot; sociálne práva vyžadujú potvrdenie.' },
  { label: 'Decision Notes · Trnava', kind: 'diagram', assetId: 'trnava-decision-flow', assetState: 'Verejný diagram je zdrojový slot; sociálne práva vyžadujú potvrdenie.' },
  { label: 'People Behind the Product · proces', kind: 'photo-slot', assetState: 'Žiadna osoba ani UI nie sú generované; pred použitím vložiť schválenú dokumentáciu.' },
] as const;

export const RISE_LOGO_SOURCE = {
  path: 'brand/rise-logo.svg',
  sourcePublicPath: 'rise.sk/public/rise/gradient/Rise_logo.svg',
  sha256: '66f0d9e833b9f5b979db369a5b35f6bb547ad05564ec362013295eef1db67037',
  provenance: 'Vlastnený Rise SVG znak skopírovaný bez zmeny geometrie z verejného brand assetu.',
} as const;

export const RISE_PROFILE_MANIFEST: RiseProfileManifest = {
  version: 1,
  name: 'Rise.sk',
  promise: 'Softvér, ktorý prináša výsledky.',
  secondarySentence: 'Softvér, dáta a AI. Jeden tím od návrhu po prevádzku.',
  handleFallbackOrder: ['@rise.sk', '@risesk', '@risesksoftware'],
  visualIdentity: {
    palette: PALETTE,
    typography: {
      display: 'Playfair Display',
      functional: 'Inter',
      displayRule: 'Playfair Display používajte iba na krátke nosné titulky; Inter na všetok funkčný text.',
    },
    profileMark: 'Vlastnený Rise SVG znak na čiernom podklade, bez wordmarku; geometria je rasterizovaná bez prekreslenia. Pred použitím manuálne overte kruhový orez a 32 px čitateľnosť.',
  },
  brandAsset: RISE_LOGO_SOURCE,
  platforms: {
    linkedin: {
      role: 'Odborná dôvera, obchodné rozhodovanie, prípadové štúdie a názory ľudí z Rise.',
      nameField: 'Rise.sk',
      category: 'Software company',
      tagline: 'Softvér, dátové systémy a AI automatizácie. Jeden tím od návrhu po prevádzku.',
      about: LINKEDIN_ABOUT,
      specialties: ['Custom software', 'AI, automation and data', 'Product strategy and UX/UI', 'Software modernization', 'Technology consulting and audits', 'Digital marketing'],
      pinnedPostBriefs: ['Čo staviame', 'Ako pracujeme', 'Vybrané projekty'],
      cta: 'Navštíviť portfólio alebo začať konzultáciu.',
      links: profileLinks('linkedin'),
      imageSizes: [{ file: 'linkedin-cover.png', ...ASSET_METADATA['linkedin-cover.png'] }],
      manualChecklist: ['Vložte cover ručne a skontrolujte stredný orez na desktop aj mobile.', 'Skopírujte About a specialties až po manuálnom schválení.', 'Neodstraňujte staré príspevky automaticky.'],
    },
    instagram: {
      role: 'Vizuálne zapamätateľný produktový magazín Rise a ľudská tvár štúdia.',
      nameField: 'Rise.sk | softvér a AI',
      category: 'Software company',
      bio: 'Softvér, dáta a AI, ktoré fungujú v praxi.\nOd návrhu po prevádzku.\n↓ Projekty a konzultácia',
      highlights: ['Projekty', 'Ako robíme', 'AI a dáta', 'Tím', 'Články', 'Kontakt'],
      pinnedPostBriefs: ['Čo staviame', 'Ako pracujeme', 'Vybrané projekty'],
      cta: 'Odkaz v profile: projekty a konzultácia.',
      links: profileLinks('instagram'),
      imageSizes: [
        { file: 'profile-master.png', ...ASSET_METADATA['profile-master.png'] },
        { file: 'profile-32px.png', ...ASSET_METADATA['profile-32px.png'] },
        { file: 'instagram-grid-preview.png', ...ASSET_METADATA['instagram-grid-preview.png'] },
      ],
      manualChecklist: ['Vyberte dostupné používateľské meno v určenom poradí až po manuálnom overení.', 'Skontrolujte bio a odkazy na zariadení s úzkym displejom.', 'Publikujte samostatné grid tiles, nikdy puzzle mriežku.'],
    },
    facebook: {
      role: 'Zrozumiteľná lokálna dôvera, ľudia, verejné projekty a návštevy webu.',
      nameField: 'Rise.sk',
      category: 'Software company',
      intro: 'Staviame softvér, dátové systémy a AI automatizácie. Jeden tím od návrhu po prevádzku.',
      pinnedPostBriefs: ['Uvítací post s fotografiou tímu, jasnou ponukou a odkazom na projekty.'],
      cta: 'Kontakt alebo rezervácia konzultácie.',
      links: profileLinks('facebook'),
      imageSizes: [
        { file: 'facebook-cover.png', ...ASSET_METADATA['facebook-cover.png'] },
        { file: 'profile-master.png', ...ASSET_METADATA['profile-master.png'] },
      ],
      manualChecklist: ['Vložte cover ručne a overte ľavú bezpečnú zónu po prekrytí profilovou fotografiou.', 'Použite kratší prirodzený text, nie kópiu LinkedIn captionu.', 'Pripnite uvítací post až po manuálnej kontrole odkazu.'],
    },
  },
  assetMetadata: ASSET_METADATA,
  gridPreview: {
    rhythm: 'Každý riadok: produktový dôkaz, vysvetľujúci diagram, ľudský moment. Každá dlaždica funguje samostatne; nie je to puzzle mriežka.',
    tiles: GRID_TILES,
  },
  liveChangePolicy: 'Tento balík pripravuje iba lokálne súbory. Všetky zmeny živých profilov, uploady, plánovanie a publikovanie robí človek po samostatnom schválení.',
};

export const PROFILE_PACK_FILES = [
  'linkedin-cover.png',
  'facebook-cover.png',
  'profile-master.png',
  'profile-32px.png',
  'instagram-grid-preview.png',
  'profile-manifest.json',
  'profile-checklist.md',
] as const;

const PROFILE_MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const OWNED_LOGO_PATH = resolve(PROFILE_MODULE_DIRECTORY, '../../brand/rise-logo.svg');
const APPROVED_CONTENT_ROOT = resolve(PROFILE_MODULE_DIRECTORY, '../../content/approved');
const APPROVED_HEADLINE = 'Softvér, ktorý prináša výsledky.';
const PLAYFAIR_FONT_PATH = resolve(PROFILE_MODULE_DIRECTORY, '../../node_modules/@fontsource/playfair-display/files/playfair-display-latin-ext-700-normal.woff2');
const INTER_FONT_PATH = resolve(PROFILE_MODULE_DIRECTORY, '../../node_modules/@fontsource/inter/files/inter-latin-ext-500-normal.woff2');

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!);
}

function svgDocument(width: number, height: number, content: string): string {
  const playfair = readFileSync(PLAYFAIR_FONT_PATH).toString('base64');
  const inter = readFileSync(INTER_FONT_PATH).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:'Playfair Display';font-style:normal;font-weight:700;src:url(data:font/woff2;base64,${playfair}) format('woff2')}@font-face{font-family:'Inter';font-style:normal;font-weight:500;src:url(data:font/woff2;base64,${inter}) format('woff2')}html,body{margin:0;width:${width}px;height:${height}px;background:#080807;overflow:hidden}svg{display:block}</style></head><body>${content}</body></html>`;
}

/** Source-backed cover; headline uses serif and all supporting copy uses system/Inter. */
export function renderCoverSvg(platform: 'linkedin' | 'facebook'): string {
  if (platform === 'linkedin') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="4200" height="700" viewBox="0 0 4200 700" role="img" aria-label="${APPROVED_HEADLINE}" data-approved-headline="${APPROVED_HEADLINE}">
  <rect width="4200" height="700" fill="#080807"/><rect x="760" y="96" width="2680" height="508" rx="28" fill="#0C0C0C" stroke="#2B2924"/>
  <path d="M900 510H1100L1170 238H1215" fill="none" stroke="#DAB549" stroke-width="18"/><circle cx="1215" cy="238" r="16" fill="#DAB549"/>
  <text id="linkedin-headline" x="1300" y="315" fill="#F8F4EC" font-family="'Playfair Display', serif" font-size="90" font-weight="700">${escapeXml(APPROVED_HEADLINE)}</text>
  <text id="linkedin-support" x="1303" y="395" fill="#D5D3D0" font-family="Inter, sans-serif" font-size="28" font-weight="500" letter-spacing="1">SOFTVÉR · DÁTA · AI · JEDEN TÍM OD NÁVRHU PO PREVÁDZKU</text>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="851" height="315" viewBox="0 0 851 315" role="img" aria-label="${APPROVED_HEADLINE}" data-approved-headline="${APPROVED_HEADLINE}">
  <rect width="851" height="315" fill="#080807"/><rect x="270" y="32" width="545" height="251" rx="18" fill="#0C0C0C" stroke="#2B2924"/>
  <path d="M300 245H360L395 164H445" fill="none" stroke="#DAB549" stroke-width="8"/><circle cx="445" cy="164" r="8" fill="#DAB549"/>
  <text x="455" y="126" fill="#F8F4EC" font-family="'Playfair Display', serif" font-size="36" font-weight="700"><tspan x="455" dy="0">Softvér,</tspan><tspan x="455" dy="43">ktorý prináša</tspan><tspan x="455" dy="43">výsledky.</tspan></text>
  <text x="457" y="260" fill="#D5D3D0" font-family="Inter, sans-serif" font-size="14" font-weight="500" letter-spacing="1">NÁVRH · VÝVOJ · PREVÁDZKA</text>
</svg>`;
}

export function renderGridSvg(): string {
  const tiles = GRID_TILES.map((tile, index) => {
    const x = (index % 3) * 360;
    const y = Math.floor(index / 3) * 360;
    const icon = tile.kind === 'photo-slot'
      ? `<rect x="${x + 44}" y="${y + 111}" width="272" height="104" rx="12" fill="none" stroke="#DAB549" stroke-width="3" stroke-dasharray="10 10"/><text x="${x + 180}" y="${y + 160}" fill="#D5D3D0" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17">FOTODOKUMENTÁCIA</text><text x="${x + 180}" y="${y + 188}" fill="#D5D3D0" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14">PRED SCHVÁLENÍM</text>`
      : `<rect x="${x + 44}" y="${y + 111}" width="272" height="104" rx="12" fill="#141414" stroke="#2B2924"/><path d="M${x + 70} ${y + 188}H${x + 180}L${x + 212} ${y + 138}H${x + 290}" fill="none" stroke="#DAB549" stroke-width="7"/><text x="${x + 180}" y="${y + 242}" fill="#D5D3D0" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14">ASSET SLOT · ${escapeXml(tile.assetId ?? '')}</text>`;
    const kind = tile.kind === 'product-proof' ? 'PRODUKTOVÝ DÔKAZ' : tile.kind === 'diagram' ? 'VYSVETĽUJÚCI DIAGRAM' : 'ĽUDSKÝ MOMENT';
    return `<g><rect x="${x + 8}" y="${y + 8}" width="344" height="344" rx="18" fill="${tile.kind === 'diagram' ? '#0C0C0C' : '#141414'}" stroke="#2B2924"/><text x="${x + 34}" y="${y + 58}" fill="#DAB549" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="1">${kind}</text><text x="${x + 34}" y="${y + 88}" fill="#F8F4EC" font-family="Georgia, 'Playfair Display', serif" font-size="21">${escapeXml(tile.label.split(' · ')[1] ?? tile.label)}</text>${icon}<text x="${x + 34}" y="${y + 300}" fill="#D5D3D0" font-family="Inter, Arial, sans-serif" font-size="13">SAMOSTATNÁ DLAŽDICA · NIE PUZZLE</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="Instagram grid: produktový dôkaz, vysvetľujúci diagram, ľudský moment."><rect width="1080" height="1080" fill="#080807"/>${tiles}</svg>`;
}

async function screenshotSvg(browser: Browser, svg: string, width: number, height: number): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.setContent(svgDocument(width, height, svg), { waitUntil: 'load' });
    return await page.screenshot({ type: 'png', animations: 'disabled' });
  } finally {
    await page.close();
  }
}

async function renderSvgPng(svg: string, width: number, height: number): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    return await screenshotSvg(browser, svg, width, height);
  } finally {
    await browser.close();
  }
}

export type LinkedInCoverMeasurement = {
  fontsLoaded: boolean;
  headline: { fontFamily: string; bounds: { left: number; right: number; top: number; bottom: number } };
  supportingCopy: { fontFamily: string; bounds: { left: number; right: number; top: number; bottom: number } };
};

/** Measured against the rendered SVG rather than trusting safe-zone metadata alone. */
export async function measureLinkedInCover(): Promise<LinkedInCoverMeasurement> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 4200, height: 700 }, deviceScaleFactor: 1 });
    await page.setContent(svgDocument(4200, 700, renderCoverSvg('linkedin')), { waitUntil: 'load' });
    return await page.evaluate(async () => {
      await document.fonts.ready;
      const headline = document.getElementById('linkedin-headline') as unknown as SVGGraphicsElement | null;
      const supportingCopy = document.getElementById('linkedin-support') as unknown as SVGGraphicsElement | null;
      if (!headline || !supportingCopy) throw new Error('Missing LinkedIn cover text element.');
      const headlineBox = headline.getBBox();
      const supportingCopyBox = supportingCopy.getBBox();
      return {
        fontsLoaded: document.fonts.check('700 90px "Playfair Display"') && document.fonts.check('500 28px "Inter"'),
        headline: { fontFamily: window.getComputedStyle(headline).fontFamily, bounds: { left: headlineBox.x, right: headlineBox.x + headlineBox.width, top: headlineBox.y, bottom: headlineBox.y + headlineBox.height } },
        supportingCopy: { fontFamily: window.getComputedStyle(supportingCopy).fontFamily, bounds: { left: supportingCopyBox.x, right: supportingCopyBox.x + supportingCopyBox.width, top: supportingCopyBox.y, bottom: supportingCopyBox.y + supportingCopyBox.height } },
      };
    });
  } finally {
    await browser.close();
  }
}

function ownedLogoSvg(): string {
  const source = readFileSync(OWNED_LOGO_PATH, 'utf8');
  const digest = createHash('sha256').update(source).digest('hex');
  if (digest !== RISE_LOGO_SOURCE.sha256) throw new Error('Owned Rise logo source hash does not match its recorded provenance.');
  return source;
}

/** Rasterizes the tracked source SVG; its path geometry is never reconstructed in code. */
export async function renderOwnedLogoPng(size: 32 | 320): Promise<Buffer> {
  const logo = ownedLogoSvg().replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);
  return renderSvgPng(logo, size, size);
}

function profileSvg(name: AssetName): string {
  const metadata = ASSET_METADATA[name];
  if (name === 'profile-master.png' || name === 'profile-32px.png') {
    return ownedLogoSvg().replace('<svg ', `<svg width="${metadata.width}" height="${metadata.height}" style="display:block" `);
  }
  if (name === 'linkedin-cover.png') return renderCoverSvg('linkedin');
  if (name === 'facebook-cover.png') return renderCoverSvg('facebook');
  return renderGridSvg();
}

async function renderProfilePngs(): Promise<Map<AssetName, Buffer>> {
  const browser = await chromium.launch({ headless: true });
  try {
    const rendered = new Map<AssetName, Buffer>();
    for (const name of Object.keys(ASSET_METADATA) as AssetName[]) {
      const metadata = ASSET_METADATA[name];
      rendered.set(name, await screenshotSvg(browser, profileSvg(name), metadata.width, metadata.height));
    }
    return rendered;
  } finally {
    await browser.close();
  }
}

export function readPngDimensions(path: string): { width: number; height: number } {
  const content = requirePng(path);
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

function requirePng(path: string): Buffer {
  // The synchronous helper intentionally has no network, credential, browser or profile side effect.
  const content = readFileSync(path);
  if (content.length < 24 || !content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Invalid PNG: ${path}`);
  return content;
}

function checklistMarkdown(manifest: RiseProfileManifest): string {
  const section = (platform: PlatformId, label: string) => {
    const profile = manifest.platforms[platform];
    const copy = [
      profile.tagline ? `### Tagline\n\n${profile.tagline}` : '',
      profile.about ? `### About\n\n${profile.about}` : '',
      profile.bio ? `### Bio\n\n${profile.bio}` : '',
      profile.intro ? `### Intro\n\n${profile.intro}` : '',
      profile.specialties ? `### Specialties\n\n${profile.specialties.map(item => `- ${item}`).join('\n')}` : '',
      profile.highlights ? `### Highlights\n\n${profile.highlights.map(item => `- ${item}`).join('\n')}` : '',
      `### Pripnuté príspevky\n\n${profile.pinnedPostBriefs.map(item => `- ${item}`).join('\n')}`,
      `### Odkazy s UTM\n\n${Object.entries(profile.links).map(([destination, url]) => `- ${destination}: ${url}`).join('\n')}`,
    ].filter(Boolean).join('\n\n');
    return `## ${label}\n\n- [ ] Nastavte názov: ${profile.nameField}\n- [ ] Nastavte kategóriu: ${profile.category}\n- [ ] Skontrolujte CTA: ${profile.cta}\n\n${copy}\n\n### Manuálne kroky\n\n${profile.manualChecklist.map(item => `- [ ] ${item}`).join('\n')}\n`;
  };
  return `# Rise.sk — manuálny profilový checklist\n\n${manifest.liveChangePolicy}\n\n## Spoločný základ\n\n- [ ] Potvrďte hlavný prísľub: ${manifest.promise}\n- [ ] Potvrďte sekundárnu vetu: ${manifest.secondarySentence}\n- [ ] Overte dostupnosť používateľského mena v poradí: ${manifest.handleFallbackOrder.join(', ')}.\n- [ ] Použite vlastnený SVG znak (${manifest.brandAsset.path}, SHA-256: ${manifest.brandAsset.sha256}) na čiernom podklade bez wordmarku.\n- [ ] Skontrolujte kontrast, kruhový orez a náhľad 32 px.\n- [ ] Skontrolujte UTM odkazy pred vložením.\n\n${section('linkedin', 'LinkedIn')}\n${section('instagram', 'Instagram')}\n${section('facebook', 'Facebook')}\n## Povinná manuálna brána\n\n- [ ] Človek schválil text, obrázky, orezy a odkazy.\n- [ ] Žiadna zmena nebola publikovaná, naplánovaná ani nahraná automaticky.\n`;
}

export type ProfilePackResult = {
  directory: string;
  files: Array<{ name: (typeof PROFILE_PACK_FILES)[number]; path: string }>;
  manifestHash: string;
  externalMutations: [];
};

export async function createProfilePack(outputDirectory = join(process.cwd(), 'data', 'profile-pack')): Promise<ProfilePackResult> {
  const directory = resolve(outputDirectory);
  const relativeToApproved = relative(APPROVED_CONTENT_ROOT, directory);
  if (directory === APPROVED_CONTENT_ROOT || (relativeToApproved && !relativeToApproved.startsWith(`..${sep}`) && relativeToApproved !== '..' && !isAbsolute(relativeToApproved))) {
    throw new Error('Profile pack output must stay outside the approved-content archive.');
  }
  await mkdir(directory, { recursive: true });
  const manifestJson = `${JSON.stringify(RISE_PROFILE_MANIFEST, null, 2)}\n`;
  const entries = Object.entries(ASSET_METADATA) as Array<[AssetName, (typeof ASSET_METADATA)[AssetName]]>;
  const renderedPngs = await renderProfilePngs();
  await Promise.all(entries.map(async ([name, metadata]) => {
    const path = join(directory, name);
    await writeFile(path, renderedPngs.get(name)!);
    const dimensions = readPngDimensions(path);
    const file = await stat(path);
    if (dimensions.width !== metadata.width || dimensions.height !== metadata.height || file.size === 0 || !metadata.safeZoneNote.trim()) {
      throw new Error(`Profile pack validation failed for ${name}.`);
    }
  }));
  await Promise.all([
    writeFile(join(directory, 'profile-manifest.json'), manifestJson, 'utf8'),
    writeFile(join(directory, 'profile-checklist.md'), checklistMarkdown(RISE_PROFILE_MANIFEST), 'utf8'),
  ]);
  const [storedManifest, storedChecklist] = await Promise.all([
    readFile(join(directory, 'profile-manifest.json'), 'utf8'),
    readFile(join(directory, 'profile-checklist.md'), 'utf8'),
  ]);
  if (storedManifest !== manifestJson || !storedChecklist.includes(RISE_PROFILE_MANIFEST.promise) || !storedChecklist.includes('manuálne')) {
    throw new Error('Profile pack UTF-8 validation failed.');
  }
  return {
    directory,
    files: PROFILE_PACK_FILES.map(name => ({ name, path: join(directory, name) })),
    manifestHash: createHash('sha256').update(manifestJson).digest('hex'),
    externalMutations: [],
  };
}
