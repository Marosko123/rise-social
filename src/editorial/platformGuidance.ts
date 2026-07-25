import type { Platform } from '@/domain/schemas';

export interface PlatformEditorialProfile {
  purpose: string;
  structure: string[];
  linkPolicy: string;
  hashtagPolicy: string;
  visualFormat: string;
  copyChecks: string[];
  sourceUrls: string[];
}

export const PLATFORM_EDITORIAL_PROFILES: Record<Platform, PlatformEditorialProfile> = {
  linkedin: {
    purpose:
      'Pomôcť profesionálom urobiť lepšie rozhodnutie cez vlastnú perspektívu, dôkaz a praktický dôsledok.',
    structure: [
      'Konkrétne pozorovanie alebo rozhodnutie, nie generický hook.',
      'Jeden overený dôkaz, príklad alebo krok z praxe.',
      'Čo z toho vyplýva pre produkt, softvér alebo prevádzku.',
      'Voliteľná pokojná výzva iba vtedy, keď má čitateľ prirodzený ďalší krok.',
    ],
    linkPolicy:
      'Priamy HTTPS odkaz použi iba vtedy, keď je cieľom návšteva zdroja alebo produktu; inak nechaj post bez odkazu.',
    hashtagPolicy: '0 až 3 tematické hashtagy z kontrolovaného slovníka.',
    visualFormat:
      'PDF document carousel, 4 až 8 rovnako veľkých flattenovaných strán s jasným názvom dokumentu.',
    copyChecks: [
      'Text musí obsahovať vlastnú perspektívu Rise a nesmie iba zhrnúť zdroj.',
      'Odbornosť ukáž cez rozhodnutie, obmedzenie alebo konkrétny postup.',
      'Nepoužívaj automatizované komentáre, engagement bait ani umelú kontroverziu.',
      'Limit platformy je 3 000 znakov.',
    ],
    sourceUrls: [
      'https://news.linkedin.com/2026/keeping-conversations-real-on-linkedin',
      'https://www.linkedin.com/help/linkedin/answer/a1674765',
      'https://www.linkedin.com/help/linkedin/answer/a518909/upload-and-share-documents-on-linkedin',
      'https://www.linkedin.com/help/linkedin/answer/a528176',
    ],
  },
  instagram: {
    purpose:
      'Vysvetliť jednu užitočnú myšlienku vizuálne tak, aby cover aj každá dlaždica fungovali samostatne.',
    structure: [
      'Prvá veta pomenuje konkrétnu hodnotu carouselu bez clickbaitu.',
      'Dve až štyri krátke vety doplnia kontext, nie celý obsah slidov.',
      'Ak existuje ďalší krok, použi prirodzené „odkaz v profile“.',
      'Na konci pridaj iba 2 až 5 presných tematických hashtagov.',
    ],
    linkPolicy:
      'Do captionu nevkladaj surový URL odkaz; pri webovom cieli použi formuláciu „odkaz v profile“.',
    hashtagPolicy: '2 až 5 tematických hashtagov z kontrolovaného slovníka.',
    visualFormat:
      'Carousel 4 až 8 slidov, 1080×1350 px, spoločná orientácia, vlastný alt text a samostatne čitateľný cover.',
    copyChecks: [
      'Caption nesmie opisovať každý slide vetu po vete.',
      'Prvá dlaždica musí fungovať aj v 3×3 profile bez puzzle nadväznosti.',
      'Jedna informácia na slide, čitateľná typografia a bezpečné okraje.',
      'Každý obrázok má konkrétny alt text.',
    ],
    sourceUrls: [
      'https://www.facebook.com/help/instagram/269314186824048',
      'https://www.facebook.com/help/instagram/503708446705527',
      'https://www.facebook.com/help/instagram/1631821640426723',
      'https://www.facebook.com/help/351460621611097/',
    ],
  },
  facebook: {
    purpose:
      'Podať zmysluplnú firemnú aktualitu jednoducho a konverzačne ľuďom, ktorí Rise už poznajú alebo objavujú.',
    structure: [
      'Začni konkrétnou novinkou, výsledkom práce alebo užitočným postrehom.',
      'Vysvetli ho v krátkom odseku bežnou slovenčinou.',
      'Pridaj odkaz iba ak je návšteva webu skutočným cieľom.',
      'Ukonči prirodzene bez povinnej otázky alebo žiadosti o komentár.',
    ],
    linkPolicy:
      'Priamy HTTPS odkaz je vhodný iba pri návštevnom cieli; musí byť overený a označený platformovým UTM.',
    hashtagPolicy: '0 až 2 tematické hashtagy z kontrolovaného slovníka.',
    visualFormat:
      'Zoradené obrázky alebo kratší výber carousel slidov; prvý obrázok musí vysvetliť tému aj bez ďalších kariet.',
    copyChecks: [
      'Preferuj kratší konverzačný text, spravidla do 900 znakov.',
      'Nevkladaj dlhý caption nesúvisiaci s obrázkom.',
      'Neopakuj LinkedIn verziu a nepoužívaj firemný oznamovací žargón.',
      'Tvrdenia o výsledkoch, úsporách a klientoch musia byť schválené a zdrojované.',
    ],
    sourceUrls: [
      'https://www.facebook.com/business/pages/boost-post',
      'https://www.facebook.com/help/www/181155025579876',
      'https://www.facebook.com/help/1257205004624246/',
    ],
  },
};

export function platformPromptBlock(): string {
  return (['linkedin', 'instagram', 'facebook'] as Platform[])
    .map(platform => {
      const profile = PLATFORM_EDITORIAL_PROFILES[platform];
      return [
        platform.toLocaleUpperCase('sk'),
        `Úloha: ${profile.purpose}`,
        'Štruktúra:',
        ...profile.structure.map((step, index) => `${index + 1}. ${step}`),
        `Odkaz: ${profile.linkPolicy}`,
        `Hashtagy: ${profile.hashtagPolicy}`,
        `Vizuál: ${profile.visualFormat}`,
        'Kontrola:',
        ...profile.copyChecks.map(check => `- ${check}`),
      ].join('\n');
    })
    .join('\n\n');
}
