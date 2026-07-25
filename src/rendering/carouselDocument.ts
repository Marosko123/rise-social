import { pathToFileURL } from 'node:url';

import type { PostConcept } from '@/domain/schemas';
import { fallbackVisualLayout } from '@/visuals/carouselTemplates';

const THEME_LABELS = {
  'product-proof': 'DÔKAZ PRODUKTU',
  'decision-education': 'PRAKTICKÉ ROZHODNUTIE',
  'growth-system': 'SYSTÉM RASTU',
  'people-process': 'AKO PRACUJEME',
  'signal-noise': 'SIGNÁL A ŠUM',
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function imageMarkup(imagePath: string | undefined, alt: string): string {
  if (!imagePath) {
    return `
      <div class="diagram" aria-hidden="true">
        <span class="orbit orbit-one"></span>
        <span class="orbit orbit-two"></span>
        <span class="signal"></span>
      </div>
    `;
  }
  const source = imagePath.startsWith('/') ? pathToFileURL(imagePath).href : imagePath;
  return `<img class="visual-image" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" />`;
}

export function createCarouselDocument(post: PostConcept): string {
  const slides = post.slides
    .map(
      (slide, index) => {
        const layout = slide.visualLayout ?? fallbackVisualLayout(index, post.theme);
        return `
        <article class="slide layout-${layout} ${index === 0 ? 'cover-slide' : 'content-slide'}" data-slide="${index + 1}" data-layout="${layout}" aria-label="${escapeHtml(slide.alt)}">
          <div class="ambient"></div>
          <header>
            <div class="wordmark"><span class="rise-mark">R</span><span>RISE.SK</span></div>
            <span class="theme">${THEME_LABELS[post.theme]}</span>
          </header>
          <main>
            <section class="copy">
              <span class="eyebrow">${escapeHtml(slide.eyebrow)}</span>
              <h1>${escapeHtml(slide.title)}</h1>
              <p>${escapeHtml(slide.body)}</p>
            </section>
            <section class="visual">${imageMarkup(slide.imagePath, slide.alt)}</section>
          </main>
          <footer>
            <span class="footer-label">${escapeHtml(post.title)}</span>
            <div class="progress" aria-label="Karta ${index + 1} z ${post.slides.length}">
              ${post.slides
                .map(
                  (_, progressIndex) =>
                    `<span class="${progressIndex === index ? 'active' : ''}"></span>`,
                )
                .join('')}
            </div>
            <span class="page">${String(index + 1).padStart(2, '0')} / ${String(post.slides.length).padStart(2, '0')}</span>
          </footer>
        </article>
      `;
      },
    )
    .join('');

  return `<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 1080px 1350px; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #080807; }
      body { width: 1080px; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #F8F4EC; }
      .slide {
        width: 1080px;
        height: 1350px;
        overflow: hidden;
        position: relative;
        display: grid;
        grid-template-rows: 110px 1fr 96px;
        padding: 0 84px;
        isolation: isolate;
        background:
          radial-gradient(circle at 82% 16%, rgb(218 181 73 / 0.16), transparent 31%),
          radial-gradient(circle at 15% 92%, rgb(106 76 26 / 0.15), transparent 35%),
          linear-gradient(145deg, #141414 0%, #0C0C0C 58%, #080807 100%);
        page-break-after: always;
      }
      .slide:last-child { page-break-after: auto; }
      .slide::before {
        content: "";
        position: absolute;
        inset: 22px;
        border: 1px solid #2B2924;
        border-radius: 34px;
        z-index: -1;
      }
      .ambient {
        position: absolute;
        width: 460px;
        height: 460px;
        right: -210px;
        top: 360px;
        border: 1px solid rgb(218 181 73 / 0.2);
        border-radius: 50%;
        box-shadow: 0 0 100px rgb(218 181 73 / 0.06);
        z-index: -1;
      }
      header, footer { display: flex; align-items: center; justify-content: space-between; }
      header { border-bottom: 1px solid #2B2924; }
      .wordmark { display: flex; align-items: center; gap: 13px; font-size: 17px; font-weight: 720; letter-spacing: 0.18em; }
      .rise-mark {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #1A1710;
        background: linear-gradient(135deg, #FEFBD8, #DAB549 55%, #8B6723);
        letter-spacing: 0;
        font-family: Georgia, serif;
        font-size: 23px;
      }
      .theme, .eyebrow, .footer-label, .page {
        color: #DBC28C;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.16em;
      }
      main { display: grid; grid-template-columns: 1.16fr 0.84fr; gap: 54px; align-items: center; min-height: 0; }
      .copy { padding-bottom: 44px; }
      .eyebrow { display: block; margin-bottom: 38px; }
      h1 {
        max-width: 610px;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 60px;
        font-weight: 500;
        line-height: 0.98;
        letter-spacing: -0.045em;
        text-wrap: balance;
      }
      p {
        max-width: 610px;
        margin: 42px 0 0;
        color: #D5D3D0;
        font-size: 36px;
        line-height: 1.34;
        letter-spacing: -0.018em;
        text-wrap: pretty;
      }
      .visual {
        min-height: 560px;
        position: relative;
        display: grid;
        place-items: center;
        border: 1px solid #2B2924;
        border-radius: 32px;
        overflow: hidden;
        background: linear-gradient(160deg, rgb(218 181 73 / 0.1), rgb(12 12 12 / 0.4));
      }
      .visual-image { width: 100%; height: 100%; object-fit: cover; }
      .cover-slide h1 { font-size: 88px; max-width: 720px; }
      .cover-slide main { grid-template-columns: 1fr; }
      .cover-slide .visual { min-height: 420px; max-height: 520px; }
      .layout-calm-text main { grid-template-columns: 1fr; }
      .layout-calm-text .visual { display: none; }
      .layout-full-bleed .visual { min-height: 640px; }
      .layout-diagram .visual { background: linear-gradient(160deg, rgb(218 181 73 / .16), rgb(12 12 12 / .7)); }
      .layout-split-detail main { grid-template-columns: .9fr 1.1fr; }
      .diagram { width: 310px; height: 310px; position: relative; }
      .orbit, .signal { position: absolute; border-radius: 50%; }
      .orbit { inset: 0; border: 1px solid rgb(219 194 140 / 0.45); }
      .orbit-one { transform: rotate(17deg) scaleY(0.5); }
      .orbit-two { transform: rotate(-43deg) scaleX(0.52); }
      .signal {
        width: 84px;
        height: 84px;
        left: 113px;
        top: 113px;
        background: radial-gradient(circle at 35% 30%, #FEFBD8, #DAB549 42%, #6A4C1A);
        box-shadow: 0 0 65px rgb(218 181 73 / 0.42);
      }
      footer { border-top: 1px solid #2B2924; }
      .footer-label { max-width: 440px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #9B978E; font-size: 12px; }
      .progress { display: flex; gap: 8px; }
      .progress span { width: 25px; height: 3px; background: #2B2924; }
      .progress span.active { background: #DAB549; }
      .page { min-width: 62px; text-align: right; font-variant-numeric: tabular-nums; }
    </style>
  </head>
  <body>${slides}</body>
</html>`;
}
