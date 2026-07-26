'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { getCanonicalPublicProjectCount } from '@/contentPlan/plan';
import type {
  ContentCalendarEntry,
  ContentPillar,
  ContentPlan,
  ContentSeries,
  DisclosureLevel,
} from '@/contentPlan/schemas';
import { RISE_PUBLIC_ASSET_CATALOG_V1 } from '../../brand/assets.v1';
import { VisualPlaybook } from '@/components/VisualPlaybook';
import { RiseLogoMark } from '@/components/RiseLogoMark';

type PillarFilter = ContentPillar | 'all';

const PILLAR_META: Record<
  ContentPillar,
  { label: string; filterLabel: string; number: string }
> = {
  'product-proof': {
    label: 'Produktové dôkazy',
    filterLabel: 'Dôkazy',
    number: '01',
  },
  'decision-education': {
    label: 'Rozhodnutia',
    filterLabel: 'Rozhodnutia',
    number: '02',
  },
  'growth-system': {
    label: 'Growth System',
    filterLabel: 'Growth System',
    number: '03',
  },
  'people-process': {
    label: 'Ľudia a proces',
    filterLabel: 'Ľudia a proces',
    number: '04',
  },
  'signal-noise': {
    label: 'Signal vs. Noise',
    filterLabel: 'Signal vs. Noise',
    number: '05',
  },
};

const SERIES_LABELS: Record<ContentSeries, string> = {
  'inside-build': 'Inside the Build',
  'decision-notes': 'Decision Notes',
  'growth-system': 'Growth System',
  'people-behind-product': 'People Behind the Product',
  'signal-vs-noise': 'Signal vs. Noise',
};

const FILTERS: ReadonlyArray<{ id: PillarFilter; label: string }> = [
  { id: 'all', label: 'Všetky' },
  ...Object.entries(PILLAR_META).map(([id, meta]) => ({
    id: id as ContentPillar,
    label: meta.filterLabel,
  })),
];

const DISCLOSURE_META: Record<
  DisclosureLevel,
  { label: string; className: string }
> = {
  'public-owned': { label: 'Verejný vlastný projekt', className: 'is-public' },
  'public-case-study': { label: 'Verejná case study', className: 'is-public' },
  'approval-required': {
    label: 'Povinné schválenie',
    className: 'is-approval',
  },
  'confidential-anonymized': {
    label: 'Iba anonymizovane',
    className: 'is-confidential',
  },
};

const RISK_LABELS: Record<ContentCalendarEntry['riskLevel'], string> = {
  low: 'Nízke riziko',
  medium: 'Kontrola detailov',
  high: 'Povinná kontrola',
};

const PROFILE_STATUS = {
  prepared: 'Pripravené lokálne',
  'manual-action': 'Čaká na manuálnu zmenu',
  'needs-verification': 'Treba overiť',
} as const;

const PUBLIC_ASSET_BY_ID = new Map(
  RISE_PUBLIC_ASSET_CATALOG_V1.assets.map(
    ([id, project, sourceUrl, path, visualClass, note]) => [
      String(id),
      { id, project, sourceUrl, path, visualClass, note },
    ] as const,
  ),
);

const ASSET_STATUS_LABELS: Record<
  ContentCalendarEntry['assetSelection']['status'],
  string
> = {
  'owned-preview': 'Vlastnený verejný podklad',
  'rights-checkpoint': 'Práva čakajú na potvrdenie',
  'capture-required': 'capture required',
  'original-diagram': 'Originálny vysvetľujúci diagram',
};

function formatDate(value: string): { day: string; month: string; full: string } {
  const date = new Date(`${value}T12:00:00.000Z`);
  return {
    day: new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date),
    month: new Intl.DateTimeFormat('sk-SK', {
      month: 'short',
      timeZone: 'UTC',
    })
      .format(date)
      .replace('.', ''),
    full: new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date),
  };
}

