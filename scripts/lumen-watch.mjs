#!/usr/bin/env node
/**
 * Lumen watch: notices when the design system changes, so the agent never designs against a stale Lumen.
 *
 *   node scripts/lumen-watch.mjs           compare with the last snapshot; record any change in knowledge/lumen/CHANGELOG.md
 *   node scripts/lumen-watch.mjs --check   report only (exit 1 if Lumen changed since the last recorded snapshot)
 *   node scripts/lumen-watch.mjs --json    machine-readable summary (used by the Design Studio)
 *
 * What it tracks
 *   tokens      tokens/figma/*.json   (Figma "Lumen token sync" plugin exports): every brand/mode/token value
 *   components  src/components/lumen, apps/live-site/components/{lumen,ui,site}: every exported component name
 * When something is removed or renamed it lists where prototypes and handoffs still use it.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'knowledge', 'lumen');
const SNAP = path.join(OUT_DIR, 'snapshot.json');
const LOG = path.join(OUT_DIR, 'CHANGELOG.md');
const TOKEN_DIR = path.join(ROOT, 'tokens', 'figma');
const COMPONENT_DIRS = ['src/components/lumen', 'apps/live-site/components/lumen', 'apps/live-site/components/ui', 'apps/live-site/components/site'];
const USAGE_DIRS = ['apps/live-site/app/prototype', 'specs'];
const args = new Set(process.argv.slice(2));

async function* walk(dir) {
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}

async function tokens() {
  const out = {};
  for (const f of (await readdir(TOKEN_DIR)).filter((f) => f.endsWith('.json')).sort()) {
    const data = JSON.parse(await readFile(path.join(TOKEN_DIR, f), 'utf8'));
    for (const [brand, modes] of Object.entries(data.brands ?? {})) {
      for (const [mode, vars] of Object.entries(modes ?? {})) {
        for (const [name, value] of Object.entries(vars ?? {})) out[`${brand}/${mode} ${name}`] = String(value);
      }
    }
  }
  return out;
}

async function components() {
  const out = {};
  for (const d of COMPONENT_DIRS) {
    for await (const file of walk(path.join(ROOT, d))) {
      if (!/\.tsx$/.test(file) || /\.stories\.tsx$/.test(file)) continue;
      const text = await readFile(file, 'utf8');
      for (const m of text.matchAll(/^export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z]\w+)/gm)) out[m[1]] = path.relative(ROOT, file);
      for (const m of text.matchAll(/^export\s*\{([^}]+)\}/gm)) for (const n of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop())) if (/^[A-Z]/.test(n)) out[n] ??= path.relative(ROOT, file);
    }
  }
  return out;
}

function diff(before, after) {
  const added = [], removed = [], changed = [];
  for (const k of Object.keys(after)) if (!(k in before)) added.push(k); else if (before[k] !== after[k]) changed.push(k);
  for (const k of Object.keys(before)) if (!(k in after)) removed.push(k);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

async function usages(names) {
  if (!names.length) return {};
  const hits = {};
  for (const d of USAGE_DIRS) {
    for await (const file of walk(path.join(ROOT, d))) {
      if (!/\.(tsx?|css|md)$/.test(file)) continue;
      const text = await readFile(file, 'utf8');
      for (const n of names) if (text.includes(n)) (hits[n] ??= []).push(path.relative(ROOT, file));
    }
  }
  return hits;
}

const now = { at: new Date().toISOString(), tokens: await tokens(), components: await components() };
let prev = null;
try { prev = JSON.parse(await readFile(SNAP, 'utf8')); } catch {}

if (!prev) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(SNAP, JSON.stringify(now, null, 1));
  await writeFile(LOG, `# Lumen changelog\n\nWritten by \`scripts/lumen-watch.mjs\`. The design agent reads the newest entry before every run.\n\n## ${now.at.slice(0, 10)} · baseline\n\n${Object.keys(now.tokens).length} token values · ${Object.keys(now.components).length} components.\n`);
  const summary = { changed: false, baseline: true, tokens: Object.keys(now.tokens).length, components: Object.keys(now.components).length };
  console.log(args.has('--json') ? JSON.stringify(summary) : `lumen watch: baseline recorded (${summary.tokens} token values, ${summary.components} components)`);
  process.exit(0);
}

const t = diff(prev.tokens, now.tokens);
const c = diff(prev.components, now.components);
const count = t.added.length + t.removed.length + t.changed.length + c.added.length + c.removed.length;
const tokenName = (k) => k.split(' ')[1];
const goneNames = [...new Set([...t.removed.map(tokenName).map((n) => n.replace(/^--color-/, '--')), ...c.removed])];
const hits = await usages(goneNames);
const summary = {
  changed: count > 0,
  since: prev.at,
  tokens: { added: t.added.length, removed: t.removed.length, changed: t.changed.length },
  components: { added: c.added, removed: c.removed },
  affected: Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, [...new Set(v)]])),
};

if (args.has('--json')) {
  console.log(JSON.stringify(summary));
} else if (!count) {
  console.log(`lumen watch: no changes since ${prev.at.slice(0, 16).replace('T', ' ')} ✓`);
} else {
  console.log(`lumen watch: ${t.added.length} token(s) added, ${t.removed.length} removed, ${t.changed.length} changed · ${c.added.length} component(s) added, ${c.removed.length} removed`);
}
if (!count) process.exit(0);
if (args.has('--check')) process.exit(1);

const lim = (arr, f, n = 40) => arr.slice(0, n).map(f).join('\n') + (arr.length > n ? `\n- … and ${arr.length - n} more` : '');
const entry = [
  `## ${now.at.slice(0, 10)} · ${count} change(s)`,
  t.changed.length ? `### Token values changed\n${lim(t.changed, (k) => `- \`${k}\`: ${prev.tokens[k]} → ${now.tokens[k]}`)}` : '',
  t.added.length ? `### Tokens added\n${lim(t.added, (k) => `- \`${k}\` = ${now.tokens[k]}`)}` : '',
  t.removed.length ? `### Tokens removed\n${lim(t.removed, (k) => `- \`${k}\` (was ${prev.tokens[k]})`)}` : '',
  c.added.length ? `### Components added\n${lim(c.added, (k) => `- \`${k}\` · ${now.components[k]}`)}` : '',
  c.removed.length ? `### Components removed\n${lim(c.removed, (k) => `- \`${k}\` (was ${prev.components[k]})`)}` : '',
  Object.keys(summary.affected).length ? `### ⚠ Still used by prototypes / handoffs\n${Object.entries(summary.affected).map(([k, v]) => `- \`${k}\` → ${v.join(', ')}`).join('\n')}` : '',
].filter(Boolean).join('\n\n');
const old = await readFile(LOG, 'utf8').catch(() => '# Lumen changelog\n');
const [head, ...rest] = old.split(/\n(?=## )/);
await writeFile(LOG, [head.trimEnd(), entry, ...rest].join('\n\n') + '\n');
await writeFile(SNAP, JSON.stringify(now, null, 1));
