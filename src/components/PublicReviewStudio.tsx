'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Platform, Theme } from '@/domain/schemas';
import type { PublicReviewModel } from '@/public/publicReviewModel';
import { RiseLogoMark } from '@/components/RiseLogoMark';

interface PublicReviewStudioProps {
  model: PublicReviewModel;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const THEME_LABELS: Record<Theme, string> = {
  'product-proof': 'Dôkaz produktu',
  'decision-education': 'Praktické rozhodnutie',
  'growth-system': 'Systém rastu',
  'people-process': 'Ako pracujeme',
  'signal-noise': 'Signál a šum',
};

const GRID_CONTEXT_TILES = [
  ['HISTÓRIA PROFILU', 'Publikovanú históriu treba najprv importovať', 'samostatná karta'],
  ['PRODUKTOVÝ DÔKAZ', 'Reálne UI alebo potvrdený diagram', 'vlastnený podklad · 4:5'],
  ['ROZHODOVACÍ RÁMEC', 'Jedna otázka, dve možnosti a kompromis', 'originálny diagram · 4:5'],
  ['ĽUDSKÝ MOMENT', 'Skutočná fotografia alebo nahrávka', 'capture required · bez siluety'],
  ['SIGNÁL A ŠUM', 'Fakt, neistota a dátum kontroly', 'zdrojovaný formát'],
  ['SYSTÉM RASTU', 'Produkt, web, obsah a meranie', 'pokojný diagram'],
] as const;

function formatSchedule(value: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bratislava',
  }).format(new Date(value));
}

