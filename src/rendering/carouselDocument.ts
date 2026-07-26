import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import type { PostConcept } from '@/domain/schemas';
import { fallbackVisualLayout } from '@/visuals/carouselTemplates';

const THEME_LABELS = {
  'product-proof': 'DÔKAZ PRODUKTU',
  'decision-education': 'PRAKTICKÉ ROZHODNUTIE',
  'growth-system': 'SYSTÉM RASTU',
  'people-process': 'AKO PRACUJEME',
  'signal-noise': 'SIGNÁL A ŠUM',
} as const;

const BRAND_ROOT = resolve(process.cwd(), 'public-site', 'public', 'brand');

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function embeddedAsset(fileName: string, mime: string): string {
  return `data:${mime};base64,${readFileSync(resolve(BRAND_ROOT, fileName)).toString('base64')}`;
}

function imageMarkup(
  imagePath: string | undefined,
  alt: string,
  layout: string,
  fit: 'contain' | 'cover' = 'cover',
  focalPoint = { x: 50, y: 50 },
): string {
  if (!imagePath) {
    if (layout === 'proof') {
      return `
        <div class="proof-mark" aria-hidden="true">
          <span>VEREJNE OVERENÉ</span>
          <i></i>
        </div>
      `;
    }
    return `
      <div class="diagram" aria-hidden="true">
        <span class="diagram-path path-one"></span>
        <span class="diagram-path path-two"></span>
        <span class="diagram-node node-one"></span>
        <span class="diagram-node node-two"></span>
        <span class="diagram-node node-three"></span>
      </div>
    `;
  }
  const imageMimeTypes: Record<string, string> = {
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  const source =
    imagePath.startsWith('/') && existsSync(imagePath)
      ? `data:${
          imageMimeTypes[extname(imagePath).toLowerCase()] ??
          'application/octet-stream'
        };base64,${readFileSync(imagePath).toString('base64')}`
      : imagePath;
  return `<img class="visual-image" src="${escapeHtml(source)}" alt="${escapeHtml(
    alt,
  )}" style="object-fit:${fit};object-position:${focalPoint.x}% ${focalPoint.y}%;" />`;
}

function calloutMarkup(
  callouts:
    | readonly {
        label: string;
        anchor: { x: number; y: number };
      }[]
    | undefined,
): string {
  if (!callouts?.length) {
    return '';
  }
  return `<div class="callouts">${callouts
    .map(
      callout =>
        `<span class="callout" style="left:${callout.anchor.x}%;top:${callout.anchor.y}%;">${escapeHtml(
          callout.label,
        )}</span>`,
    )
    .join('')}</div>`;
}

export function createCarouselDocument(post: PostConcept): string {
  const logo = embeddedAsset('Rise_logo.svg', 'image/svg+xml');
  const interRegular = embeddedAsset('Inter-Regular.woff', 'font/woff');
  const interSemibold = embeddedAsset('Inter-SemiBold.woff', 'font/woff');
  const playfairRegular = embeddedAsset(
    'PlayfairDisplay-Regular.ttf',
    'font/ttf',
  );
  const playfairSemibold = embeddedAsset(
    'PlayfairDisplay-SemiBold.ttf',
    'font/ttf',
  );

  const slides = post.slides
    .map((slide, index) => {
      const layout =
        slide.visualLayout ?? fallbackVisualLayout(index, post.theme);
      const focalPoint = slide.crop?.focalPoint ?? { x: 50, y: 50 };
      const surface = slide.surface ?? 'canvas';
      const role = slide.role ?? (index === 0 ? 'cover' : 'closing');
      return `
        <article class="slide layout-${layout} surface-${surface} ${
          index === 0 ? 'cover-slide' : 'content-slide'
        }" data-slide="${index + 1}" data-layout="${layout}" data-role="${role}" data-template="${
          post.carouselTemplate ?? 'legacy'
        }" aria-label="${escapeHtml(
          slide.alt,
        )}">
          <header>
            <div class="wordmark">
              <img data-rise-logo="official" data-source="Rise_logo.svg" src="${logo}" alt="" />
              <span>rise.sk</span>
            </div>
            <span class="theme">${THEME_LABELS[post.theme]}</span>
          </header>
          <main>
            <section class="copy">
              <span class="eyebrow">${escapeHtml(slide.eyebrow)}</span>
              <h1>${escapeHtml(slide.title)}</h1>
              <p>${escapeHtml(slide.body)}</p>
            </section>
            <section class="visual">
              ${imageMarkup(
                slide.imagePath,
                slide.alt,
                layout,
                slide.assetFit,
                focalPoint,
              )}
              ${calloutMarkup(slide.callouts)}
            </section>
          </main>
          <footer>
            <span class="footer-label">${escapeHtml(post.title)}</span>
            <div class="progress" aria-label="Karta ${index + 1} z ${
              post.slides.length
            }">
              ${post.slides
                .map(
                  (_, progressIndex) =>
                    `<span class="${
                      progressIndex === index ? 'active' : ''
                    }"></span>`,
                )
                .join('')}
            </div>
            <span class="page">${String(index + 1).padStart(
              2,
              '0',
            )} / ${String(post.slides.length).padStart(2, '0')}</span>
          </footer>
        </article>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face { font-family: Inter; src: url("${interRegular}") format("woff"); font-weight: 400; font-display: block; }
      @font-face { font-family: Inter; src: url("${interSemibold}") format("woff"); font-weight: 600; font-display: block; }
      @font-face { font-family: "Playfair Display"; src: url("${playfairRegular}") format("truetype"); font-weight: 400; font-display: block; }
      @font-face { font-family: "Playfair Display"; src: url("${playfairSemibold}") format("truetype"); font-weight: 600; font-display: block; }
      @page { size: 1080px 1350px; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #080807; }
      body { width: 1080px; font-family: Inter, sans-serif; color: #F8F4EC; }
      .slide {
        width: 1080px;
        height: 1350px;
        overflow: hidden;
        position: relative;
        display: grid;
        grid-template-rows: 108px 1fr 92px;
        padding: 0 84px;
        isolation: isolate;
        background:
          linear-gradient(128deg, rgb(218 181 73 / .055), transparent 30%),
          #080807;
        page-break-after: always;
      }
      .slide:last-child { page-break-after: auto; }
      .surface-surface { background: #0C0C0C; }
      .surface-media { background: linear-gradient(145deg, #141414, #080807 72%); }
      header, footer { display: flex; align-items: center; justify-content: space-between; }
      header { border-bottom: 1px solid #2B2924; }
      .wordmark { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 600; letter-spacing: -.01em; }
      .wordmark img { width: 34px; height: 34px; display: block; object-fit: contain; }
      .theme, .eyebrow, .footer-label, .page {
        color: #DBC28C;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      main {
        display: grid;
        grid-template-columns: minmax(0, 1.04fr) minmax(0, .96fr);
        gap: 54px;
        align-items: center;
        min-height: 0;
      }
      .copy { position: relative; z-index: 2; }
      .eyebrow { display: block; margin-bottom: 30px; }
      h1 {
        max-width: 650px;
        margin: 0;
        font-family: "Playfair Display", serif;
        font-size: 60px;
        font-weight: 400;
        line-height: 1.2;
        letter-spacing: -.04em;
        text-wrap: balance;
      }
      p {
        max-width: 620px;
        margin: 34px 0 0;
        color: #D5D3D0;
        font-size: 34px;
        line-height: 1.3;
        letter-spacing: -.015em;
        text-wrap: pretty;
      }
      .visual {
        min-height: 570px;
        position: relative;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px solid #2B2924;
        border-radius: 26px;
        background: #0C0C0C;
      }
      .visual::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        box-shadow: inset 0 0 0 1px rgb(248 244 236 / .025);
      }
      .visual-image {
        width: 100%;
        height: 100%;
        position: absolute;
        inset: 0;
        display: block;
      }
      .slide.cover-slide main, .layout-app-hero main { grid-template-columns: 1fr; align-content: center; }
      .cover-slide .copy, .layout-app-hero .copy { max-width: 760px; padding-top: 34px; }
      .cover-slide h1 { max-width: 800px; font-size: 92px; line-height: 1.2; }
      .cover-slide p { max-width: 700px; font-size: 32px; }
      .slide.cover-slide .visual, .layout-app-hero .visual {
        min-height: 470px;
        height: 470px;
        margin-top: 36px;
      }
      .layout-calm-text main { grid-template-columns: minmax(0, 760px); }
      .layout-calm-text .visual { display: none; }
      .layout-full-bleed main, .layout-ui-focus main { grid-template-columns: 310px minmax(0, 1fr); }
      .layout-full-bleed .visual, .layout-ui-focus .visual { min-height: 760px; }
      .layout-split-detail main { grid-template-columns: .82fr 1.18fr; }
      .layout-app-flow main, .layout-diagram main { grid-template-columns: .85fr 1.15fr; }
      .layout-proof main { grid-template-columns: minmax(0, 1fr); }
      .layout-proof .copy { max-width: 780px; }
      .layout-proof .visual { min-height: 360px; margin-top: 32px; }
      .diagram { width: 78%; height: 290px; position: relative; }
      .diagram::before {
        content: "";
        position: absolute;
        left: 8%;
        right: 8%;
        top: calc(50% - 1px);
        height: 2px;
        background: linear-gradient(90deg, #2B2924, #DAB549, #2B2924);
      }
      .diagram-path {
        position: absolute;
        height: 1px;
        left: 20%;
        right: 20%;
        top: 50%;
        background: #DAB549;
      }
      .path-one { transform: rotate(31deg); }
      .path-two { transform: rotate(-31deg); }
      .diagram-node {
        position: absolute;
        width: 46px;
        height: 46px;
        border: 1px solid #DAB549;
        border-radius: 50%;
        background: #141414;
        box-shadow: 0 0 0 10px rgb(218 181 73 / .05);
      }
      .node-one { left: 4%; top: calc(50% - 23px); }
      .node-two { left: calc(50% - 23px); top: calc(50% - 23px); background: #DAB549; }
      .node-three { right: 4%; top: calc(50% - 23px); }
      .proof-mark {
        width: min(680px, 82%);
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 28px;
      }
      .proof-mark span {
        color: #DBC28C;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: .15em;
      }
      .proof-mark i {
        height: 1px;
        position: relative;
        background: linear-gradient(90deg, #DAB549, #2B2924);
      }
      .proof-mark i::after {
        content: "";
        width: 18px;
        height: 18px;
        position: absolute;
        right: 0;
        top: -9px;
        border: 1px solid #DAB549;
        border-radius: 50%;
        background: #0C0C0C;
      }
      .callouts { position: absolute; inset: 0; pointer-events: none; }
      .callout {
        position: absolute;
        max-width: 190px;
        padding: 9px 12px;
        transform: translate(-50%, -50%);
        color: #1A1710;
        border-radius: 999px;
        background: #F8F4EC;
        box-shadow: 0 8px 28px rgb(0 0 0 / .35);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.15;
        white-space: nowrap;
      }
      .callout::before {
        content: "";
        position: absolute;
        width: 8px;
        height: 8px;
        left: 50%;
        bottom: -4px;
        transform: translateX(-50%) rotate(45deg);
        background: #F8F4EC;
      }
      footer { border-top: 1px solid #2B2924; }
      .footer-label { max-width: 440px; overflow: hidden; color: #9B978E; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
      .progress { display: flex; gap: 8px; }
      .progress span { width: 24px; height: 3px; background: #2B2924; }
      .progress span.active { background: #DAB549; }
      .page { min-width: 74px; text-align: right; font-variant-numeric: tabular-nums; }
    </style>
  </head>
  <body>${slides}</body>
</html>`;
}
