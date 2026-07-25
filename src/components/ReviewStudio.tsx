'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ContentRun, Platform, ReviewReport } from '@/domain/schemas';

interface ReviewStudioProps {
  initialRun: ContentRun;
  publishingReady: boolean;
  mode?: 'local-interactive' | 'public-readonly';
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const THEME_LABELS = {
  'product-proof': 'Dôkaz produktu',
  'decision-education': 'Praktické rozhodnutie',
  'growth-system': 'Systém rastu',
  'people-process': 'Ako pracujeme',
  'signal-noise': 'Signál a šum',
} as const;

const GRID_CONTEXT_TILES = [
  {
    eyebrow: 'HISTÓRIA PROFILU',
    title: 'Publikovanú históriu treba najprv importovať',
    detail: 'bez vizuálu · samostatná karta',
  },
  {
    eyebrow: 'PRODUKTOVÝ DÔKAZ',
    title: 'Reálne UI alebo schválený diagram',
    detail: 'vlastnený podklad · 4:5',
  },
  {
    eyebrow: 'ROZHODOVACÍ RÁMEC',
    title: 'Jedna otázka, dve možnosti a kompromis',
    detail: 'originálny diagram · 4:5',
  },
  {
    eyebrow: 'ĽUDSKÝ MOMENT',
    title: 'Skutočná fotografia alebo nahrávka',
    detail: 'capture required · bez siluety',
  },
  {
    eyebrow: 'SIGNÁL A ŠUM',
    title: 'Fakt, neistota a dátum kontroly',
    detail: 'zdrojovaný formát · bez AI klišé',
  },
  {
    eyebrow: 'SYSTÉM RASTU',
    title: 'Produkt, web, obsah a meranie',
    detail: 'pokojný diagram · samostatná karta',
  },
  {
    eyebrow: 'VNÚTRI VÝVOJA',
    title: 'Tok, detail a dôležitý kompromis',
    detail: 'verejná architektúra · bez kódu na efekt',
  },
  {
    eyebrow: 'ĎALŠÍ KROK',
    title: 'Jasná otázka pre kupujúceho',
    detail: 'pokojný text · jeden cieľ',
  },
] as const;

function campaignModeLabel(mode: 'single' | 'auto' | 'campaign'): string {
  if (mode === 'single') return 'jeden post';
  if (mode === 'campaign') return 'mini-kampaň';
  return 'automatický režim';
}

function postCountLabel(count: number): string {
  if (count === 1) return '1 príspevok';
  if (count <= 4) return `${count} príspevky`;
  return `${count} príspevkov`;
}

function formatSchedule(value: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bratislava',
  }).format(new Date(value));
}

