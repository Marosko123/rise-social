const PUBLIC_BASE_URL = 'https://marosko123.github.io/rise-social';

export type PublicChatGptContextV2 = {
  schemaVersion: '2.0';
  id: string;
  identity: {
    name: 'Rise.sk';
    category: 'software-and-product-company';
    statement: string;
    mapatrhuDefinition: string;
  };
  notA: readonly string[];
  brandContract: {
    logoUrl: string;
    typography: {
      display: 'Playfair Display';
      body: 'Inter';
    };
    palette: Record<string, string>;
    spacing: {
      carouselSafeZone: '84px';
      principle: string;
    };
    visualDirection: readonly string[];
    forbiddenDirections: readonly string[];
  };
  products: readonly {
    id: string;
    name: string;
    definition: string;
    sourceUrl: string;
    assetIds: readonly string[];
  }[];
  requiredSources: readonly {
    id: string;
    url: string;
    purpose: string;
  }[];
  preflight: readonly string[];
  generationPolicy: {
    firstFourWeeks: 'disabled-for-product-posts';
    productEvidence: string;
    imageModelMayCreate: readonly string[];
    imageModelMustNeverCreate: readonly string[];
    directImageRequest: string;
  };
  stopConditions: readonly string[];
  canonicalUrls: {
    home: string;
    markdown: string;
    json: string;
    visualPlaybook: string;
    visualAssets: string;
    contentPlan: string;
    starterPack: string;
  };
};

export type StarterPackDraft = {
  id: string;
  title: string;
  format: 'carousel';
  assetIds: readonly string[];
  slides: readonly string[];
  visualRules: readonly string[];
  approvalStatus: 'draft';
};

export type PublicStarterPack = {
  schemaVersion: '1.0';
  canonicalUrl: string;
  status: 'awaiting-human-approval' | 'approved';
  instruction: string;
  packs: readonly {
    id: string;
    title: string;
    postUrl: string;
    assetIds: readonly string[];
    sources: readonly string[];
    altText: string;
    approvalDigest: string;
    approvedAt: string;
    media: readonly {
      type: 'image/png' | 'application/pdf';
      url: string;
      width?: number;
      height?: number;
    }[];
  }[];
};

export type StarterPackCandidate = PublicStarterPack['packs'][number] & {
  approvalStatus: 'draft' | 'approved';
  currentDigest: string;
};

