import type { CarouselSlideRole, Theme } from '@/domain/schemas';

export type CarouselTemplateId =
  | 'product-anatomy'
  | 'decision-note'
  | 'before-after'
  | 'signal-noise'
  | 'app-case-study';
export type VisualLayout =
  | 'image-detail'
  | 'diagram'
  | 'calm-text'
  | 'full-bleed'
  | 'split-detail'
  | 'app-hero'
  | 'app-flow'
  | 'ui-focus'
  | 'proof';

export type CarouselTemplate = {
  id: CarouselTemplateId;
  allowedSlideCounts?: readonly number[];
  slides: ReadonlyArray<{
    narrative: string;
    layout: VisualLayout;
    role?: CarouselSlideRole;
  }>;
};

export const CAROUSEL_TEMPLATES: Record<CarouselTemplateId, CarouselTemplate> = {
  'product-anatomy': {
    id: 'product-anatomy',
    slides: [
      { narrative: 'Krátky obchodný problém.', layout: 'full-bleed' },
      { narrative: 'Kontext používateľa.', layout: 'calm-text' },
      { narrative: 'Reálny produktový tok.', layout: 'image-detail' },
      { narrative: 'UI detail alebo diagram.', layout: 'diagram' },
      { narrative: 'Dôležitý kompromis alebo hranica.', layout: 'split-detail' },
      { narrative: 'Praktický ďalší krok.', layout: 'calm-text' },
    ],
  },
  'decision-note': {
    id: 'decision-note',
    slides: [
      { narrative: 'Rozhodovacia otázka.', layout: 'calm-text' },
      { narrative: 'Kedy problém vzniká.', layout: 'image-detail' },
      { narrative: 'Možnosť A.', layout: 'split-detail' },
      { narrative: 'Možnosť B.', layout: 'diagram' },
      { narrative: 'Kompromisy.', layout: 'calm-text' },
      { narrative: 'Odporúčanie Rise.', layout: 'image-detail' },
      { narrative: 'Kontrolný zoznam alebo otázka.', layout: 'calm-text' },
    ],
  },
  'before-after': {
    id: 'before-after',
    slides: [
      { narrative: 'Pôvodná situácia.', layout: 'full-bleed' },
      { narrative: 'Kde vznikalo trenie.', layout: 'calm-text' },
      { narrative: 'Čo sme zmenili.', layout: 'split-detail' },
      { narrative: 'Detail riešenia.', layout: 'image-detail' },
      { narrative: 'Čo možno verejne preukázať.', layout: 'diagram' },
      { narrative: 'Čo by sme overovali ďalej.', layout: 'calm-text' },
    ],
  },
  'signal-noise': {
    id: 'signal-noise',
    slides: [
      { narrative: 'Čo sa zmenilo.', layout: 'full-bleed' },
      { narrative: 'Prečo je to relevantné.', layout: 'calm-text' },
      { narrative: 'Čo je fakt.', layout: 'diagram' },
      { narrative: 'Čo je iba marketingový naratív.', layout: 'split-detail' },
      { narrative: 'Dopad na firmu.', layout: 'image-detail' },
      { narrative: 'Odporúčanie a dátum kontroly zdrojov.', layout: 'calm-text' },
    ],
  },
  'app-case-study': {
    id: 'app-case-study',
    allowedSlideCounts: [6, 7],
    slides: [
      {
        narrative: 'Čo aplikácia zjednodušuje.',
        layout: 'app-hero',
        role: 'cover',
      },
      {
        narrative: 'Jedna konkrétna situácia používateľa alebo firmy.',
        layout: 'calm-text',
        role: 'problem',
      },
      {
        narrative: 'Čo Rise navrhlo, vyvinulo alebo prepojilo.',
        layout: 'split-detail',
        role: 'scope',
      },
      {
        narrative: 'Kľúčový tok v troch až piatich krokoch.',
        layout: 'app-flow',
        role: 'flow',
      },
      {
        narrative: 'Reálny UI detail s najviac troma calloutmi.',
        layout: 'ui-focus',
        role: 'ui-detail',
      },
      {
        narrative: 'Dôležité UX, integračné, dátové alebo technické rozhodnutie.',
        layout: 'diagram',
        role: 'decision',
      },
      {
        narrative: 'Verejne overiteľný dôkaz, stav alebo dodaný rozsah a ďalší krok.',
        layout: 'proof',
        role: 'evidence',
      },
    ],
  },
};

const LEGACY_TEMPLATE_BY_THEME: Record<Theme, CarouselTemplateId> = {
  'product-proof': 'product-anatomy',
  'decision-education': 'decision-note',
  'growth-system': 'before-after',
  'people-process': 'product-anatomy',
  'signal-noise': 'signal-noise',
};

export function resolveCarouselTemplate(
  template: CarouselTemplateId | undefined,
  theme: Theme,
): CarouselTemplate {
  return CAROUSEL_TEMPLATES[template ?? LEGACY_TEMPLATE_BY_THEME[theme]];
}

export function fallbackVisualLayout(index: number, theme: Theme): VisualLayout {
  const template = resolveCarouselTemplate(undefined, theme);
  return template.slides[index % template.slides.length]?.layout ?? 'calm-text';
}
