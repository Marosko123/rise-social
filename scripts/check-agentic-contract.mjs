import { lstat, readFile, readlink } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const skills = [
  'rise-brand-context',
  'rise-social-research',
  'rise-social-continuity',
  'rise-slovak-human-copy',
  'rise-linkedin-post',
  'rise-instagram-post',
  'rise-facebook-post',
  'rise-carousel',
  'rise-editorial-review',
  'rise-youtrack-sync',
  'rise-publish-approved',
  'rise-topic-intake',
  'rise-campaign-architect',
  'rise-asset-librarian',
  'rise-visual-director',
  'rise-generative-visual',
  'rise-visual-qa',
  'rise-content-measurement',
];

const upstream = JSON.parse(await readFile(join(root, '.agentic', 'upstream.json'), 'utf8'));
if (upstream.commit !== 'fd52a26b726ace5db1195c4b50ce4689eca22add') {
  throw new Error('Agentic upstream lock changed without an explicit update.');
}
const link = join(root, '.claude', 'skills');
if (!(await lstat(link)).isSymbolicLink() || (await readlink(link)) !== '../.agents/skills') {
  throw new Error('.claude/skills must be a relative symlink to ../.agents/skills.');
}
for (const skill of skills) {
  const content = await readFile(join(root, '.agents', 'skills', skill, 'SKILL.md'), 'utf8');
  if (!content.startsWith(`---\nname: ${skill}\n`)) {
    throw new Error(`Invalid skill contract: ${skill}.`);
  }
}
const agentContract = await readFile(join(root, 'AGENTS.md'), 'utf8');
if (/api[_ -]?key\s*[:=]\s*\S+/iu.test(agentContract)) {
  throw new Error('AGENTS.md appears to contain a credential.');
}
console.log(`Agentic contract valid (${skills.length} skills).`);