export const PUBLIC_CHATGPT_CONTEXT: PublicChatGptContextV2 = {
  schemaVersion: '2.0',
  id: 'rise-chatgpt-context-v2',
  identity: {
    name: 'Rise.sk',
    category: 'software-and-product-company',
    statement:
      'Rise.sk je softvérová a produktová firma. Navrhuje, vyvíja a prevádzkuje digitálne produkty, dátové riešenia a praktické AI systémy.',
    mapatrhuDefinition:
      'MapaTrhu je dátový softvérový produkt pre prácu s kontextom realitného trhu; nie je to ponuka nehnuteľností ani developerský projekt.',
  },
  notA: [
    'stavebná firma',
    'developer nehnuteľností',
    'realitná kancelária',
    'predajca bytov alebo domov',
  ],
  brandContract: {
    logoUrl: `${PUBLIC_BASE_URL}/rise-logo.svg`,
    typography: {
      display: 'Playfair Display',
      body: 'Inter',
    },
    palette: {
      canvas: '#080807',
      surface: '#0C0C0C',
      elevated: '#141414',
      line: '#2B2924',
      gold: '#DAB549',
      goldSoft: '#DBC28C',
      goldHighlight: '#FEFBD8',
      strongText: '#F8F4EC',
      bodyText: '#D5D3D0',
      mutedText: '#9B978E',
    },
    spacing: {
      carouselSafeZone: '84px',
      principle:
        'Veľkorysý negatívny priestor, jedna jasná hierarchia a významový obsah vždy vo vnútri safe zóny.',
    },
    visualDirection: [
      'tmavý matný produktový priestor',
      'teplé Rise gold akcenty',
      'reálne UI a reálne produktové dôkazy',
      'pokojná asymetrická editoriálna kompozícia',
    ],
    forbiddenDirections: [
      'developerské domy, byty a stavebné vizualizácie',
      'realitný stock',
      'modré alebo modro-fialové neonové AI pozadia',
      'roboty, mozgy, hologramy a cyberpunk',
      'fake UI, fake dashboardy a vymyslené metriky',
      'syntetickí ľudia',
      'generovaný text, logo alebo wordmark',
    ],
  },
  products: [
    {
      id: 'rise-sk',
      name: 'Rise.sk',
      definition:
        'Vlastný web a systém, ktorý prepája produktové služby, portfólio, obsah a kvalifikovaný kontakt.',
      sourceUrl: 'https://rise.sk/portfolio/rise-sk',
      assetIds: ['rise-home'],
    },
    {
      id: 'mapatrhu',
      name: 'MapaTrhu',
      definition:
        'MapaTrhu je dátový softvérový produkt, ktorý dáva realitným dátam mapový a rozhodovací kontext.',
      sourceUrl: 'https://rise.sk/portfolio/trh-nehnutelnosti',
      assetIds: ['mapatrhu-map'],
    },
    {
      id: 'grantai',
      name: 'GrantAI',
      definition:
        'Softvérový produkt pre praktickú prácu s grantovými príležitosťami a rozhodovaním.',
      sourceUrl: 'https://rise.sk/portfolio/grant-ai',
      assetIds: ['grantai-ui'],
    },
    {
      id: 'moja-firma',
      name: 'MojaFirma',
      definition:
        'Softvérový produkt, ktorý prepája firemné dokumenty, procesy a AI asistenciu.',
      sourceUrl: 'https://rise.sk/portfolio/ai-erp',
      assetIds: ['mojafirma-document-flow'],
    },
  ],
  requiredSources: [
    {
      id: 'rise-home',
      url: 'https://rise.sk/',
      purpose: 'Kanonická identita, jazyk, typografia, farby a vizuálny rytmus.',
    },
    {
      id: 'rise-portfolio',
      url: 'https://rise.sk/portfolio',
      purpose: 'Register produktov; pred návrhom treba otvoriť presnú case study.',
    },
    {
      id: 'visual-assets',
      url: `${PUBLIC_BASE_URL}/visual-assets.json`,
      purpose: 'Jediný verejný register asset ID, práv a povolených platforiem.',
    },
    {
      id: 'visual-playbook',
      url: `${PUBLIC_BASE_URL}/visual-playbook.json`,
      purpose: 'Strojové brand, prompt, crop a QA pravidlá.',
    },
  ],
  preflight: [
    'Najprv nahlas potvrď, že Rise.sk je softvérová a produktová firma.',
    'Pomenuj konkrétny produkt a otvor jeho presnú verejnú case study.',
    'Vyber iba asset ID so stavom approved pre cieľovú platformu.',
    'Skontroluj 1080 × 1350 px, 84 px safe zónu, pravé logo, Playfair Display a Inter.',
    'Skontroluj všetky zakázané smery a stop podmienky pred renderom.',
  ],
  generationPolicy: {
    firstFourWeeks: 'disabled-for-product-posts',
    productEvidence:
      'Prvé produktové vizuály sa skladajú deterministicky z reálneho UI, pravého SVG loga, schválených assetov a presných Rise tokenov.',
    imageModelMayCreate: [
      'neskôr samostatnú abstraktnú editoriálnu vrstvu',
      'materiálový objekt bez textu, loga, UI, osoby a metrík',
    ],
    imageModelMustNeverCreate: [
      'produkt alebo produktový dôkaz',
      'UI, dashboard, graf, metriku alebo kód',
      'text, logo alebo wordmark',
      'osobu alebo podobizeň tímu',
      'hlavný vizuál prvých štyroch týždňov',
    ],
    directImageRequest:
      'Pri žiadosti o prvé obrázky vráť schválené médiá zo starter-pack.json. Ak je pack prázdny, zastav a oznám, že čaká na ľudské vizuálne schválenie; negeneruj alternatívu.',
  },
  stopConditions: [
    'Chýba presná case study alebo schválený asset ID.',
    'Asset nie je approved pre cieľovú platformu.',
    'Návrh obsahuje stavebníctvo, domy, byty alebo realitný stock ako obraz Rise.',
    'Návrh používa fake UI, generovaný text/logo, syntetického človeka alebo modro-fialový cyberpunk.',
    'Chronologické video nemá schválenú reálnu nahrávku Maroša.',
    'Starter pack nemá platný ľudský approval digest.',
  ],
  canonicalUrls: {
    home: `${PUBLIC_BASE_URL}/`,
    markdown: `${PUBLIC_BASE_URL}/chatgpt-context.md`,
    json: `${PUBLIC_BASE_URL}/chatgpt-context.json`,
    visualPlaybook: `${PUBLIC_BASE_URL}/visual-playbook.json`,
    visualAssets: `${PUBLIC_BASE_URL}/visual-assets.json`,
    contentPlan: `${PUBLIC_BASE_URL}/content-plan/`,
    starterPack: `${PUBLIC_BASE_URL}/starter-pack.json`,
  },
};