function PlatformPlan({ entry }: { entry: ContentCalendarEntry }) {
  return (
    <div className="plan-platforms" aria-label="Spracovanie pre platformy">
      {Object.values(entry.platforms).map(delivery => (
        <div key={delivery.platform}>
          <strong>
            {delivery.platform === 'instagram'
              ? 'Instagram'
              : delivery.platform === 'linkedin'
                ? 'LinkedIn'
                : 'Facebook'}
          </strong>
          <span>{delivery.format}</span>
          <small>{delivery.copyRule}</small>
        </div>
      ))}
    </div>
  );
}

function VisualDirectionPreview({ entry }: { entry: ContentCalendarEntry }) {
  const selectedAssets = entry.assetSelection.assetIds
    .map(id => PUBLIC_ASSET_BY_ID.get(id))
    .filter(asset => asset !== undefined);
  const isCaptureRequired =
    entry.assetSelection.status === 'capture-required';
  const isOriginalDiagram =
    entry.assetSelection.status === 'original-diagram';

  return (
    <div
      className={`visual-direction-card visual-${entry.selectedAssetClass}`}
      aria-label={`Vizuálny smer: ${entry.visualTemplate}`}
    >
      <div
        className={`visual-direction-frame asset-${entry.assetSelection.status}`}
      >
        <span>{SERIES_LABELS[entry.series]}</span>
        <strong>{entry.title}</strong>
        {isCaptureRequired ? (
          <div className="capture-required-card">
            <small>capture required</small>
            <b>Fotenie alebo nahrávanie je povinné</b>
          </div>
        ) : isOriginalDiagram ? (
          <div
            className="direction-wireframe"
            aria-label="Navrhovaná informačná štruktúra diagramu"
          >
            <i>Kontext</i>
            <i>Rozhodnutie</i>
            <i>Ďalší krok</i>
          </div>
        ) : (
          <div className="asset-proof-stack">
            {selectedAssets.slice(0, 2).map(asset => (
              <span key={asset.id}>
                <small>asset ID: {asset.id}</small>
                <b>{asset.project}</b>
                <em>{asset.visualClass.replaceAll('-', ' ')}</em>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="visual-direction-meta">
        <span>{ASSET_STATUS_LABELS[entry.assetSelection.status]}</span>
        <small>{entry.assetSelection.note}</small>
        {selectedAssets.map(asset => (
          <a
            href={asset.sourceUrl}
            key={asset.id}
            rel="noreferrer"
            target="_blank"
          >
            asset ID: {asset.id} · {asset.project}
          </a>
        ))}
        {selectedAssets.length === 0 && (
          <small>{entry.visualTemplate.replaceAll('-', ' ')}</small>
        )}
      </div>
    </div>
  );
}

export function ContentPlanStudio({ plan }: { plan: ContentPlan }) {
  const [filter, setFilter] = useState<PillarFilter>('all');
  const visibleEntries = useMemo(
    () =>
      filter === 'all'
        ? plan.entries
        : plan.entries.filter(entry => entry.pillar === filter),
    [filter, plan.entries],
  );
  const publicProjectCount = getCanonicalPublicProjectCount(plan);
  const projectById = useMemo(
    () => new Map(plan.projects.map(project => [project.id, project])),
    [plan.projects],
  );
  const claimById = useMemo(
    () => new Map(plan.claims.map(claim => [claim.id, claim])),
    [plan.claims],
  );
  const trendById = useMemo(
    () => new Map(plan.trends.map(trend => [trend.id, trend])),
    [plan.trends],
  );

  return (
    <main className="content-plan-shell">
      <header className="plan-topbar">
        <Link className="brand" href="/review" aria-label="Rise Social Studio">
          <RiseLogoMark className="brand-mark" />
          <span>
            <strong>Rise Social</strong>
            <small>Operating plan</small>
          </span>
        </Link>
        <div className="plan-topbar-meta">
          <span className="status-dot" aria-hidden="true" />
          <span>Zdrojované · lokálne · bez publikovania</span>
        </div>
      </header>

      <section className="plan-hero" aria-labelledby="content-plan-title">
        <div>
          <p className="kicker">90 DNÍ · 2 MASTER POSTY TÝŽDENNE</p>
          <h1 id="content-plan-title">90-dňový content plán</h1>
          <p className="plan-hero-copy">
            Profesionálna prezentácia Rise pre majiteľov a riaditeľov firiem:
            produktové dôkazy, rozhodovacie rámce a ľudská zodpovednosť.
            Marketing zostáva podpornou vrstvou softvérovej práce.
          </p>
        </div>
        <div className="plan-summary" aria-label="Súhrn plánu">
          <div>
            <strong>{plan.entries.length}</strong>
            <span>master tém</span>
          </div>
          <div>
            <strong>{plan.weeks.length}</strong>
            <span>týždňov</span>
          </div>
          <div>
            <strong>{publicProjectCount}</strong>
            <span>verejných projektov</span>
          </div>
        </div>
      </section>

      <section className="plan-principles" aria-label="Princípy plánu">
        <p>
          <span>01</span>
          <strong>Softvér zostáva hlavnou témou</strong>
          <small>AI a marketing sú kontext, nie náhrada produktovej práce.</small>
        </p>
        <p>
          <span>02</span>
          <strong>Každý fakt má zdroj a platnosť</strong>
          <small>Rýchlo sa meniace tvrdenia sa pred publikovaním overia znova.</small>
        </p>
        <p>
          <span>03</span>
          <strong>Len verejné a schválené podklady</strong>
          <small>Dôverné projekty ukazujeme iba anonymizovane a po kontrole.</small>
        </p>
      </section>

      <section className="operating-section" aria-labelledby="channels-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">POZÍCIA A DISTRIBÚCIA</p>
            <h2 id="channels-title">Úlohy kanálov</h2>
          </div>
          <p>
            Jedna téma, tri odlišné úlohy. LinkedIn nesie B2B dôkaz,
            Instagram vizuálnu pamäť a Facebook lokálnu zrozumiteľnosť.
          </p>
        </div>
        <div className="channel-role-grid">
          {plan.channelRoles.map((channel, index) => (
            <article key={channel.platform}>
              <span>0{index + 1}</span>
              <h3>
                {channel.platform === 'linkedin'
                  ? 'LinkedIn'
                  : channel.platform === 'instagram'
                    ? 'Instagram'
                    : 'Facebook'}
              </h3>
              <p>{channel.role}</p>
              <dl>
                <div>
                  <dt>Formát dôkazu</dt>
                  <dd>{channel.evidenceFormat}</dd>
                </div>
                <div>
                  <dt>Signál úspechu</dt>
                  <dd>{channel.successSignal}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <VisualPlaybook />

      <section className="rollout-section" aria-labelledby="rollout-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">KONTROLOVANÝ ROLLOUT</p>
            <h2 id="rollout-title">Najprv baseline, potom učenie</h2>
          </div>
          <p>
            Frekvenciu nezvyšujeme, kým kvalita dôkazov alebo ľudské
            schvaľovanie nestíha.
          </p>
        </div>
        <div className="rollout-grid">
          <article>
            <span>01 — TÝŽDNE 1–4</span>
            <h3>30-dňový pilot</h3>
            <strong>8 master postov</strong>
            <p>
              Štyri produktové alebo systémové dôkazy, dva rozhodovacie
              formáty, ľudský hlas a prvý aktuálny AI signál.
            </p>
          </article>
          <article>
            <span>02 — TÝŽDNE 5–12</span>
            <h3>Ďalších 60 dní</h3>
            <strong>16 master postov</strong>
            <p>
              Dve najlepšie série posilníme. Každé dva týždne testujeme jeden
              nový vizuálny alebo video formát bez zvyšovania frekvencie.
            </p>
          </article>
        </div>
        <div className="cadence-line" aria-label="Publikačný rytmus">
          <strong>{plan.cadence.masterPostsPerWeek}× týždenne</strong>
          <span>{plan.cadence.linkedin}</span>
          <span>{plan.cadence.instagram}</span>
          <span>{plan.cadence.facebook}</span>
          <span>{plan.cadence.verticalVideo}</span>
        </div>
      </section>

      <section className="plan-pillars" aria-labelledby="pillars-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">OBSAHOVÁ ARCHITEKTÚRA</p>
            <h2 id="pillars-title">Päť pilierov. Jedna pozícia.</h2>
          </div>
          <p>
            Percentá sú strategický cieľ. Pri 24 slotoch používame najbližší
            celočíselný mix bez predstierania falošnej presnosti.
          </p>
        </div>
        <div className="pillar-grid pillar-grid-five">
          {plan.pillars.map(pillar => {
            const actualCount = plan.entries.filter(
              entry => entry.pillar === pillar.id,
            ).length;
            return (
              <article key={pillar.id}>
                <span>{PILLAR_META[pillar.id].number}</span>
                <h3>{pillar.label}</h3>
                <p>{pillar.description}</p>
                <strong>
                  {pillar.targetPercent} % cieľ · {actualCount} tém
                </strong>
              </article>
            );
          })}
        </div>
        <div className="series-strip" aria-label="Opakované série">
          {Object.values(SERIES_LABELS).map((series, index) => (
            <span key={series}>
              0{index + 1} · {series}
            </span>
          ))}
        </div>
      </section>

      <section className="calendar-section" aria-labelledby="calendar-title">
        <div className="plan-section-head calendar-heading">
          <div>
            <p className="kicker">12 TÝŽDŇOV · 24 MASTER SLOTOV</p>
            <h2 id="calendar-title">Od otázky kupujúceho po vizuál</h2>
          </div>
          <div className="plan-filters" aria-label="Filtrovať obsahový pilier">
            {FILTERS.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="calendar-list" aria-live="polite">
          {visibleEntries.map(entry => {
            const date = formatDate(entry.publishOn);
            const claims = entry.claimIds
              .map(id => claimById.get(id))
              .filter(item => item !== undefined);
            const trends = entry.trendIds
              .map(id => trendById.get(id))
              .filter(item => item !== undefined);

            return (
              <article
                className="calendar-entry"
                data-testid="content-plan-entry"
                key={entry.id}
              >
                <time dateTime={entry.publishOn} aria-label={date.full}>
                  <strong>{date.day}</strong>
                  <span>{date.month}</span>
                  <small>T{entry.week}</small>
                </time>
                <div className="entry-copy">
                  <div className="entry-meta">
                    <span className={`theme-tag theme-${entry.pillar}`}>
                      {PILLAR_META[entry.pillar].label}
                    </span>
                    <span className={`risk-tag risk-${entry.riskLevel}`}>
                      {RISK_LABELS[entry.riskLevel]}
                    </span>
                    <span className="phase-tag">
                      {entry.rolloutPhase === 'pilot' ? '30-dňový pilot' : '60-dňový rollout'}
                    </span>
                  </div>
                  <h3>{entry.title}</h3>
                  <p>{entry.businessGoal}</p>
                  <blockquote>{entry.buyerQuestion}</blockquote>
                  {entry.projectIds.length > 0 && (
                    <div className="project-chips" aria-label="Použité projekty">
                      {entry.projectIds.map(id => (
                        <span key={id}>{projectById.get(id)?.name ?? id}</span>
                      ))}
                    </div>
                  )}
                  <details>
                    <summary>Biznis, vizuál, platformy a zdroje</summary>
                    <div className="entry-strategy">
                      <div>
                        <strong>Rise perspektíva</strong>
                        <p>{entry.risePerspective}</p>
                      </div>
                      <div>
                        <strong>Presný vizuálny brief</strong>
                        <p>{entry.specificVisualBrief}</p>
                        <small>{entry.visual.altText}</small>
                      </div>
                      <div>
                        <strong>CTA a schvaľovanie</strong>
                        <p>{entry.cta}</p>
                        <small>{entry.approvalNote}</small>
                      </div>
                    </div>
                    <PlatformPlan entry={entry} />
                    <div className="entry-sources">
                      {[...claims, ...trends].map(source => (
                        <a
                          href={'url' in source ? source.url : source.sourceUrl}
                          key={source.id}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ↗ {'publisher' in source ? source.publisher : 'Rise.sk'}
                          <span>
                            {'title' in source ? source.title : source.claim}
                          </span>
                        </a>
                      ))}
                    </div>
                  </details>
                </div>
                <VisualDirectionPreview entry={entry} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="trend-section" aria-labelledby="trend-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">ZDROJE S EXPIRÁCIOU</p>
            <h2 id="trend-title">Aktuálny zdrojový radar</h2>
          </div>
          <p>
            Primárne zdroje majú dátum kontroly aj exspirácie. Po ňom sa téma
            nesmie použiť bez nového overenia.
          </p>
        </div>
        <div className="trend-grid">
          {plan.trends.map(trend => (
            <article key={trend.id}>
              <span>
                {trend.sourceKind === 'primary'
                  ? 'Primárny zdroj'
                  : 'Vendor štúdia'}
              </span>
              <h3>{trend.title}</h3>
              <p>{trend.scope}</p>
              <a href={trend.url} target="_blank" rel="noreferrer">
                {trend.publisher} ↗
              </a>
              <small>
                Platnosť do {formatDate(trend.expiresAt.slice(0, 10)).full}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="disclosure-section" aria-labelledby="disclosure-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">BEZPEČNOSŤ PORTFÓLIA</p>
            <h2 id="disclosure-title">
              {publicProjectCount} verejných projektov
            </h2>
          </div>
          <p>
            Počet je vypočítaný z jedného registra, overené{' '}
            {formatDate(plan.projectRegistryCheckedAt).full}. Povolenie pre
            jeden vizuál nikdy neplatí automaticky pre ďalší.
          </p>
        </div>
        <div className="disclosure-list">
          {plan.projects.map(project => {
            const disclosure = DISCLOSURE_META[project.level];
            return (
              <article data-testid="project-disclosure" key={project.id}>
                <div>
                  <span className={disclosure.className}>{disclosure.label}</span>
                  <h3>{project.name}</h3>
                  <a href={project.publicUrl} target="_blank" rel="noreferrer">
                    Verejný podklad ↗
                  </a>
                </div>
                <div>
                  <strong>Povolené</strong>
                  <p>{project.allowedClaims.join(' ')}</p>
                </div>
                <div>
                  <strong>Nepublikovať</strong>
                  <p>{project.prohibited.join(' ')}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="profile-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">FÁZA 1</p>
            <h2 id="profile-title">Profilový základ</h2>
          </div>
          <p>
            Pack je lokálny pracovný podklad. Žiadne bio, cover, handle ani
            pripnutý post nebol zmenený na živej sieti.
          </p>
        </div>
        <div className="profile-checklist">
          {plan.profileFoundation.map(item => (
            <article key={item.id}>
              <span className={`profile-status status-${item.status}`}>
                {PROFILE_STATUS[item.status]}
              </span>
              <h3>{item.label}</h3>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="kpi-section" aria-labelledby="kpi-title">
        <div className="plan-section-head">
          <div>
            <p className="kicker">MERANIE OBCHODNÉHO PRÍNOSU</p>
            <h2 id="kpi-title">KPI a rozhodnutie po 90 dňoch</h2>
          </div>
          <p>
            Uloženia, kliky a rozhovory sú signál. Automatizácia ich vyhodnotí,
            ale pravidlá ani frekvenciu sama nezmení.
          </p>
        </div>
        <div className="kpi-grid">
          {plan.kpis.map((kpi, index) => (
            <article key={kpi.category}>
              <span>0{index + 1}</span>
              <h3>{kpi.label}</h3>
              <ul>
                {kpi.metrics.map(metric => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
              <p>{kpi.interpretation}</p>
            </article>
          ))}
        </div>
        <div className="decision-rules">
          <div>
            <strong>Pokračovať, ak platia aspoň 2 z 3 podmienok</strong>
            <p>
              Ak nie, upravíme publikum, otázky alebo distribúciu. Nebudeme
              vyrábať viac priemerného obsahu.
            </p>
          </div>
          <ol>
            {plan.decisionRules.map(rule => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="plan-footer">
        <div>
          <RiseLogoMark className="brand-mark" />
          <p>
            <strong>Plán nie je publikačné schválenie.</strong>
            Každý výstup ešte prejde zdrojmi, kontinuitou, právami, vizuálnou
            QA, nezávislou validáciou a ľudskou kontrolou.
          </p>
        </div>
        <Link href="/review">Otvoriť kontrolné štúdio →</Link>
      </footer>
    </main>
  );
}
