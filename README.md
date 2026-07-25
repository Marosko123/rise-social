# Rise Social Studio

Lokálne, schvaľovaním chránené štúdio pre organický obsah Rise.sk. Predvolene vytvorí
jeden zdrojovaný master post; kampaň s dvoma až troma postmi vznikne iba pri dostatku
rôznych dôkazov. Každý post má osobitné verzie pre LinkedIn, Instagram a Facebook.
GitHub repozitár je verejný kvôli bezplatnej read-only GitHub Pages prezentácii;
tasky patria do JetBrains YouTrack projektu `RISE`.

## Spustenie

```bash
npm install
npx playwright install chromium
cp .env.example .env.local
npm run dev
```

Review: `http://127.0.0.1:4173/review`
Content plán: `http://127.0.0.1:4173/content-plan`
Vizuálny playbook: `http://127.0.0.1:4173/content-plan#visual-generation-title`

Aplikácia počúva iba na `127.0.0.1`. Bez cloudu funguje výskum, lokálny review,
manuálne schválenie aj export PNG/PDF.

Verejná prezentácia: `https://marosko123.github.io/rise-social/`

GitHub Pages obsahuje iba statický content plán a bezpečnú read-only ukážku
reviewu. Verejný ChatGPT-ready vizuálny systém je na:

- `https://marosko123.github.io/rise-social/visual-playbook/`
- `https://marosko123.github.io/rise-social/visual-playbook.json`
- `https://marosko123.github.io/rise-social/visual-playbook.md`
- `https://marosko123.github.io/rise-social/visual-assets.json`

Neobsahuje SQLite, lokálne runy, API, AI runner, schvaľovanie, export, Buffer,
plánovanie ani publikovanie. Asset manifest nezverejňuje interné práva ani
citlivé poznámky.

## Pracovný tok

```bash
npm run rise-social -- doctor

# Offline ukážka bez modelov
npm run rise-social -- prepare "Ukážka" --demo

# Verejný výskum + adaptívny single post + striedajúci sa autor/kritik
npm run rise-social -- prepare "Kedy modernizovať existujúci systém" \
  --mode auto \
  --audience owners \
  --goal consideration

# Kanonický verejný projekt automaticky doplní jeho case-study URL
npm run rise-social -- prepare "Čo ukáže mapa lepšie než tabuľka" \
  --project mapatrhu

# Mini-kampaň je najviac trojpostová a neobchádza zdrojové ani review brány
npm run rise-social -- prepare "Modernizovať alebo prepisovať" \
  --mode campaign \
  --project slates

# Vlastný verejný HTTPS zdroj
npm run rise-social -- prepare "Konkrétny brief" \
  --source https://rise.sk/portfolio/grant-ai

npm run rise-social -- review
npm run rise-social -- export <run-id>
npm run rise-social -- archive <run-id>
```

Sekvencia je human-gated a adaptívna:

`topic → business brief → risk gate → research → claim ledger → continuity → visual directions → asset rights → draft → platform variants → render → independent critique → one revision → independent validation → human approval → export/schedule approval → measurement`

Platformové varianty používajú samostatné skills:

- `rise-linkedin-post`: odborná perspektíva, dôkaz, PDF dokument;
- `rise-instagram-post`: 1080×1350 carousel, alt text, grid a „odkaz v profile“;
- `rise-facebook-post`: kratší konverzačný text a zoradené obrázky.

Detailné pravidlá a zdroje sú v `docs/PLATFORM_PLAYBOOK.md`.

## YouTrack

```bash
# Bez mutácie
npm run rise-social -- board sync <run-id>

# Explicitný idempotentný sync do RISE
npm run rise-social -- board sync <run-id> --apply
```

`prepare` sa môže pokúsiť vytvoriť issue automaticky. Bez
`RISE_SOCIAL_YOUTRACK_TOKEN` pokračuje lokálne a uloží `boardSync=pending`.
Podrobnosti sú v `docs/YOUTRACK_WORKFLOW.md`.

## História a schválený archív

```bash
npm run rise-social -- history import <history.json|history.csv>
npm run rise-social -- archive <run-id>
```

Drafty a chyby ostávajú v ignorovanej SQLite. Do `content/approved` sa dostane iba
aktuálny browser-approved, non-demo pack. PNG/PDF v tomto adresári používa Git LFS;
pre-push gate zablokuje lokálny súčet nad 10 GiB a nikdy nezapne platenie.

## Voliteľný Buffer a Cloudinary

```bash
# Iba Buffer drafty aktuálneho schváleného adaptívneho balíka
npm run rise-social -- stage <run-id>

# Po novej samostatnej approval
npm run rise-social -- schedule <run-id>

npm run rise-social -- cleanup
```

Cloudinary sa používa iba pre schválené médiá potrebné Bufferom. Partial failure sa
zastaví na manuálne zosúladenie. Modelové procesy nikdy nedostanú GitHub, YouTrack,
Buffer, Cloudinary ani provider credentials.

## Kontroly

```bash
npm run verify
npm run test:e2e
npm run verify:push
npm run verify:pages
```

Next a `eslint-config-next` sú pinované na auditovanú verziu `15.5.21`.
`npm audit --audit-level=high` je blokujúca release kontrola bez výnimiek.

Repozitár: `https://github.com/Marosko123/rise-social`
