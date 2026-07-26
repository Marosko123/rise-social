# Rise Instagram App Carousel

Kanonická verzia: `rise-instagram-app-carousel-v1` · kontrola 2026-07-26

Prezentovať konkrétnu aplikáciu ako krátku, zdrojovanú produktovú case study. Každý slide vysvetľuje jednu vec a reálne UI ostáva hlavným dôkazom.

## Načítanie pre ChatGPT

`rise-brand-context → rise-brand-copy → rise-brand-assets → rise-instagram-carousel-playbook → exact-public-case-study → rise-visual-qa`

## Formát

- 1080 × 1350 px, 4:5
- 12-stĺpcový grid, bezpečný okraj 84 px
- 7 slidov; 6 iba ak chýba verejný dôkaz

## Príbeh aplikácie

1. **cover** — Čo aplikácia zjednodušuje? Názov projektu a autentický produktový celok alebo detail.
2. **problem** — Kde vznikalo konkrétne trenie? Verejne opísaná situácia používateľa alebo firmy.
3. **scope** — Čo presne Rise dodalo? Verejne potvrdený rozsah návrhu, vývoja alebo integrácie.
4. **flow** — Ako funguje kľúčový tok? Tri až päť podložených krokov od vstupu po stav alebo výsledok.
5. **ui-detail** — Ktorý detail vysvetlí hodnotu najlepšie? Jedna pixelovo nezmenená reálna obrazovka a najviac tri callouty.
6. **decision** — Aký dôležitý kompromis sme vyriešili? Podložené UX, integračné, dátové alebo technické rozhodnutie. Ak chýba dôkaz, tento slide sa vynechá.
7. **evidence** — Čo vieme verejne preukázať a kam ďalej? Iba verejný výsledok, stav alebo dodaný rozsah; prirodzený odkaz na case study.

## Text

- Cover: 3–7 slov, najviac 2 riadky
- Obsahový headline: 2–7 slov
- Body: 8–24 slov, najviac 2 vety
- Slide spolu: najviac 30 slov
- Callout: 2–4 slová, najviac 3
- Každá faktická veta a každý slide musia odkazovať aspoň na jeden platný claim ID.

## Brand a produktový dôkaz

- Playfair Display iba na krátky headline; Inter na funkčný text.
- Canvas #080807; surface #0C0C0C; gold #DAB549; text #F8F4EC.
- UI sa negeneruje, neprekresľuje, nedeformuje perspektívou ani významovo nemení. Crop zachová funkciu, navigáciu a kontext.
- Renderovať možno iba asset so stavom approved. reference-only slúži iba na art direction a nemá lokálnu verejnú kópiu.
- Logo: asset `rise-logo-symbol-svg` + presný text `rise.sk`.

## QA

- Pred renderom: 6–7 slidov a povinné role v správnom poradí
- Pred renderom: jedna myšlienka a platný claim ID na každom slide
- Pred renderom: textové a riadkové limity
- Pred renderom: aspoň dva odlišné druhy produktového dôkazu
- Pred renderom: schválené asset ID, presný hash, crop, focal point a preserve pravidlo
- Pred renderom: originálny Rise symbol a načítané lokálne fonty
- Po renderi: 1080 × 1350 PNG bez overflowu a mimo 84 px safe zóny
- Po renderi: kontrast, čitateľnosť pri 390 px a viditeľný progress
- Po renderi: pixelovo nezmenené UI, logo a správny crop
- Po renderi: cover v Instagram feede, samostatné grid tiles a detail UI pri 100 %
- Po renderi: alt text pre každý slide a ľudské schválenie pred exportom

## Verejné kontrakty

- Brand assety: https://marosko123.github.io/rise-social/brand-assets.json
- Kanonické texty: https://marosko123.github.io/rise-social/brand-copy.json
- Bezpečný katalóg obrázkov: https://marosko123.github.io/rise-social/visual-assets.json
- Vizuálny AI playbook: https://marosko123.github.io/rise-social/visual-playbook.json

## Zdroje

- [instagram-resolution](https://www.facebook.com/help/1631821640426723/) — Oficiálne pravidlá rozlíšenia a pomeru strán Instagram obrázkov.
- [instagram-carousel](https://www.facebook.com/help/instagram/269314186824048) — Oficiálne pravidlá spoločnej orientácie položiek carouselu.
- [instagram-alt-text](https://www.facebook.com/help/instagram/503708446705527/) — Oficiálna možnosť manuálne upraviť alt text.
- [wcag-text-contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — Minimálny kontrast textu.
- [wcag-non-text-contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) — Minimálny kontrast významových grafických prvkov.
- [adobe-social-design](https://www.adobe.com/express/learn/blog/design-tips-for-social-media-graphics) — Jasná hierarchia, krátky text, jedno ohnisko a mobile-first kontrola.