export const STARTER_PACK_DRAFTS: readonly StarterPackDraft[] = [
  {
    id: 'software-one-accountable-team',
    title: 'Softvér, za ktorý ručí jeden tím',
    format: 'carousel',
    assetIds: [
      'rise-home',
      'mapatrhu-map',
      'grantai-ui',
      'mojafirma-document-flow',
    ],
    slides: [
      'Homepage cover: jeden tím od návrhu po prevádzku',
      'Tok zodpovednosti: návrh → vývoj → prevádzka',
      'Rise.sk: produkt, obsah a kontakt',
      'MapaTrhu: dátový softvérový produkt',
      'GrantAI: softvér pre grantové rozhodovanie',
      'MojaFirma: dokumenty, procesy a AI asistencia',
    ],
    visualRules: [
      'iba pravé logo a reálne schválené UI',
      'každý produkt má samostatný slide',
      'bez generatívnej obrazovej vrstvy',
    ],
    approvalStatus: 'draft',
  },
  {
    id: 'mapatrhu-context-before-decision',
    title: 'MapaTrhu: najprv kontext, potom rozhodnutie',
    format: 'carousel',
    assetIds: ['mapatrhu-map'],
    slides: [
      'MapaTrhu je dátový softvérový produkt',
      'Najprv mapový kontext',
      'Potom porovnanie a rozhodnutie',
    ],
    visualRules: [
      'výhradne reálne mapové UI',
      'bez domov a realitného stocku',
      'bez generovaného dashboardu alebo dát',
    ],
    approvalStatus: 'draft',
  },
  {
    id: 'rise-product-content-contact',
    title: 'Rise.sk prepája produkt, obsah a kontakt',
    format: 'carousel',
    assetIds: ['rise-home'],
    slides: [
      'Reálny Rise.sk homepage',
      'Prechod do portfólia',
      'Prechod ku kvalifikovanému kontaktu',
    ],
    visualRules: [
      'reálny homepage → portfólio → kontakt tok',
      'bez fake UI a bez generatívnej vrstvy',
      'deterministická typografia a linky',
    ],
    approvalStatus: 'draft',
  },
];