function scheduleInputValue(value: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export function ReviewStudio({
  initialRun,
  publishingReady,
  mode = 'local-interactive',
}: ReviewStudioProps) {
  const isPublicReadonly = mode === 'public-readonly';
  const [run, setRun] = useState(initialRun);
  const [postIndex, setPostIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [busyAction, setBusyAction] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, string>>({});
  const [metricsValue, setMetricsValue] = useState(
    String(initialRun.qualifiedConversations),
  );

  const postCount = run.draft.posts.length;
  const pillarCount = new Set(run.draft.posts.map(item => item.theme)).size;
  const variantCount = run.draft.posts.reduce(
    (sum, item) => sum + Object.keys(item.platforms).length,
    0,
  );
  const themeLabel = pillarCount === 1 ? 'téma' : pillarCount <= 4 ? 'témy' : 'tém';
  const variantLabel = variantCount === 1 ? 'verzia' : variantCount <= 4 ? 'verzie' : 'verzií';

  const post = run.draft.posts[postIndex];
  const slide = post.slides[slideIndex];
  const variant = post.platforms[platform];
  const sources = useMemo(
    () => run.draft.sources.filter(source => post.sourceIds.includes(source.id)),
    [post.sourceIds, run.draft.sources],
  );
  const claims = useMemo(
    () => run.draft.claims.filter(claim => post.claimIds.includes(claim.id)),
    [post.claimIds, run.draft.claims],
  );
  const workflowContext = run.draft.workflowContext;
  const remainingGridTiles = Math.max(0, 9 - postCount);
  const reviewStages: Array<[string, ReviewReport | undefined]> = workflowContext
    ? [['Prvá kritika', workflowContext.firstCritique], ['Finálna validácia', workflowContext.finalValidation]]
    : [];
  const humanCheckpoints = [
    {
      label: 'Brief a risk gate',
      passed: Boolean(workflowContext?.editorialBrief),
      note: workflowContext?.editorialBrief
        ? 'Biznisový brief je uložený v schvaľovacom digeste.'
        : 'Brief čaká na doplnenie.',
    },
    {
      label: 'Práva a vizuálna QA',
      passed:
        (workflowContext?.assetRights.every(
          right => right.status === 'confirmed',
        ) ??
          false) &&
        (workflowContext?.visualQaFindings ?? []).every(
          finding => finding.status === 'pass',
        ),
      note: 'Práva, crop, redakcie a vizuálna kontrola sa posudzujú samostatne.',
    },
    {
      label: 'Nezávislá kontrola',
      passed: Boolean(
        workflowContext?.finalValidation?.approved &&
          workflowContext.finalValidation.scorecard.passed &&
          !workflowContext.finalValidation.blocker,
      ),
      note: 'Po autorskej revízii je povinný druhý nezávislý kontrolný krok.',
    },
    {
      label: 'Export',
      passed: Boolean(run.approval),
      note: run.approval
        ? 'Lokálny export bol schválený; príspevok stále nie je publikovaný.'
        : 'Čaká na ľudské schválenie exportu.',
    },
  ];
  const scheduleEditKey = `${post.id}:${platform}`;
  const scheduleValue =
    scheduleEdits[scheduleEditKey] ?? scheduleInputValue(variant.scheduledFor);

  async function approve(action: 'export' | 'stage' | 'schedule') {
    setBusyAction(action);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/runs/${run.id}/approve`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rise-social-action': 'approve',
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        run?: ContentRun;
        downloadUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? 'Schválenie sa nepodarilo.');
      }
      setRun(payload.run);
      setDownloadUrl(payload.downloadUrl);
      setNotice(
        action === 'export'
          ? 'Balík je schválený a pripravený na stiahnutie.'
          : action === 'stage'
            ? `${variantCount} Buffer konceptov je overených. Skontrolujte ich a potom balík znovu schváľte.`
          : 'Balík je schválený. Publikačný preflight pokračuje.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Akcia sa nepodarila.');
    } finally {
      setBusyAction(undefined);
    }
  }

  async function requestChanges() {
    if (!feedback.trim()) {
      setNotice('Napíšte, čo má agent upraviť.');
      return;
    }
    setBusyAction('changes');
    try {
      const response = await fetch(`/api/runs/${run.id}/changes`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rise-social-action': 'changes',
        },
        body: JSON.stringify({ feedback }),
      });
      const payload = (await response.json()) as { run?: ContentRun; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? 'Požiadavka zlyhala.');
      setRun(payload.run);
      setFeedbackOpen(false);
      setFeedback('');
      setNotice('Pripomienka je uložená. Spustite prípravu novej revízie.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Požiadavka zlyhala.');
    } finally {
      setBusyAction(undefined);
    }
  }

  async function saveSchedule() {
    const parsed = new Date(scheduleValue);
    if (Number.isNaN(parsed.getTime())) {
      setNotice('Zvolený čas nie je platný.');
      return;
    }
    setBusyAction('schedule-edit');
    try {
      const response = await fetch(`/api/runs/${run.id}/schedule`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rise-social-action': 'schedule-edit',
        },
        body: JSON.stringify({
          postId: post.id,
          platform,
          scheduledFor: parsed.toISOString(),
        }),
      });
      const payload = (await response.json()) as { run?: ContentRun; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? 'Čas sa nepodarilo uložiť.');
      setRun(payload.run);
      setNotice('Čas je uložený. Predchádzajúce schválenie bolo zrušené.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Čas sa nepodarilo uložiť.');
    } finally {
      setBusyAction(undefined);
    }
  }

  async function saveMetrics() {
    const count = Number(metricsValue);
    if (!Number.isInteger(count) || count < 0) {
      setNotice('Počet rozhovorov musí byť celé nezáporné číslo.');
      return;
    }
    setBusyAction('metrics');
    try {
      const response = await fetch(`/api/runs/${run.id}/metrics`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rise-social-action': 'metrics',
        },
        body: JSON.stringify({ qualifiedConversations: count }),
      });
      const payload = (await response.json()) as { run?: ContentRun; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error ?? 'Výsledok sa nepodarilo uložiť.');
      setRun(payload.run);
      setNotice('Výsledok je uložený bez zmeny schváleného obsahu.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Výsledok sa nepodarilo uložiť.');
    } finally {
      setBusyAction(undefined);
    }
  }

  function selectPost(index: number) {
    setPostIndex(index);
    setSlideIndex(0);
  }

  return (
    <main className="studio-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Rise Social Studio">
          <span className="brand-mark">R</span>
          <span>
            <strong>Rise Social</strong>
            <small>Studio</small>
          </span>
        </Link>
        <div className="topbar-meta">
          <span className={`status-dot status-${run.status}`}></span>
          <span>Revízia {run.revision}</span>
          <span className="topbar-separator"></span>
          <span>{run.draft.author === 'codex' ? 'Codex' : 'Claude'} → {run.draft.critic === 'codex' ? 'Codex' : 'Claude'}</span>
          <Link href="/content-plan">Content plán</Link>
          {run.boardLink && (
            <a href={run.boardLink.issueUrl} target="_blank" rel="noreferrer">
              {run.boardLink.provider === 'youtrack'
                ? `YouTrack ${run.boardLink.issueId}`
                : `GitHub Issue #${run.boardLink.issueNumber}`}
            </a>
          )}
        </div>
      </header>

      <div
        className={`draft-state${isPublicReadonly ? ' public-readonly-state' : ''}`}
        role="status"
        aria-label={
          isPublicReadonly ? 'Verejná read-only ukážka' : undefined
        }
      >
        <span>
          {isPublicReadonly
            ? 'Verejná read-only ukážka · nič nie je publikované'
            : 'Koncept · nie je publikované'}
        </span>
        <small>
          {isPublicReadonly
            ? 'Táto verejná prezentácia nič nemení, neschvaľuje, neexportuje ani neplánuje.'
            : 'Profilové zmeny, export, Buffer koncepty aj plánovanie majú vlastné ľudské schválenie.'}
        </small>
      </div>

      <section className="intro">
        <div>
          <p className="kicker">PRIPRAVENÉ NA KONTROLU</p>
          <h1>{postCount}-príspevkový balík</h1>
          <p className="intro-copy">
            {pillarCount} {themeLabel}, {variantCount} {variantLabel} a jeden jasný krok. Skontrolujte fakty, tón a obraz pred exportom.
          </p>
        </div>
        <div className="run-summary">
          <div><strong>{pillarCount}</strong><span>{themeLabel}</span></div>
          <div><strong>{variantCount}</strong><span>{variantLabel}</span></div>
          <div><strong>{run.draft.posts.reduce((sum, item) => sum + item.slides.length, 0)}</strong><span>kariet</span></div>
        </div>
      </section>

      {run.draft.warnings.length > 0 && (
        <aside className="warning-strip">
          <span>!</span>
          <p>{run.draft.warnings.join(' ')}</p>
        </aside>
      )}

      <nav className="post-tabs" aria-label="Príspevky" role="tablist">
        {run.draft.posts.map((item, index) => (
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
                ? { '--slide-image': `url("${slide.imagePath}")` } as React.CSSProperties
                : undefined
            }
          >
            <div className="preview-image"></div>
            <div className="preview-wash"></div>
            <div className="preview-head">
              <span className="preview-logo">R</span>
              <span>{THEME_LABELS[post.theme]}</span>
            </div>
            <div className="preview-copy">
              <span>{slide.eyebrow}</span>
              <h2>{slide.title}</h2>
              <p>{slide.body}</p>
            </div>
            <div className="preview-foot">
              <span>RISE.SK</span>
              <span>{String(slideIndex + 1).padStart(2, '0')} / {String(post.slides.length).padStart(2, '0')}</span>
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
              onClick={() => setSlideIndex(index => Math.min(post.slides.length - 1, index + 1))}
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
            {isPublicReadonly ? (
              <div className="schedule-line public-schedule-line">
                <span>Orientačný čas pre {PLATFORM_LABELS[platform]}</span>
                <small>{formatSchedule(variant.scheduledFor)}</small>
              </div>
            ) : (
              <div className="schedule-line">
                <label htmlFor="schedule-value">Čas pre {PLATFORM_LABELS[platform]}</label>
                <div>
                  <input
                    id="schedule-value"
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={event =>
                      setScheduleEdits(current => ({
                        ...current,
                        [scheduleEditKey]: event.target.value,
                      }))
                    }
                  />
                  <button
                    onClick={saveSchedule}
                    disabled={busyAction === 'schedule-edit'}
                  >
                    Uložiť čas
                  </button>
                </div>
                <small>{formatSchedule(variant.scheduledFor)}</small>
              </div>
            )}
          </article>

          <article className="alt-card">
            <div className="caption-head"><span>Alternatívny text</span><span>A11Y</span></div>
            <p>{variant.altText}</p>
          </article>

          <article className="source-card">
            <div className="caption-head"><span>Overené zdroje</span><span>{sources.length}</span></div>
            {sources.map(source => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                <span className="source-icon">↗</span>
                <span><strong>{source.title}</strong><small>{source.claim}</small></span>
              </a>
            ))}
          </article>

          <article className="claim-card">
            <div className="caption-head"><span>Dôkazy tvrdení</span><span>{claims.length}</span></div>
            {claims.map(claim => (
              <div key={claim.id} className="claim-row">
                <strong>{claim.id}</strong>
                <p>{claim.claim}</p>
                <small>{claim.evidence} · overené {new Date(claim.checkedAt).toLocaleDateString('sk-SK')}</small>
              </div>
            ))}
          </article>

          {workflowContext ? (
            <article className="claim-card">
              <div className="caption-head"><span>Schvaľovací digest</span><span>V2</span></div>
              <div className="claim-row">
                <strong>Biznisový brief</strong>
                <p>{workflowContext.editorialBrief?.businessFit ?? 'Doplňte pred schválením.'}</p>
                <small>{workflowContext.editorialBrief?.buyerQuestion ?? 'Bez buyer otázky.'}</small>
                <small>{workflowContext.editorialBrief?.risePerspective ?? 'Bez Rise perspektívy.'}</small>
                <small>{workflowContext.editorialBrief?.desiredAction ?? 'Bez požadovanej akcie.'}</small>
              </div>
              <div className="claim-row">
                <strong>Vizuály a práva</strong>
                <p>{workflowContext.visualDirections.length} smerov, {workflowContext.assetRights.length} záznamov práv, {workflowContext.cropsRedactions.length} cropov/redakcií.</p>
                <small>{workflowContext.generationProvenance.length > 0 ? 'Generatívna provenance je súčasťou digestu.' : 'Bez generatívneho vizuálu.'}</small>
              </div>
              {workflowContext.campaignDecision && (
                <div className="claim-row">
                  <strong>Rozsah</strong>
                  <p>
                    {campaignModeLabel(
                      workflowContext.campaignDecision.resolvedMode,
                    )}{' '}
                    ·{' '}
                    {postCountLabel(
                      workflowContext.campaignDecision.postCount,
                    )}
                  </p>
                  <small>{workflowContext.campaignDecision.reason}</small>
                </div>
              )}
              {workflowContext.claimLedger.map(claim => (
                <div className="claim-row" key={`ledger-${claim.id}`}>
                  <strong>{claim.id}</strong>
                  <p>{claim.evidence}</p>
                  <small>{claim.sourceUrl} · {claim.risk} · platné do {new Date(claim.expiresAt).toLocaleDateString('sk-SK')}</small>
                </div>
              ))}
              {workflowContext.visualDirections.map(direction => (
                <div className="claim-row" key={`direction-${direction.id ?? direction.assetIds.join('-')}`}>
                  <strong>{direction.id ?? 'Vizuálny smer'}</strong>
                  <p>{direction.layout} · {direction.assetIds.join(', ')}</p>
                  <small>Orez: {direction.crop}. Bezpečná zóna: {direction.safeZones.join(', ')}.</small>
                </div>
              ))}
              {workflowContext.assetRights.map(right => (
                <div className="claim-row" key={`rights-${right.assetId}`}>
                  <strong>{right.assetId}</strong>
                  <p>
                    Práva:{' '}
                    {right.status === 'confirmed'
                      ? 'potvrdené'
                      : 'treba potvrdiť'}
                  </p>
                  <small>{right.reference ?? 'Bez referencie práv.'}</small>
                </div>
              ))}
              {workflowContext.cropsRedactions.map(item => (
                <div className="claim-row" key={`crop-${item.assetId}`}>
                  <strong>{item.assetId}</strong>
                  <p>Orez: {item.crop}</p>
                  <small>{item.redactions.length > 0 ? `Redakcie: ${item.redactions.join(', ')}` : 'Bez redakcie.'}</small>
                </div>
              ))}
              {(workflowContext.visualQaFindings ?? []).length > 0 && (
                <div className="review-subhead">
                  <strong>Vizuálna QA</strong>
                  <span>
                    {
                      (workflowContext.visualQaFindings ?? []).filter(
                        finding => finding.status === 'pass',
                      ).length
                    }
                    /{(workflowContext.visualQaFindings ?? []).length} prešlo
                  </span>
                </div>
              )}
              {(workflowContext.visualQaFindings ?? []).map(finding => (
                <div
                  className="claim-row"
                  key={`visual-qa-${finding.visualDirectionId}`}
                >
                  <strong>
                    {finding.visualDirectionId} ·{' '}
                    {finding.status === 'pass'
                      ? 'PREŠLO'
                      : finding.status === 'fail'
                        ? 'NEPREŠLO'
                        : 'RUČNÁ KONTROLA'}
                  </strong>
                  <p>
                    {finding.findings.length > 0
                      ? finding.findings.join(' ')
                      : 'Bez automaticky zistených blokátorov.'}
                  </p>
                  <small>
                    Alternatívny text:{' '}
                    {finding.altTextPassed ? 'prešiel' : 'neprešiel'} · orez:{' '}
                    {finding.cropPassed ? 'prešiel' : 'neprešiel'} · ľudská vizuálna
                    kontrola:{' '}
                    {finding.humanInspectionRequired ? 'povinná' : 'nevyžaduje sa'}
                  </small>
                </div>
              ))}
              {workflowContext.generationProvenance.map(recipe => (
                <div className="claim-row" key={`generation-${recipe.visualDirectionId}`}>
                  <strong>Pôvod AI vizuálu: {recipe.model}</strong>
                  <p>{recipe.disclosure}</p>
                  <small>Schválené {formatSchedule(recipe.generationApprovedAt)} · referencie: {recipe.referenceAssetIds.join(', ') || 'žiadne'}.</small>
                </div>
              ))}
              {reviewStages.map(([label, review]) => review && (
                <details className="claim-row" key={label} open={review.blocker || !review.approved}>
                  <summary>
                    <strong>{label}</strong>{' '}
                    <span>
                      {review.blocker
                        ? 'BLOKUJE'
                        : review.approved && review.scorecard.passed
                          ? 'PREŠLO'
                          : 'TREBA UPRAVIŤ'}
                    </span>
                  </summary>
                  <p>
                    Schválené: {review.approved ? 'áno' : 'nie'} · blokuje:{' '}
                    {review.blocker ? 'áno' : 'nie'} · kontrola prešla:{' '}
                    {review.scorecard.passed ? 'áno' : 'nie'}.
                  </p>
                  <small>
                    Fakty {review.scorecard.factualAccuracy}/5 · Hlas {review.scorecard.voice}/5 · Špecifickosť {review.scorecard.specificity}/5 · Kontinuita {review.scorecard.continuity}/5 · Vizuál {review.scorecard.visualClarity}/5 · Biznisový prínos {review.scorecard.businessFit}/5
                  </small>
                  {review.issues.length > 0 ? <p>{review.issues.join(' ')}</p> : <p>Bez blokujúcich pripomienok.</p>}
                  {review.revisionInstructions && <p>{review.revisionInstructions}</p>}
                  {review.scorecard.notes.length > 0 && <small>{review.scorecard.notes.join(' ')}</small>}
                </details>
              ))}
              <div className="review-subhead">
                <strong>Ľudské checkpointy</strong>
                <span>bez autopublikovania</span>
              </div>
              <div className="checkpoint-list">
                {humanCheckpoints.map(checkpoint => (
                  <div key={checkpoint.label}>
                    <span
                      className={
                        checkpoint.passed
                          ? 'checkpoint-state is-pass'
                          : 'checkpoint-state is-waiting'
                      }
                    >
                      {checkpoint.passed ? 'PASS' : 'ČAKÁ'}
                    </span>
                    <strong>{checkpoint.label}</strong>
                    <small>{checkpoint.note}</small>
                  </div>
                ))}
              </div>
            </article>
          ) : (
            <article className="claim-card legacy-digest">
              <div className="caption-head">
                <span>Starší pracovný balík</span>
                <span>V1 kompatibilita</span>
              </div>
              <p>
                Tento čitateľný starší balík neobsahuje v2 schvaľovací digest.
                Pred exportom treba doplniť biznisový brief, ledger tvrdení,
                vizuálne práva, orezy, QA a nezávislú kontrolu.
              </p>
            </article>
          )}

          <article className="scorecard-card">
            <div className="caption-head">
              <span>Editorská kontrola</span>
              <span>{run.draft.scorecard.passed ? 'PREŠLO' : 'KONTROLA'}</span>
            </div>
            <div className="score-grid">
              {[
                ['Fakty', run.draft.scorecard.factualAccuracy],
                ['Hlas', run.draft.scorecard.voice],
                ['Špecifickosť', run.draft.scorecard.specificity],
                ['Kontinuita', run.draft.scorecard.continuity],
                ['Vizuál', run.draft.scorecard.visualClarity],
                ['Biznisový prínos', run.draft.scorecard.businessFit],
              ].map(([label, score]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>{score}/5</strong>
                </div>
              ))}
            </div>
          </article>

          {!isPublicReadonly && (
            <article className="outcome-card">
              <div>
                <div className="caption-head"><span>90-dňový výsledok</span><span>MANUÁLNE</span></div>
                <p>Počet relevantných rozhovorov, ktoré vznikli z tohto balíka.</p>
              </div>
              <div className="metric-control">
                <label htmlFor="qualified-conversations">Kvalifikované rozhovory</label>
                <input
                  id="qualified-conversations"
                  type="number"
                  min="0"
                  step="1"
                  value={metricsValue}
                  onChange={event => setMetricsValue(event.target.value)}
                />
                <button onClick={saveMetrics} disabled={busyAction === 'metrics'}>
                  Uložiť výsledok
                </button>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="grid-section">
        <div>
          <p className="kicker">VIZUÁLNY SYSTÉM</p>
          <h2>Instagram grid</h2>
          <p>Každý príspevok funguje samostatne. Spolu vytvárajú pokojný, opakovateľný rytmus.</p>
        </div>
        <div className="instagram-grid" aria-label="Náhľad Instagram gridu">
          {[...run.draft.posts].reverse().map((item, index) => (
            <div
              key={item.id}
              className={`grid-tile planned tile-${item.theme}`}
              style={
                item.slides[0].imagePath
                  ? { backgroundImage: `linear-gradient(180deg, transparent, rgb(8 8 7 / .92)), url("${item.slides[0].imagePath}")` }
                  : undefined
              }
            >
              <small>{String(postCount - index).padStart(2, '0')}</small>
              <strong>{item.title}</strong>
              <em>
                {item.carouselTemplate
                  ? item.carouselTemplate.replaceAll('-', ' ')
                  : THEME_LABELS[item.theme]}{' '}
                · {item.visualKind.replaceAll('-', ' ')}
              </em>
            </div>
          ))}
          {GRID_CONTEXT_TILES.slice(0, remainingGridTiles).map(
            (contextTile, index) => (
            <div
              aria-label={`Kontextová karta ${index + 1}: ${contextTile.title}`}
              key={contextTile.title}
              className="grid-tile existing"
            >
              <small>{contextTile.eyebrow}</small>
              <strong>{contextTile.title}</strong>
              <em>{contextTile.detail}</em>
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
              Flattenované strany používajú rovnaký 1080 × 1350 master.
              Každá strana musí zostať čitateľná samostatne.
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
              Jeden hlavný obrázok alebo najviac tri zoradené obrázky. Text je
              kratší než LinkedIn a nepreberá ho bez úpravy.
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

      {isPublicReadonly ? (
        <section className="approval-panel public-readonly-panel">
          <div>
            <p className="kicker">VEREJNÁ PREZENTÁCIA</p>
            <h2>Kontrola zostáva iba v lokálnom štúdiu</h2>
            <p>
              Táto stránka ukazuje plán, podklady a kontrolný proces. Neobsahuje
              schvaľovanie, export, plánovanie ani zber metrík.
            </p>
          </div>
          <Link className="public-plan-link" href="/content-plan">
            Otvoriť 90-dňový plán →
          </Link>
        </section>
      ) : (
        <section className="approval-panel">
          <div>
            <p className="kicker">POSLEDNÁ KONTROLA</p>
            <h2>Publikovať môže až schválený balík</h2>
            <p>Úprava textu, zdroja, obrázka, cropu, práv alebo provenance automaticky zruší toto schválenie.</p>
            {notice && <p className="notice" role="status">{notice}</p>}
            {downloadUrl && (
              <a className="download-link" href={downloadUrl}>Stiahnuť schválený ZIP ↗</a>
            )}
          </div>
          <div className="approval-actions">
            <button className="secondary-button" onClick={() => setFeedbackOpen(value => !value)}>
              Požiadať o úpravy
            </button>
            <button
              className="primary-button"
              disabled={Boolean(busyAction)}
              onClick={() => approve('export')}
            >
              {busyAction === 'export' ? 'Pripravujem…' : 'Schváliť a exportovať'}
            </button>
            {publishingReady && (
              <>
                {run.publishReceipt?.status !== 'drafted' && (
                  <button
                    className="schedule-button"
                    disabled={Boolean(busyAction)}
                    onClick={() => approve('stage')}
                  >
                    {busyAction === 'stage' ? 'Pripravujem koncepty…' : 'Schváliť Buffer koncepty'}
                  </button>
                )}
                {run.publishReceipt?.status === 'drafted' && (
                  <button
                    className="schedule-button"
                    disabled={Boolean(busyAction)}
                    onClick={() => approve('schedule')}
                  >
                    {busyAction === 'schedule'
                      ? 'Kontrolujem…'
                      : 'Znova schváliť a naplánovať'}
                  </button>
                )}
              </>
            )}
          </div>
          {feedbackOpen && (
            <div className="feedback-form">
              <label htmlFor="feedback">Čo má Codex a Claude upraviť?</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={event => setFeedback(event.target.value)}
                placeholder="Napríklad: druhý príspevok je príliš všeobecný. Použite konkrétnejší detail zo zdroja."
              />
              <button onClick={requestChanges} disabled={busyAction === 'changes'}>
                Uložiť pripomienku
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
