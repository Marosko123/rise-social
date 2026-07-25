# YouTrack workflow

Zdroj taskov je JetBrains YouTrack `https://rise.youtrack.cloud`, projekt `RISE`.
GitHub slúži na kód a schválené artefakty, nie ako druhý task board.

Aktuálne overené živé prvky:

- projekt `Rise (RISE)`,
- board `Rise Kanban Board` s ID `204-1`,
- polia `Type` a `State`.

Rozšírené agentické polia a boardy z kanonického `agentic_workflows` zostávajú
guarded rollout; aplikácia ich nesmie predstierať, kým neprejdú live verifikáciou.

## Sync

`prepare` sa pokúsi vytvoriť issue s exact Run ID. Ak token alebo YouTrack nie je
dostupný, run ostane funkčný a uloží `boardSync=pending`.

```bash
# read-only plán
npm run rise-social -- board sync <run-id>

# explicitná idempotentná mutácia
npm run rise-social -- board sync <run-id> --apply
```

Premenné:

- `RISE_SOCIAL_YOUTRACK_BASE_URL=https://rise.youtrack.cloud`
- `RISE_SOCIAL_YOUTRACK_PROJECT=RISE`
- `RISE_SOCIAL_YOUTRACK_BOARD_ID=204-1`
- `RISE_SOCIAL_YOUTRACK_TOKEN` iba v Keychain alebo process environment

Modelovým procesom sa všetky YouTrack tokeny odstraňujú. Odporúčaný dlhodobý smer
je OAuth MCP s obmedzeným zoznamom tools; lokálny REST adaptér ostáva deterministický
pre create/find retry.

Zdroje:

- https://www.jetbrains.com/help/youtrack/cloud/model-context-protocol-server.html
- https://www.jetbrains.com/help/youtrack/devportal/youtrack-rest-api.html
- https://www.jetbrains.com/help/youtrack/devportal/api-howto-create-issue-with-fields.html