export function PublicReviewStudio({
  model,
}: PublicReviewStudioProps) {
  const [postIndex, setPostIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const post = model.posts[postIndex];
  const slide = post.slides[slideIndex];
  const variant = post.platforms[platform];
  const postCount = model.posts.length;
  const pillarCount = new Set(model.posts.map(item => item.theme)).size;
  const variantCount = postCount * 3;
  const sources = useMemo(
    () =>
      model.sources.filter(source =>
        post.sourceIds.includes(source.id),
      ),
    [model.sources, post.sourceIds],
  );
  const claims = useMemo(
    () =>
      model.claims.filter(claim =>
        post.claimIds.includes(claim.id),
      ),
    [model.claims, post.claimIds],
  );
  const contextTileCount = Math.max(0, 9 - postCount);

  function selectPost(index: number) {
    setPostIndex(index);
    setSlideIndex(0);
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Rise Social Studio">
          <RiseLogoMark className="brand-mark" />
          <span>
            <strong>Rise Social</strong>
            <small>Studio</small>
          </span>
        </Link>
        <div className="topbar-meta">
          <span className="status-dot status-draft"></span>
          <span>Verejné demo</span>
          <span className="topbar-separator"></span>
          <Link href="/content-plan">Content plán</Link>
        </div>
      </header>

      <div
        className="draft-state public-readonly-state"
        role="status"
        aria-label="Verejná read-only ukážka"
      >
        <span>Verejná read-only ukážka · nič nie je publikované</span>
        <small>
          Táto prezentácia nemení obsah ani profily a nevykonáva žiadne
          publikačné akcie.
        </small>
      </div>

      <section className="intro">
        <div>
          <p className="kicker">BEZPEČNÁ DEMO KONTROLA</p>
          <h1>{postCount}-príspevkový balík</h1>
          <p className="intro-copy">
            {pillarCount} témy, {variantCount} verzií a verejné podklady. Ukážka
            vysvetľuje proces; nič neposiela na sociálne siete.
          </p>
        </div>
        <div className="run-summary">
          <div><strong>{pillarCount}</strong><span>témy</span></div>
          <div><strong>{variantCount}</strong><span>verzií</span></div>
          <div>
            <strong>
              {model.posts.reduce(
                (sum, item) => sum + item.slides.length,
                0,
              )}
            </strong>
            <span>kariet</span>
          </div>
        </div>
      </section>

      <nav className="post-tabs" aria-label="Príspevky" role="tablist">
        {model.posts.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={postIndex === index}
            className={postIndex === index ? 'active' : ''}
            onClick={() => selectPost(index)}
          >
            <span>0{index + 1}</span>
            <strong>{item.title}</strong>
            <small>{THEME_LABELS[item.theme]}</small>
          </button>
        ))}
      </nav>

      <section className="review-grid">
        <div className="preview-column">
          <div className="section-label">
            <span>Karusel</span>
            <span>{slideIndex + 1} / {post.slides.length}</span>
          </div>
          <article
            className="carousel-preview"
            style={
              slide.imagePath
                ? {
                    '--slide-image': `url("${slide.imagePath}")`,
                  } as React.CSSProperties
                : undefined
            }
          >
            <div className="preview-image"></div>
            <div className="preview-wash"></div>
            <div className="preview-head">
              <RiseLogoMark className="preview-logo" />
              <span>{THEME_LABELS[post.theme]}</span>
            </div>
            <div className="preview-copy">
              <span>{slide.eyebrow}</span>
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
            </div>
            <div className="preview-foot">
              <span>RISE.SK</span>
              <span>
                {String(slideIndex + 1).padStart(2, '0')} /{' '}
                {String(post.slides.length).padStart(2, '0')}
              </span>
            </div>
          </article>
          <div className="carousel-controls">
            <button
              aria-label="Predchádzajúca karta"
              onClick={() => setSlideIndex(index => Math.max(0, index - 1))}
              disabled={slideIndex === 0}
            >
              ←
            </button>
            <div>
              {post.slides.map((item, index) => (
                <button
                  key={item.id}
                  aria-label={`Karta ${index + 1}`}
                  className={index === slideIndex ? 'active' : ''}
                  onClick={() => setSlideIndex(index)}
                ></button>
              ))}
            </div>
            <button
              aria-label="Nasledujúca karta"
              onClick={() =>
                setSlideIndex(index =>
                  Math.min(post.slides.length - 1, index + 1),
                )
              }
              disabled={slideIndex === post.slides.length - 1}
            >
              →
            </button>
          </div>
        </div>

        <div className="details-column">
          <div className="platform-switch" role="group" aria-label="Platforma">
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map(item => (
              <button
                key={item}
                className={platform === item ? 'active' : ''}
                onClick={() => setPlatform(item)}
              >
                {PLATFORM_LABELS[item]}
              </button>
            ))}
          </div>

          <article className="caption-card">
            <div className="caption-head">
              <span>Text príspevku</span>
              <span>{variant.caption.length} znakov</span>
            </div>
            <p>{variant.caption}</p>
            <div className="schedule-line public-schedule-line">
              <span>Orientačný čas pre {PLATFORM_LABELS[platform]}</span>
              <small>{formatSchedule(variant.scheduledFor)}</small>
            </div>
          </article>

          <article className="alt-card">
            <div className="caption-head">
              <span>Alternatívny text</span>
              <span>A11Y</span>
            </div>
            <p>{variant.altText}</p>
          </article>

          <article className="source-card">
            <div className="caption-head">
              <span>Overené zdroje</span>
              <span>{sources.length}</span>
            </div>
            {sources.map(source => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                <span className="source-icon">↗</span>
                <span>
                  <strong>{source.title}</strong>
                  <small>{source.claim}</small>
                </span>
              </a>
            ))}
          </article>

          <article className="claim-card">
            <div className="caption-head">
              <span>Dôkazy tvrdení</span>
              <span>{claims.length}</span>
            </div>
            {claims.map(claim => (
              <div key={claim.id} className="claim-row">
                <strong>{claim.id}</strong>
                <p>{claim.claim}</p>
                <small>
                  {claim.evidence} · overené{' '}
                  {new Date(claim.checkedAt).toLocaleDateString('sk-SK')}
                </small>
              </div>
            ))}
          </article>

          <article className="claim-card">
            <div className="caption-head">
              <span>Verejné kontrolné zásady</span>
              <span>READ-ONLY</span>
            </div>
            <div className="checkpoint-list">
              <div>
                <span className="checkpoint-state is-pass">PASS</span>
                <strong>Verejné zdroje</strong>
                <small>Každé zobrazené tvrdenie má dohľadateľný podklad.</small>
              </div>
              <div>
                <span className="checkpoint-state is-waiting">LOKÁLNE</span>
                <strong>Schválenie a publikovanie</strong>
                <small>Rozhodnutie a interné dôkazy zostávajú mimo Pages.</small>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid-section">
        <div>
          <p className="kicker">VIZUÁLNY SYSTÉM</p>
          <h2>Instagram grid</h2>
          <p>
            Každý príspevok funguje samostatne. Spolu vytvárajú pokojný,
            opakovateľný rytmus.
          </p>
        </div>
        <div className="instagram-grid" aria-label="Náhľad Instagram gridu">
          {[...model.posts].reverse().map((item, index) => (
            <div
              key={item.id}
              className={`grid-tile planned tile-${item.theme}`}
            >
              <small>{String(postCount - index).padStart(2, '0')}</small>
              <strong>{item.title}</strong>
              <em>
                {THEME_LABELS[item.theme]} · {item.visualKind.replaceAll('-', ' ')}
              </em>
            </div>
          ))}
          {GRID_CONTEXT_TILES.slice(0, contextTileCount).map(
            ([eyebrow, title, detail], index) => (
              <div
                aria-label={`Kontextová karta ${index + 1}: ${title}`}
                key={title}
                className="grid-tile existing"
              >
                <small>{eyebrow}</small>
                <strong>{title}</strong>
                <em>{detail}</em>
              </div>
            ),
          )}
        </div>
      </section>

      <section
        className="platform-preview-section"
        aria-label="Platformové vizuálne náhľady"
      >
        <article className="linkedin-document-preview">
          <div>
            <p className="kicker">B2B DOKUMENT</p>
            <h2>LinkedIn dokument</h2>
            <p>
              Flattenované strany používajú rovnaký 1080 × 1350 master a
              zostávajú čitateľné samostatne.
            </p>
          </div>
          <div className="document-pages" aria-label="Náhľad strán LinkedIn PDF">
            {post.slides.map((documentSlide, index) => (
              <div key={documentSlide.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{documentSlide.title}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="facebook-crop-preview">
          <div>
            <p className="kicker">ZROZUMITEĽNÝ VÝREZ</p>
            <h2>Facebook crop</h2>
            <p>
              Jeden hlavný obrázok alebo najviac tri zoradené obrázky s kratším
              textom.
            </p>
          </div>
          <div className="facebook-crop-frame">
            <span>1.91 : 1 bezpečný náhľad</span>
            <strong>{post.title}</strong>
            <small>
              {post.platforms.facebook.caption.length} znakov ·{' '}
              {post.slides[0].alt}
            </small>
          </div>
        </article>
      </section>

      <section className="approval-panel public-readonly-panel">
        <div>
          <p className="kicker">VEREJNÁ PREZENTÁCIA</p>
          <h2>Riadenie obsahu zostáva iba v lokálnom štúdiu</h2>
          <p>
            Verejná stránka ukazuje plán, podklady a kontrolný proces bez
            vzdialenej administrácie.
          </p>
        </div>
        <Link className="public-plan-link" href="/content-plan">
          Otvoriť 90-dňový plán →
        </Link>
      </section>
    </main>
  );
}
