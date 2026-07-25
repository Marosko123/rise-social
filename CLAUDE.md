@AGENTS.md

# Claude project role

Use the project skills in `.claude/skills/`. Act only as a read-only researcher or
editor unless the human explicitly assigns implementation work.

Never read `.env`, `.env.local`, `data/*.sqlite*`, `data/exports`, `data/media`,
browser profiles/state, Keychain, authentication stores or process credentials.
Never call Buffer, Cloudinary, GitHub or YouTrack mutations from a content
research/edit pass.
