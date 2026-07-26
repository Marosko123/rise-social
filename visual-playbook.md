# Rise Visual System

Kanonická verzia: `rise-visual-generation-v1` · kontrola 2026-07-25

Softvér, ktorý prináša výsledky. Softvér, dáta a AI. Jeden tím od návrhu po prevádzku.

## Povinný workflow

`brand-context → asset-librarian → visual-director → generative-visual → visual-qa`

Téma bez priameho pokynu na vytvorenie obrázka pripraví 2–3 art directions a zastaví sa pred generovaním.

Pri žiadosti o prvé obrázky načítať starter-pack.json a vrátiť iba jeho schválené médiá. Ak je prázdny, zastaviť; negenerovať náhradu. Priame generovanie je možné až pri neskoršej osobitne schválenej abstraktnej vrstve a neobchádza zdroje, práva, brand-lock ani QA.

Ak chýba schválený reálny screenshot, ChatGPT ho nevymyslí. Vyberie abstraktnú vrstvu alebo požiada o konkrétny asset.

## Brand lock

- Paleta: canvas #080807; surface #0C0C0C; elevated #141414; Rise gold #DAB549; text #F8F4EC.
- Kompozícia: jeden dominantný významový objekt alebo tok; asymetrická, vyvážená editoriálna kompozícia; 60–75 % pokojného negatívneho priestoru; jasná hierarchia celok → detail → vysvetlenie; žiadne dekoratívne častice bez informačnej funkcie.
- Materiály: matný antracitový povrch; jemne vrstvené sklo iba tam, kde vysvetľuje vzťah; teplý minerálny alebo kartónový detail; tenká mosadzná linka v Rise gold, nikdy zlatý lesk cez celý obraz; veľmi jemné prirodzené zrno namiesto sterilného 3D plastu.
- Svetlo: mäkké smerové štúdiové svetlo; kontrolované teplé zvýraznenie; hlboké čisté tiene bez neonovej žiary; realistický kontakt objektu s povrchom.
- Pravidlo: Nie cyberpunk. Nie AI klišé. Nie sterilný stock 3D render. Rise má pôsobiť pokojne, dôveryhodne, materiálovo a produktovo.

## Formáty

- Instagram carousel master: 1080 × 1350 px; Každý tile musí fungovať samostatne. Dôležitý obsah zostáva aspoň 84 px od okraja a prejde kontrolou feed aj grid orezu.
- Instagram/Facebook vertikálne video: 1080 × 1920 px; Prvý frame musí fungovať bez zvuku. Titulky a významové prvky držať mimo platformových prekrytí a pred exportom overiť aktuálne UI.
- LinkedIn PDF dokument: 1080 × 1350 px; Exportovať ako flattenovaný PDF dokument; cover a každá strana musia zostať čitateľné na mobile.
- Facebook feed: 1080 × 1350 px; Použiť jeden hlavný vizuál alebo 2–3 zoradené obrázky; kontrolovať mobilný feed a nepreberať celý LinkedIn carousel.
- LinkedIn company cover: 4200 × 700 px; Dôležitý produktový detail a headline držať v strede pre responzívny orez.
- Facebook Page cover: 851 × 315 px; Nechať pokojnú ľavú zónu pre profilový avatar a overiť desktop aj mobilný orez.

## Série

### Inside the Build

- Hrdina: Schválené reálne UI, screen recording alebo verejný diagram je hlavný dôkaz.
- Úloha AI: AI môže vytvoriť iba pokojné oddelené pozadie alebo materiálovú vrstvu.
- Kompozícia: Striedať produktový celok, presný detail, diagram a pokojný textový slide.
- Nikdy: Nevymýšľať obrazovku, neprekresľovať UI a neskrývať produkt pod dekoráciou.

### Decision Note

- Hrdina: Jednoduchá materiálová metafora voľby, hranice alebo dvoch ciest.
- Úloha AI: Povolený je abstraktný objekt bez textu, dát, ľudí a produktového UI.
- Kompozícia: Jedno ohnisko v dolnej alebo pravej tretine a 60–75 % negatívneho priestoru.
- Nikdy: Nevytvárať váhy, šachové figúrky ani iné generické biznis klišé bez presného významu.

### Growth System

- Hrdina: Vrstvy alebo prepojený tok produktu, webu, obsahu, SEO a merania.
- Úloha AI: AI smie vytvoriť abstraktné vrstvy alebo spojenia; popisy sa skladajú deterministicky.
- Kompozícia: Jasný smer toku, najviac päť významových uzlov a dostatok priestoru na vysvetlenie.
- Nikdy: Žiadne falošné dashboardy, grafy, metriky ani dekoratívna sieť bez informačnej logiky.

### Signal vs. Noise

- Hrdina: Jasný vizuálny kontrast overeného signálu a rušivého šumu.
- Úloha AI: Povolená je abstraktná materiálová alebo optická metafora; faktický obsah sa generuje mimo obrazového modelu.
- Kompozícia: Jedna čistá významová vrstva proti kontrolovanému okraju šumu, nie dramatický sci-fi efekt.
- Nikdy: Žiadne AI mozgy, roboty, hologramy, neónové siete alebo modro-fialový cyberpunk.