export function buildPublicStarterPack(
  candidates: readonly StarterPackCandidate[],
): PublicStarterPack {
  const packs = candidates
    .filter(
      candidate =>
        candidate.approvalStatus === 'approved' &&
        /^[a-f0-9]{64}$/u.test(candidate.approvalDigest) &&
        candidate.approvalDigest === candidate.currentDigest &&
        Number.isFinite(Date.parse(candidate.approvedAt)) &&
        candidate.media.length > 0 &&
        candidate.media.every(
          media =>
            media.url.startsWith('https://') &&
            (media.type === 'image/png' ||
              media.type === 'application/pdf'),
        ),
    )
    .map(candidate => ({
      id: candidate.id,
      title: candidate.title,
      postUrl: candidate.postUrl,
      assetIds: candidate.assetIds,
      sources: candidate.sources,
      altText: candidate.altText,
      approvalDigest: candidate.approvalDigest,
      approvedAt: candidate.approvedAt,
      media: candidate.media,
    }));

  return {
    schemaVersion: '1.0',
    canonicalUrl: `${PUBLIC_BASE_URL}/starter-pack.json`,
    status: packs.length > 0 ? 'approved' : 'awaiting-human-approval',
    instruction:
      packs.length > 0
        ? 'Vráťte presne tieto schválené médiá a alt texty. Negenerujte alternatívu.'
        : 'Žiadny starter pack ešte nemá platné ľudské vizuálne schválenie. Negenerujte náhradné obrázky; vráťte stop stav.',
    packs,
  };
}

export const PUBLIC_STARTER_PACK = buildPublicStarterPack([]);

export function renderPublicChatGptContextMarkdown(): string {
  const context = PUBLIC_CHATGPT_CONTEXT;
  const products = context.products
    .map(
      product =>
        `- **${product.name}** — ${product.definition} Zdroj: ${product.sourceUrl}; asset ID: ${product.assetIds.join(', ')}.`,
    )
    .join('\n');
  const sources = context.requiredSources
    .map(source => `- [${source.id}](${source.url}) — ${source.purpose}`)
    .join('\n');

  return `# Rise.sk — povinný ChatGPT brand context

**NAJPRV POTVRĎ:** ${context.identity.statement}

**Rise.sk NIE JE stavebná firma, developer nehnuteľností ani realitná kancelária.** MapaTrhu je dátový softvérový produkt, nie ponuka domov alebo bytov.

Pri žiadosti o prvé obrázky načítaj \`${context.canonicalUrls.starterPack}\`. Ak neobsahuje schválené médiá, zastav. Negeneruj alternatívu.

## Brand contract

- Pravé logo: ${context.brandContract.logoUrl}
- Nadpisy: ${context.brandContract.typography.display}; ostatný text: ${context.brandContract.typography.body}
- Farby: canvas ${context.brandContract.palette.canvas}, surface ${context.brandContract.palette.surface}, Rise gold ${context.brandContract.palette.gold}, text ${context.brandContract.palette.strongText}
- Safe zóna: ${context.brandContract.spacing.carouselSafeZone}
- Zakázané: ${context.brandContract.forbiddenDirections.join('; ')}

## Produkty

${products}

## Povinné zdroje

${sources}

## Preflight

${context.preflight.map(item => `- ${item}`).join('\n')}

## Generation policy

${context.generationPolicy.productEvidence}

- Prvé štyri týždne: generatívne vrstvy produktových postov sú vypnuté.
- Image model nesmie vytvárať: ${context.generationPolicy.imageModelMustNeverCreate.join('; ')}.
- Kriticky zakázané: fake UI, generovaný text, logo, syntetickí ľudia, stavebný a realitný stock.

${context.generationPolicy.directImageRequest}

## Stop podmienky

${context.stopConditions.map(item => `- ${item}`).join('\n')}

## Kanonické URL

- JSON: ${context.canonicalUrls.json}
- Visual playbook: ${context.canonicalUrls.visualPlaybook}
- Asset manifest: ${context.canonicalUrls.visualAssets}
- Starter pack: ${context.canonicalUrls.starterPack}
- 90-dňový plán: ${context.canonicalUrls.contentPlan}
`;
}
