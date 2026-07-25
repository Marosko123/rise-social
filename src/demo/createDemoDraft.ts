import { createDefaultSchedule } from '@/domain/schedule';
import { DraftPackSchema, type DraftPack, type Platform } from '@/domain/schemas';

export function createDemoDraft(now = new Date()): DraftPack {
  const schedule = createDefaultSchedule(now);
  const checkedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1_000,
  ).toISOString();
  const platforms = (
    postIndex: number,
    captions: Record<Platform, string>,
    altText: string,
  ) =>
    Object.fromEntries(
      (['instagram', 'linkedin', 'facebook'] as Platform[]).map(platform => [
        platform,
        {
          platform,
          caption: captions[platform],
          altText,
          scheduledFor: schedule[postIndex].byPlatform[platform],
          link:
            postIndex === 0
              ? 'https://rise.sk/portfolio/ai-erp'
              : postIndex === 1
                ? 'https://rise.sk/portfolio/grant-ai'
                : 'https://rise.sk/o-nas',
        },
      ]),
    );

  return DraftPackSchema.parse({
    schemaVersion: 2,
    brief: 'Ukážkový balík vytvorený iba z verejných stránok Rise.',
    generatedAt: now.toISOString(),
    author: 'codex',
    critic: 'claude',
    warnings: ['Ukážkový obsah. Pred publikovaním ho upravte alebo spustite nový agentový výskum.'],
    sources: [
      {
        id: 'rise-mojafirma',
        url: 'https://rise.sk/portfolio/ai-erp',
        title: 'MojaFirma pre dokumenty a firemnú administratívu',
        publisher: 'Rise',
        checkedAt: now.toISOString(),
        claim: 'MojaFirma spája dokumenty, financie a úlohy do jedného pracovného toku.',
      },
      {
        id: 'rise-grantai',
        url: 'https://rise.sk/portfolio/grant-ai',
        title: 'GrantAI pre grantové výzvy, oprávnenosť a riadenie projektu',
        publisher: 'Rise',
        checkedAt: now.toISOString(),
        claim:
          'GrantAI spája grantové zdroje, profil organizácie a dokumenty výzvy v jednom produkte.',
      },
      {
        id: 'rise-about',
        url: 'https://rise.sk/o-nas',
        title: 'O Rise',
        publisher: 'Rise',
        checkedAt: now.toISOString(),
        claim:
          'Rise navrhuje, vyvíja a prevádzkuje digitálne produkty, interné systémy a dátové riešenia.',
      },
    ],
    assetRecords: [
      {
        id: 'rise-home',
        visualClass: 'product-screenshot',
        origin: 'rise-owned',
        owner: 'Rise.sk',
        license: 'owned',
        project: 'Rise.sk',
        confidentiality: 'public',
        allowedPlatforms: ['instagram', 'linkedin', 'facebook'],
        redactionStatus: 'not-required',
        sourceUrl: 'https://rise.sk/portfolio/rise-sk',
        path: '/portfolio/projects/rise-sk/history/rise-home-current-2026-07.webp',
        contentSha256: '534965753f8ca58abbe233770a7db0cc29efe91aff5f5a9c01223ba22a812ea1',
        approved: true,
        rightsStatus: 'confirmed',
        rightsReference: 'Rise.sk internal ownership register',
        rightsNote: 'Vlastnený verejný podklad Rise.sk.',
        rightsEvidence:
          'Interný register vlastníctva; aktuálnosť obrazovky sa kontroluje pred renderom.',
        qualityNote: 'Verejný webový detail vhodný pre produktový kontext.',
        aiEdited: false,
        requiresVisualApproval: false,
      },
      {
        id: 'grantai-ui',
        visualClass: 'product-screenshot',
        origin: 'client-approved',
        owner: 'GrantAI / držiteľ práv nepotvrdený',
        license: 'client-approved',
        project: 'GrantAI',
        confidentiality: 'public',
        allowedPlatforms: [],
        redactionStatus: 'not-required',
        sourceUrl: 'https://rise.sk/portfolio/grant-ai',
        path: '/portfolio/showcase/grant-ai/cover.webp',
        contentSha256: 'a78bc3cbf58fb6736ac459751e13c14528d6dbcab4ee48743127c2162b3b20c8',
        approved: false,
        rightsStatus: 'needs-confirmation',
        rightsNote:
          'Verejné zobrazenie na rise.sk nie je automatické povolenie na sociálne siete.',
        rightsEvidence:
          'Pred renderom chýba samostatne doložené povolenie na opätovné použitie.',
        qualityNote: 'Skontrolovať, že obrazovka neobsahuje údaje organizácie.',
        aiEdited: false,
        requiresVisualApproval: true,
      },
    ],
    workflowContext: {
      topicRequest: {
        topic:
          'Ako Rise prepája rozhodnutie, verejný dôkaz a ľudskú kontrolu pri softvéri a AI.',
        audience: 'Majitelia a riaditelia slovenských firiem.',
        goal: 'Zvýšiť odbornú dôveru a návštevy verejných projektov.',
        mode: 'campaign',
        requestedPostCount: 3,
        projectUrls: [
          'https://rise.sk/portfolio/ai-erp',
          'https://rise.sk/portfolio/grant-ai',
        ],
        sourceUrls: [
          'https://rise.sk/portfolio/ai-erp',
          'https://rise.sk/portfolio/grant-ai',
          'https://rise.sk/o-nas',
        ],
        allowGenerativeVisuals: false,
      },
      editorialBrief: {
        buyerQuestion:
          'Ako rozpoznať softvérový alebo AI projekt, ktorý má jasný zdroj, hranice a vlastníka?',
        risePerspective:
          'Najprv pomenovať rozhodnutie a dôkaz, potom navrhnúť kontrolovaný pracovný tok.',
        desiredAction:
          'Prejsť na verejnú case study a otvoriť kvalifikovaný rozhovor.',
        businessFit:
          'Ukazuje zodpovedný spôsob dodávky Rise cez verejné produktové podklady.',
        riskFlags: [],
        approvalState: 'pending',
      },
      campaignDecision: {
        requestedMode: 'campaign',
        resolvedMode: 'campaign',
        postCount: 3,
        evidenceInsightCount: 3,
        visualClassCount: 3,
        buyerQuestionCount: 3,
        reason:
          'Demo má tri odlišné otázky a dôkazy; nejde o automaticky publikovateľnú kampaň.',
      },
      claimLedger: [
        {
          id: 'claim-rise-mojafirma',
          sourceId: 'rise-mojafirma',
          sourceUrl: 'https://rise.sk/portfolio/ai-erp',
          claim:
            'MojaFirma spája dokumenty, financie a úlohy do jedného pracovného toku.',
          evidence:
            'Verejná case study MojaFirma slúži ako presný zdroj produktového tvrdenia.',
          checkedAt,
          risk: 'stable',
          expiresAt,
        },
        {
          id: 'claim-rise-grantai',
          sourceId: 'rise-grantai',
          sourceUrl: 'https://rise.sk/portfolio/grant-ai',
          claim:
            'GrantAI spája grantové zdroje, profil organizácie a dokumenty výzvy.',
          evidence:
            'Verejná case study GrantAI; bez používateľských alebo rozpracovaných dát.',
          checkedAt,
          risk: 'current',
          expiresAt,
        },
        {
          id: 'claim-rise-about',
          sourceId: 'rise-about',
          sourceUrl: 'https://rise.sk/o-nas',
          claim:
            'Rise prepája produktové rozhodovanie, dizajn, vývoj a prevádzku.',
          evidence: 'Verejná stránka O Rise.',
          checkedAt,
          risk: 'stable',
          expiresAt,
        },
      ],
      visualDirections: [
        {
          id: 'rise-owned-product-direction',
          visualClass: 'product-screenshot',
          rationale:
            'Vlastnený verejný detail ukáže produktový dôkaz bez falošného rozhrania.',
          narrative: 'Problém → verejný produktový detail → kontrolný krok.',
          layout: '4:5 produktový detail s pokojným textovým slidom',
          assetIds: ['rise-home'],
          crop: '1080 × 1350, stredový výrez',
          safeZones: ['84 px zo všetkých strán'],
          allowGenerativeVisuals: false,
        },
        {
          id: 'grantai-rights-direction',
          visualClass: 'product-screenshot',
          rationale:
            'Verejný GrantAI detail môže byť kandidátom až po potvrdení práv a dát.',
          narrative: 'Zdroj → produktový detail → rozhodovacia hranica.',
          layout: '4:5 detail s oddelením návrhu a rozhodnutia',
          assetIds: ['grantai-ui'],
          crop: '1080 × 1350, bez údajov organizácie',
          safeZones: ['84 px zo všetkých strán'],
          allowGenerativeVisuals: false,
        },
      ],
      assetRights: [
        {
          assetId: 'rise-home',
          status: 'confirmed',
          reference: 'Rise.sk internal ownership register',
        },
        {
          assetId: 'grantai-ui',
          status: 'needs-confirmation',
          reference: 'Verejná case study nie je potvrdenie práv pre sociálne siete.',
        },
      ],
      cropsRedactions: [
        {
          assetId: 'rise-home',
          crop: '1080 × 1350, stredový výrez',
          redactions: [],
        },
        {
          assetId: 'grantai-ui',
          crop: '1080 × 1350, bez údajov organizácie',
          redactions: ['Overiť a odstrániť identifikátory organizácie.'],
        },
      ],
      visualQaFindings: [
        {
          visualDirectionId: 'rise-owned-product-direction',
          status: 'pass',
          findings: ['Alt text, 84 px okraj a čitateľnosť vyhovujú návrhu.'],
          altTextPassed: true,
          cropPassed: true,
          humanInspectionRequired: true,
        },
        {
          visualDirectionId: 'grantai-rights-direction',
          status: 'manual-review',
          findings: [
            'Pred renderom treba potvrdiť práva a skontrolovať všetky produktové údaje.',
          ],
          altTextPassed: true,
          cropPassed: false,
          humanInspectionRequired: true,
        },
      ],
      generationProvenance: [],
      firstCritique: {
        approved: false,
        blocker: true,
        issues: ['Chýba potvrdenie práv pre GrantAI vizuál.'],
        revisionInstructions:
          'Potvrďte práva alebo nahraďte vizuál vlastneným diagramom.',
        scorecard: {
          factualAccuracy: 5,
          voice: 4,
          specificity: 4,
          continuity: 4,
          visualClarity: 3,
          businessFit: 4,
          passed: false,
          notes: ['Obsah zostáva konceptom až do vyriešenia vizuálnych práv.'],
        },
      },
      finalValidation: {
        approved: false,
        blocker: true,
        issues: ['Vizuálny rights gate stále čaká na človeka.'],
        revisionInstructions: 'Nevyvážať ani neplánovať.',
        scorecard: {
          factualAccuracy: 5,
          voice: 4,
          specificity: 4,
          continuity: 4,
          visualClarity: 3,
          businessFit: 4,
          passed: false,
          notes: ['Druhý kontrolný krok ponechal balík v stave konceptu.'],
        },
      },
    },
    posts: [
      {
        id: 'process-before-ai',
        theme: 'education',
        title: 'Automatizácia nezačína modelom',
        summary: 'Päť otázok pred prvým automatizovaným krokom.',
        sourceIds: ['rise-mojafirma'],
        visualKind: 'branded-diagram',
        slides: [
          {
            id: 'process-1',
            eyebrow: '01 / PROCES',
            title: 'Automatizácia nezačína modelom',
            body: 'Začína miestom, kde ľudia prepisujú rovnaký údaj alebo opravujú rovnakú chybu.',
            alt: 'Titulná karta o začiatku automatizácie.',
          },
          {
            id: 'process-2',
            eyebrow: '02 / VSTUP',
            title: 'Ktorý údaj je zdrojový?',
            body: 'Ak má rovnaká informácia tri verzie, automatizácia nevie, ktorej má veriť.',
            alt: 'Karta o určení zdrojového údaja.',
          },
          {
            id: 'process-3',
            eyebrow: '03 / KONTROLA',
            title: 'Kto potvrdí výnimku?',
            body: 'Nie každý prípad patrí stroju. Človek musí vedieť zasiahnuť a rozhodnutie dohľadať.',
            alt: 'Karta o ľudskej kontrole výnimiek.',
          },
          {
            id: 'process-4',
            eyebrow: '04 / MERANIE',
            title: 'Čo sa má zlepšiť?',
            body: 'Čas spracovania, počet opráv alebo chýb. Bez merania zostane iba dojem.',
            alt: 'Karta o meraní výsledku automatizácie.',
          },
          {
            id: 'process-5',
            eyebrow: '05 / ROZSAH',
            title: 'Začnite jedným tokom',
            body: 'MojaFirma spája dokumenty, financie a úlohy. Každý krok však musí mať jasný dôvod.',
            alt: 'Záverečná karta s ukážkou produktu MojaFirma.',
          },
        ],
        platforms: platforms(
          0,
          {
            instagram:
              'AI nie je prvý krok. Najprv treba nájsť údaj, ktorý tím prepisuje, a rozhodnutie, ktoré sa stráca. Päť otázok pred automatizáciou nájdete v karuseli. #automatizacia #softver #rise',
            linkedin:
              'Pri automatizácii nezačíname výberom modelu. Najprv si označíme zdrojové dáta, výnimky a výsledok, ktorý má zmysel merať. Tento postup používame aj pri produktoch, ako je MojaFirma. #automatizacia #softver',
            facebook:
              'Automatizácia má zmysel až vtedy, keď poznáme zdrojové dáta, výnimky a merateľný výsledok. Spísali sme päť otázok, ktoré riešime pred prvým automatizovaným krokom. #automatizacia',
          },
          'Päť kariet o praktickej príprave procesu pred automatizáciou.',
        ),
      },
      {
        id: 'grantai-product-flow',
        theme: 'product',
        title: 'Grantová výzva nie je iba PDF',
        summary: 'GrantAI prepája výzvu, profil organizácie a ďalší krok.',
        sourceIds: ['rise-grantai'],
        visualKind: 'product-screenshot',
        slides: [
          {
            id: 'grantai-1',
            eyebrow: '01 / GRANTAI',
            title: 'Grantová výzva nie je iba PDF',
            body: 'Rozhoduje súvis medzi podmienkami výzvy, profilom organizácie a pripravenosťou tímu.',
            alt: 'Titulná karta o pracovnom postupe GrantAI.',
          },
          {
            id: 'grantai-2',
            eyebrow: '02 / ZDROJE',
            title: 'Výzva potrebuje pôvod',
            body: 'Používateľ musí vidieť, z akého dokumentu podmienka pochádza a kedy bola overená.',
            alt: 'Karta o dohľadateľnosti grantového zdroja.',
          },
          {
            id: 'grantai-3',
            eyebrow: '03 / PROFIL',
            title: 'Profil mení odpoveď',
            body: 'Rovnaká výzva môže byť vhodná pre jednu organizáciu a nepoužiteľná pre inú.',
            alt: 'Karta o porovnaní výzvy s profilom organizácie.',
          },
          {
            id: 'grantai-4',
            eyebrow: '04 / DOKUMENTY',
            title: 'Podklady patria k rozhodnutiu',
            body: 'Dokumenty výzvy nemajú zostať v samostatnom priečinku bez kontextu.',
            alt: 'Karta o spojení dokumentov s rozhodnutím.',
          },
          {
            id: 'grantai-5',
            eyebrow: '05 / ĎALŠÍ KROK',
            title: 'Výsledok musí viesť ďalej',
            body: 'GrantAI spája zdroje, profil a dokumenty, aby tím vedel, čo má urobiť potom.',
            alt: 'Záverečná karta s pracovným priestorom GrantAI.',
          },
        ],
        platforms: platforms(
          1,
          {
            instagram:
              'Grantová výzva sama nestačí. Tím potrebuje vidieť zdroj, porovnať podmienky s profilom organizácie a udržať dokumenty pri rozhodnutí. Tak sme postavili tok GrantAI. #grantai #produkt #rise',
            linkedin:
              'Pri GrantAI sme nepostavili produkt okolo zoznamu výziev. Pracovný tok spája grantové zdroje, profil organizácie a dokumenty výzvy. Používateľ tak vidí pôvod podmienky aj ďalší krok. #grantai #produkt',
            facebook:
              'GrantAI spája výzvu, profil organizácie a dokumenty v jednom pracovnom toku. V karuseli ukazujeme päť rozhodnutí, ktoré držia produkt pri reálnej práci. #grantai',
          },
          'Päť produktových kariet o pracovnom toku GrantAI.',
        ),
      },
      {
        id: 'product-decisions-first',
        theme: 'human',
        title: 'Kód nie je prvá odpoveď',
        summary: 'Ako Rise prepája produktové rozhodnutie, dizajn a realizáciu.',
        sourceIds: ['rise-about'],
        visualKind: 'team-photo',
        slides: [
          {
            id: 'team-1',
            eyebrow: '01 / RISE',
            title: 'Kód nie je prvá odpoveď',
            body: 'Najprv potrebujeme pochopiť rozhodnutie, ktoré má softvér podporiť.',
            alt: 'Titulná karta s portrétom tímu Rise.',
          },
          {
            id: 'team-2',
            eyebrow: '02 / DNES',
            title: 'Ukážte nám dnešný postup',
            body: 'Skutočný dokument a reálny krok povedia viac než ideálny proces na jednej snímke.',
            alt: 'Karta o pochopení dnešného pracovného postupu.',
          },
          {
            id: 'team-3',
            eyebrow: '03 / ROZHODNUTIE',
            title: 'Pomenujte, čo sa má zmeniť',
            body: 'Produktové rozhodnutie určuje rozsah. Technológia ho má podporiť, nie zakryť.',
            alt: 'Karta o pomenovaní produktového rozhodnutia.',
          },
          {
            id: 'team-4',
            eyebrow: '04 / NÁVRH',
            title: 'Dizajn preverí logiku',
            body: 'Skôr než systém vyrastie, musí byť jasné, kto ho používa a čo potrebuje dokončiť.',
            alt: 'Karta o overení logiky návrhom.',
          },
          {
            id: 'team-5',
            eyebrow: '05 / REALIZÁCIA',
            title: 'Potom za produkt ručíme',
            body: 'Rise prepája produktové rozhodovanie, dizajn, vývoj a prevádzku v jednom tíme.',
            alt: 'Záverečná karta o zodpovednosti tímu Rise.',
          },
        ],
        platforms: platforms(
          2,
          {
            instagram:
              'Prvý krok projektu nie je výber frameworku. Potrebujeme vidieť dnešný postup, pomenovať rozhodnutie a overiť logiku návrhom. Až potom prichádza kód. #timrise #vyvoj #produkt',
            linkedin:
              'Softvér nezačíname zoznamom technológií. Najprv si prejdeme dnešný pracovný postup a rozhodnutie, ktoré má produkt podporiť. Rise potom prepája návrh, vývoj aj prevádzku v jednom tíme. #vyvoj #produkt',
            facebook:
              'Na začiatku projektu potrebujeme pochopiť dnešný postup a rozhodnutie, ktoré má softvér podporiť. Technológia prichádza až potom. #timrise',
          },
          'Päť kariet o tom, ako Rise začína produktové a softvérové projekty.',
        ),
      },
    ],
  });
}
