import type { Theme } from '@/domain/schemas';

export type CarouselTemplateId = 'product-anatomy' | 'decision-note' | 'before-after' | 'signal-noise';
export type VisualLayout = 'image-detail' | 'diagram' | 'calm-text' | 'full-bleed' | 'split-detail';

export type CarouselTemplate = {
  id: CarouselTemplateId;
  slides: ReadonlyArray<{ narrative: string; layout: VisualLayout }>;
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