### People Behind the Product

- Hrdina: Iba reálna schválená fotografia alebo video konkrétneho človeka a pracovného momentu.
- Úloha AI: Generovanie osoby, tváre, tela, prostredia alebo podobizne je zakázané.
- Kompozícia: Prirodzený moment, čisté svetlo, autentické pracovné prostredie a priestor na krátky deterministický titulok.
- Nikdy: Žiadni syntetickí ľudia, náhrada člena tímu, beauty retuš meniaca podobu ani falošná kancelária.

## Povinný obrazový brief

`purpose → source-references → subject → composition → materials → lighting → brand-lock → preserve → exclude → output`

- PURPOSE — komu obraz pomáha a akú jedinú myšlienku má vysvetliť.
- SOURCE REFERENCES — URL konkrétnej Rise case study, asset ID a rola každého referenčného obrázka.
- SUBJECT — iba abstraktná dátová vrstva, materiálový objekt alebo geometrická metafora.
- COMPOSITION — formát, uhol, ohnisko, umiestnenie a negatívny priestor pre deterministický text/UI.
- MATERIALS — konkrétne povrchy, textúra a miera nedokonalosti.
- LIGHTING — smer, mäkkosť, teplota a tiene.
- BRAND LOCK — presné Rise farby a pravidlo, že zlato je iba akcent.
- PRESERVE — čo sa pri editácii nesmie zmeniť; reálne UI, logo a text zostávajú pixelovo nezmenené.
- EXCLUDE — zakázané osoby, UI, text, logá, metriky, grafy, roboty, neon a watermark.
- OUTPUT — pomer strán, kvalita, čistá zóna a požadovaný typ súboru.

## Negative prompt

people, person, face, hands, robot, android, AI brain, human silhouette, UI, interface, dashboard, app screen, browser, chart, graph, metric, number, text, typography, letters, logo, wordmark, watermark, code, hologram, neon, blue-purple cyberpunk glow, construction render, developer housing, houses, apartments, real estate stock, synthetic person, glossy plastic, generic stock 3D, floating particles, fake data, fake product

## Výsledok musí priložiť

- použitý projekt a verejné zdroje
- prompt a negative prompt
- referenčné asset IDs a ich roly
- platforma, rozmery, bezpečná zóna a crop
- alt text
- model, dátum, parametre a AI provenance
- výsledok automatickej QA a body na ľudskú kontrolu

## Verejné dáta

- Povinný ChatGPT kontext: https://marosko123.github.io/rise-social/chatgpt-context.json
- Asset manifest: https://marosko123.github.io/rise-social/visual-assets.json
- Strojový playbook: https://marosko123.github.io/rise-social/visual-playbook.json
- Schválený starter pack: https://marosko123.github.io/rise-social/starter-pack.json
- Obsahový plán: https://marosko123.github.io/rise-social/content-plan/
- Rise portfólio: https://rise.sk/portfolio

## Oficiálne zdroje

- [Rise.sk — značka a prísľub](https://rise.sk/) — Zdroj pozície značky, jazyka, tmavého produktového priestoru a dôrazu na softvér, dáta, AI a zodpovednosť. Kontrola: 2026-07-25; platnosť: 2026-10-25.
- [Rise.sk — verejné portfólio](https://rise.sk/portfolio) — Register reálnych projektov. Pre konkrétny post treba otvoriť aj presnú verejnú case study a vybrať iba schválený asset ID. Kontrola: 2026-07-25; platnosť: 2026-10-25.
- [OpenAI prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) — Creative brief má explicitne pomenovať kompozíciu, materiály, svetlo, umiestnenie, invarianty, referencie a výstup. Kontrola: 2026-07-25; platnosť: 2026-08-25.
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation) — Oficiálny zdroj pre referenčné obrázky, editovanie, rozmer, kvalitu a ďalšie parametre aktuálneho obrazového workflowu. Kontrola: 2026-07-25; platnosť: 2026-08-25.
- [W3C — WCAG kontrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) — Text a významové prvky musia zostať čitateľné; bežný text cieli aspoň na 4,5 : 1 a veľký text na 3 : 1. Kontrola: 2026-07-25; platnosť: 2027-01-25.
- [Instagram image resolution](https://www.facebook.com/help/instagram/1631821640426723?locale=en_GB) — Oficiálna kontrola rozlíšenia a pomeru strán vo feede; Rise master zostáva 1080 × 1350 px. Kontrola: 2026-07-25; platnosť: 2026-08-25.
- [LinkedIn image specifications](https://www.linkedin.com/help/linkedin/answer/a563309/image-specifications-for-your-linkedin-pages-and-career-pages) — Oficiálne rozmery, centrovanie dôležitého obsahu a kontrola responzívneho orezu. Kontrola: 2026-07-25; platnosť: 2026-08-25.
- [Facebook Page image dimensions](https://www.facebook.com/help/125379114252045/) — Oficiálne rozmery profilovej a cover fotografie vrátane prekrytia ľavej časti a responzívneho orezu. Kontrola: 2026-07-25; platnosť: 2026-08-25.
