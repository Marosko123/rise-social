export const RISE_VISUAL_GENERATION_PLAYBOOK_V1 = {
  id: 'rise-visual-generation-v1',
  checkedAt: '2026-07-25',
  promise:
    'Softvér, ktorý prináša výsledky. Softvér, dáta a AI. Jeden tím od návrhu po prevádzku.',
  purpose:
    'Vytvárať jednoduché, moderné a profesionálne editoriálne vrstvy, ktoré podporia reálny produktový dôkaz. Generovaný obraz nikdy nesmie predstierať produkt, človeka ani výsledok Rise.',
  referenceOrder: [
    'relevant-rise-project-page',
    'approved-rise-asset',
    'rise-home',
    'rise-portfolio',
    'official-platform-specification',
    'official-image-generation-guidance',
  ],
  sources: [
    {
      id: 'rise-home',
      label: 'Rise.sk — značka a prísľub',
      url: 'https://rise.sk/',
      checkedAt: '2026-07-25',
      expiresAt: '2026-10-25',
      role:
        'Zdroj pozície značky, jazyka, tmavého produktového priestoru a dôrazu na softvér, dáta, AI a zodpovednosť.',
    },
    {
      id: 'rise-portfolio',
      label: 'Rise.sk — verejné portfólio',
      url: 'https://rise.sk/portfolio',
      checkedAt: '2026-07-25',
      expiresAt: '2026-10-25',
      role:
        'Register reálnych projektov. Pre konkrétny post treba otvoriť aj presnú verejnú case study a vybrať iba schválený asset ID.',
    },
    {
      id: 'openai-image-prompting',
      label: 'OpenAI prompting guide',
      url:
        'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
      checkedAt: '2026-07-25',
      expiresAt: '2026-08-25',
      role:
        'Creative brief má explicitne pomenovať kompozíciu, materiály, svetlo, umiestnenie, invarianty, referencie a výstup.',
    },
    {
      id: 'openai-image-generation',
      label: 'OpenAI image generation',
      url: 'https://developers.openai.com/api/docs/guides/image-generation',
      checkedAt: '2026-07-25',
      expiresAt: '2026-08-25',
      role:
        'Oficiálny zdroj pre referenčné obrázky, editovanie, rozmer, kvalitu a ďalšie parametre aktuálneho obrazového workflowu.',
    },
    {
      id: 'w3c-contrast',
      label: 'W3C — WCAG kontrast',
      url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum',
      checkedAt: '2026-07-25',
      expiresAt: '2027-01-25',
      role:
        'Text a významové prvky musia zostať čitateľné; bežný text cieli aspoň na 4,5 : 1 a veľký text na 3 : 1.',
    },
    {
      id: 'instagram-image-resolution',
      label: 'Instagram image resolution',
      url:
        'https://www.facebook.com/help/instagram/1631821640426723?locale=en_GB',
      checkedAt: '2026-07-25',
      expiresAt: '2026-08-25',
      role:
        'Oficiálna kontrola rozlíšenia a pomeru strán vo feede; Rise master zostáva 1080 × 1350 px.',
    },
    {
      id: 'linkedin-image-specifications',
      label: 'LinkedIn image specifications',
      url:
        'https://www.linkedin.com/help/linkedin/answer/a563309/image-specifications-for-your-linkedin-pages-and-career-pages',
      checkedAt: '2026-07-25',
      expiresAt: '2026-08-25',
      role:
        'Oficiálne rozmery, centrovanie dôležitého obsahu a kontrola responzívneho orezu.',
    },
    {
      id: 'facebook-page-image-dimensions',
      label: 'Facebook Page image dimensions',
      url: 'https://www.facebook.com/help/125379114252045/',
      checkedAt: '2026-07-25',
      expiresAt: '2026-08-25',
      role:
        'Oficiálne rozmery profilovej a cover fotografie vrátane prekrytia ľavej časti a responzívneho orezu.',
    },
  ],
  brandLock: {
    palette: {
      canvas: '#080807',
      surface: '#0C0C0C',
      elevated: '#141414',
      gold: '#DAB549',
      strongText: '#F8F4EC',
      bodyText: '#D5D3D0',
      line: '#2B2924',
    },
    mood: [
      'pokojný',
      'presný',
      'sebavedomý bez hlučnosti',
      'ľudský',
      'technický, ale zrozumiteľný',
      'prémiový bez luxusných klišé',
    ],
    composition: [
      'jeden dominantný významový objekt alebo tok',
      'asymetrická, vyvážená editoriálna kompozícia',
      '60–75 % pokojného negatívneho priestoru',
      'jasná hierarchia celok → detail → vysvetlenie',
      'žiadne dekoratívne častice bez informačnej funkcie',
    ],
    materials: [
      'matný antracitový povrch',
      'jemne vrstvené sklo iba tam, kde vysvetľuje vzťah',
      'teplý minerálny alebo kartónový detail',
      'tenká mosadzná linka v Rise gold, nikdy zlatý lesk cez celý obraz',
      'veľmi jemné prirodzené zrno namiesto sterilného 3D plastu',
    ],
    lighting: [
      'mäkké smerové štúdiové svetlo',
      'kontrolované teplé zvýraznenie',
      'hlboké čisté tiene bez neonovej žiary',
      'realistický kontakt objektu s povrchom',
    ],
    typography:
      'Text sa negeneruje v obrazovom modeli. Playfair Display sa pridáva deterministicky iba na krátky nosný titulok; Inter na všetky vysvetlenia, čísla a navigáciu.',
    humanity:
      'Ľudskosť prináša reálna fotografia, reálny screenshot, prirodzený detail práce a mierna materiálová nedokonalosť. Model nesmie vymýšľať ľudí.',
    statement:
      'Nie cyberpunk. Nie AI klišé. Nie sterilný stock 3D render. Rise má pôsobiť pokojne, dôveryhodne, materiálovo a produktovo.',
  },
  promptContract: [
    'purpose',
    'source-references',
    'subject',
    'composition',
    'materials',
    'lighting',
    'brand-lock',
    'preserve',
    'exclude',
    'output',
  ],
  promptTemplate: [
    'PURPOSE — komu obraz pomáha a akú jedinú myšlienku má vysvetliť.',
    'SOURCE REFERENCES — URL konkrétnej Rise case study, asset ID a rola každého referenčného obrázka.',
    'SUBJECT — iba abstraktná dátová vrstva, materiálový objekt alebo geometrická metafora.',
    'COMPOSITION — formát, uhol, ohnisko, umiestnenie a negatívny priestor pre deterministický text/UI.',
    'MATERIALS — konkrétne povrchy, textúra a miera nedokonalosti.',
    'LIGHTING — smer, mäkkosť, teplota a tiene.',
    'BRAND LOCK — presné Rise farby a pravidlo, že zlato je iba akcent.',
    'PRESERVE — čo sa pri editácii nesmie zmeniť; reálne UI, logo a text zostávajú pixelovo nezmenené.',
    'EXCLUDE — zakázané osoby, UI, text, logá, metriky, grafy, roboty, neon a watermark.',
    'OUTPUT — pomer strán, kvalita, čistá zóna a požadovaný typ súboru.',
  ],
  examplePrompt: `PURPOSE
Create a calm editorial background for a Rise.sk Decision Note about choosing what to automate first. The image supports a real carousel; it is not product evidence.

SOURCE REFERENCES
Rise brand: https://rise.sk/
Relevant public work: https://rise.sk/portfolio
Use approved Rise asset IDs only as editorial context. Do not redraw or reinterpret their UI.

SUBJECT
One abstract decision path made from three restrained matte layers converging into one clear route. No people and no software interface.

COMPOSITION
Portrait 4:5. Asymmetrical editorial composition. Place the material object in the lower-right third. Keep 65% calm negative space in the upper-left for deterministic typography added later.

MATERIALS
Matte charcoal mineral surface, one thin brushed-brass path, subtle paper-like grain, realistic contact shadow. Tactile and credible, not glossy 3D plastic.

LIGHTING
Soft directional studio light from upper-left, controlled warm highlight, deep clean shadows, no neon glow.

BRAND LOCK
Canvas #080807, surfaces #0C0C0C and #141414, Rise gold #DAB549 used only as a small navigation accent. Strong text color #F8F4EC is reserved for later deterministic layout.

PRESERVE
The generated layer stays separate from real screenshots, logos and copy. Never alter a supplied Rise asset.

EXCLUDE
No people, faces, hands, robots, brains, dashboards, UI, charts, metrics, logos, wordmarks, letters, numbers, watermarks, code, holograms, neon, blue-purple cyberpunk glow, floating decorative particles or fake product screens.

OUTPUT
1080 × 1350 px composition, high-quality opaque image, crisp edges around the main object, quiet background, no embedded text.`,
  negativePrompt:
    'people, person, face, hands, robot, android, AI brain, human silhouette, UI, interface, dashboard, app screen, browser, chart, graph, metric, number, text, typography, letters, logo, wordmark, watermark, code, hologram, neon, blue-purple cyberpunk glow, construction render, developer housing, houses, apartments, real estate stock, synthetic person, glossy plastic, generic stock 3D, floating particles, fake data, fake product',
  generationPolicy: {
    pilotFirstFourWeeks:
      'Generatívne vrstvy produktových postov sú vypnuté. Hlavný vizuál musí vzniknúť deterministicky zo schváleného reálneho UI, pravého loga a Rise tokenov.',
    allowed: [
      'abstraktná dátová vrstva',
      'jednoduchý materiálový objekt',
      'geometrická metafora',
      'editoriálne pozadie s čistou zónou',
    ],
    prohibited: [
      'klientsky produkt alebo UI',
      'osoba, tím Rise alebo podobizeň',
      'logo, text, metrika, graf alebo kód',
      'vymyslený screenshot alebo výsledok',
      'stavebná vizualizácia, domy, byty alebo realitný stock',
      'modrý neón a modro-fialový cyberpunk',
    ],
  },
  platformFormats: {
    instagramCarousel: {
      label: 'Instagram carousel master',
      width: 1080,
      height: 1350,
      aspectRatio: '4:5',
      safeMargin: 84,
      cropRule:
        'Každý tile musí fungovať samostatne. Dôležitý obsah zostáva aspoň 84 px od okraja a prejde kontrolou feed aj grid orezu.',
    },
    verticalVideo: {
      label: 'Instagram/Facebook vertikálne video',
      width: 1080,
      height: 1920,
      aspectRatio: '9:16',
      cropRule:
        'Prvý frame musí fungovať bez zvuku. Titulky a významové prvky držať mimo platformových prekrytí a pred exportom overiť aktuálne UI.',
    },
    linkedinDocument: {
      label: 'LinkedIn PDF dokument',
      width: 1080,
      height: 1350,
      aspectRatio: '4:5',
      minPages: 4,
      maxPages: 8,
      safeMargin: 84,
      cropRule:
        'Exportovať ako flattenovaný PDF dokument; cover a každá strana musia zostať čitateľné na mobile.',
    },
    facebookFeed: {
      label: 'Facebook feed',
      width: 1080,
      height: 1350,
      aspectRatio: '4:5',
      safeMargin: 84,
      cropRule:
        'Použiť jeden hlavný vizuál alebo 2–3 zoradené obrázky; kontrolovať mobilný feed a nepreberať celý LinkedIn carousel.',
    },
    linkedinCover: {
      label: 'LinkedIn company cover',
      width: 4200,
      height: 700,
      aspectRatio: '6:1',
      cropRule:
        'Dôležitý produktový detail a headline držať v strede pre responzívny orez.',
    },
    facebookCover: {
      label: 'Facebook Page cover',
      width: 851,
      height: 315,
      aspectRatio: '851:315',
      cropRule:
        'Nechať pokojnú ľavú zónu pre profilový avatar a overiť desktop aj mobilný orez.',
    },
  },
  seriesRecipes: [
    {
      id: 'inside-the-build',
      label: 'Inside the Build',
      hero:
        'Schválené reálne UI, screen recording alebo verejný diagram je hlavný dôkaz.',
      aiRole:
        'AI môže vytvoriť iba pokojné oddelené pozadie alebo materiálovú vrstvu.',
      composition:
        'Striedať produktový celok, presný detail, diagram a pokojný textový slide.',
      never:
        'Nevymýšľať obrazovku, neprekresľovať UI a neskrývať produkt pod dekoráciou.',
    },
    {
      id: 'decision-note',
      label: 'Decision Note',
      hero:
        'Jednoduchá materiálová metafora voľby, hranice alebo dvoch ciest.',
      aiRole:
        'Povolený je abstraktný objekt bez textu, dát, ľudí a produktového UI.',
      composition:
        'Jedno ohnisko v dolnej alebo pravej tretine a 60–75 % negatívneho priestoru.',
      never:
        'Nevytvárať váhy, šachové figúrky ani iné generické biznis klišé bez presného významu.',
    },
    {
      id: 'growth-system',
      label: 'Growth System',
      hero:
        'Vrstvy alebo prepojený tok produktu, webu, obsahu, SEO a merania.',
      aiRole:
        'AI smie vytvoriť abstraktné vrstvy alebo spojenia; popisy sa skladajú deterministicky.',
      composition:
        'Jasný smer toku, najviac päť významových uzlov a dostatok priestoru na vysvetlenie.',
      never:
        'Žiadne falošné dashboardy, grafy, metriky ani dekoratívna sieť bez informačnej logiky.',
    },
    {
      id: 'signal-vs-noise',
      label: 'Signal vs. Noise',
      hero:
        'Jasný vizuálny kontrast overeného signálu a rušivého šumu.',
      aiRole:
        'Povolená je abstraktná materiálová alebo optická metafora; faktický obsah sa generuje mimo obrazového modelu.',
      composition:
        'Jedna čistá významová vrstva proti kontrolovanému okraju šumu, nie dramatický sci-fi efekt.',
      never:
        'Žiadne AI mozgy, roboty, hologramy, neónové siete alebo modro-fialový cyberpunk.',
    },
    {
      id: 'people-behind-the-product',
      label: 'People Behind the Product',
      hero:
        'Iba reálna schválená fotografia alebo video konkrétneho človeka a pracovného momentu.',
      aiRole:
        'Generovanie osoby, tváre, tela, prostredia alebo podobizne je zakázané.',
      composition:
        'Prirodzený moment, čisté svetlo, autentické pracovné prostredie a priestor na krátky deterministický titulok.',
      never:
        'Žiadni syntetickí ľudia, náhrada člena tímu, beauty retuš meniaca podobu ani falošná kancelária.',
    },
  ],
  chatGptWorkflow: {
    steps: [
      'brand-context',
      'asset-librarian',
      'visual-director',
      'generative-visual',
      'visual-qa',
    ],
    topicOnly:
      'Téma bez priameho pokynu na vytvorenie obrázka pripraví 2–3 art directions a zastaví sa pred generovaním.',
    directGeneration:
      'Pri žiadosti o prvé obrázky načítať starter-pack.json a vrátiť iba jeho schválené médiá. Ak je prázdny, zastaviť; negenerovať náhradu. Priame generovanie je možné až pri neskoršej osobitne schválenej abstraktnej vrstve a neobchádza zdroje, práva, brand-lock ani QA.',
    missingAsset:
      'Ak chýba schválený reálny screenshot, ChatGPT ho nevymyslí. Vyberie abstraktnú vrstvu alebo požiada o konkrétny asset.',
    deterministicAssembly:
      'Reálne UI, ľudia, logo, text, metriky a grafy sa negenerujú. Schválené produktové aktíva a typografia sa skladajú deterministicky.',
  },
  resultContract: [
    'použitý projekt a verejné zdroje',
    'prompt a negative prompt',
    'referenčné asset IDs a ich roly',
    'platforma, rozmery, bezpečná zóna a crop',
    'alt text',
    'model, dátum, parametre a AI provenance',
    'výsledok automatickej QA a body na ľudskú kontrolu',
  ],
  requiredRecipeSources: [
    'https://rise.sk/',
    'https://rise.sk/portfolio',
    'https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide',
    'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum',
  ],
  requiredPromptSignals: [
    ['#080807'],
    ['#DAB549'],
    ['matte', 'matný', 'matná', 'matné'],
    ['light', 'lighting', 'svetlo', 'osvetlenie'],
    ['composition', 'kompozícia'],
    ['negative space', 'negatívny priestor', 'čistá zóna'],
  ],
  qa: {
    beforeGeneration: [
      'Potvrdiť, že reálny screenshot, diagram alebo fotografia nevysvetlí tému lepšie.',
      'Priložiť konkrétnu Rise case study, schválené asset ID a rolu každej referencie.',
      'Ukázať človeku art direction, prompt, zakázané prvky a zamýšľaný crop.',
    ],
    afterGeneration: [
      'Skontrolovať nezmyselný text, logá, objekty, perspektívu, tiene a AI artefakty pri 100 % zoome.',
      'Porovnať každý vložený screenshot a logo pixelovo s originálom.',
      'Overiť 1080 × 1350 px, 84 px safe margin, 4,5 : 1 kontrast, mobilný crop a alt text.',
      'Uložiť model, prompt, negative prompt, zdroje, referencie, parametre, dátum a disclosure.',
      'Bez nového ľudského schválenia sa vizuál nesmie exportovať ani publikovať.',
    ],
  },
} as const;

export type RiseVisualGenerationPlaybook =
  typeof RISE_VISUAL_GENERATION_PLAYBOOK_V1;
