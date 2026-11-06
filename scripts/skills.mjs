#!/usr/bin/env node
/**
 * Skills housekeeping. `.claude/skills/<name>/SKILL.md` is the single source of truth.
 *
 *   node scripts/skills.mjs check   — every skill has front matter whose `name` matches its folder and a description
 *   node scripts/skills.mjs sync    — mirror the skills to `.cursor/skills/` for Cursor users (git-ignored copy)
 *   node scripts/skills.mjs list    — print the catalogue (name — description)
 */
import { readdir, readFile, rm, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, '.claude', 'skills');
const MIRROR = path.join(ROOT, '.cursor', 'skills');
const cmd = process.argv[2] ?? 'check';

function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const get = (k) => {
    const line = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(m[1]);
    if (!line) return '';
    let v = line[1].trim();
    if (v === '>-' || v === '>' || v === '|') {
      const after = m[1].slice(m[1].indexOf(line[0]) + line[0].length).split('\n').filter((l) => /^\s+\S/.test(l));
      v = after.map((l) => l.trim()).join(' ');
    }
    return v.replace(/^["']|["']$/g, '');
  };
  return { name: get('name'), description: get('description') };
}

const dirs = (await readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const skills = [];
const problems = [];
for (const d of dirs) {
  let text;
  try {
    text = await readFile(path.join(SRC, d, 'SKILL.md'), 'utf8');
  } catch {
    problems.push(`${d}: missing SKILL.md`);
    continue;
  }
  const fm = frontMatter(text);
  if (!fm) problems.push(`${d}: no front matter`);
  else {
    if (fm.name !== d) problems.push(`${d}: name "${fm.name}" does not match folder`);
    if (!fm.description) problems.push(`${d}: missing description`);
    skills.push({ name: d, description: fm.description });
  }
}

if (cmd === 'list') {
  for (const s of skills) console.log(`${s.name} — ${s.description}`);
} else if (cmd === 'sync') {
  await rm(MIRROR, { recursive: true, force: true });
  await mkdir(MIRROR, { recursive: true });
  for (const s of skills) await cp(path.join(SRC, s.name), path.join(MIRROR, s.name), { recursive: true });
  console.log(`skills: mirrored ${skills.length} skill(s) to .cursor/skills`);
}
if (problems.length) {
  console.error(problems.map((p) => `  ✗ ${p}`).join('\n'));
  console.error(`skills: ${problems.length} problem(s)`);
  process.exit(1);
}
if (cmd === 'check') console.log(`skills: ${skills.length} skill(s), all valid ✓`);
