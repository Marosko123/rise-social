# GitHub operating model

Verejný repozitár drží kód, pravidlá, branding, skills, schémy a iba schválené
balíky. GitHub Pages je statická read-only prezentácia na
`https://marosko123.github.io/rise-social/`. JetBrains YouTrack `RISE` drží stav,
vlastníka a termín taskov. SQLite drží drafty, neúspešné runy a dočasné receipts
iba lokálne. GitHub Issues a Projects nie sú druhý task source.

Pages build nesmie obsahovať SQLite, API trasy, AI runner, schvaľovanie, export,
Buffer, plánovanie ani zber metrík. `npm run check:public` kontroluje verejný
zdrojový povrch aj hotový statický export. Credentials zostávajú mimo repozitára
a logov.

Push do `main` najprv spustí celý `verify:pages` gate. Až potom workflow vytvorí
čerstvý statický export, zapíše overený commit a s obmedzeným `contents: write`
oprávnením aktualizuje iba vetvu `gh-pages`. GitHub Pages číta koreň tejto vetvy.
Live smoke čaká na rovnaký commit a až potom kontroluje všetky verejné routy.

Git LFS sleduje schválené PNG/PDF. Lokálny pre-push gate blokuje repozitár nad
10 GiB. Account budget pre LFS musí zostať na 0 USD; aplikácia ho nemení.

GitHub Free sa používa bez platených rozšírení. Pull requesty, CI, lokálny
pre-push gate a chránené Pages prostredie zostávajú povinnou kontrolnou vrstvou.

## Kontrola závislostí

Next a `eslint-config-next` sú pinované na auditovanú verziu `15.5.21`.
`npm audit --audit-level=high` zostáva blokujúcou kontrolou bez výnimiek.
