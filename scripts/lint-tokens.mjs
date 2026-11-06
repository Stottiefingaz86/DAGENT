#!/usr/bin/env node
/**
 * Lumen token lint — fails if anything the agents produce steps outside the design system.
 *
 *   node scripts/lint-tokens.mjs <dir> [<dir> ...]
 *
 * Checks every .css / .tsx / .jsx / .ts / .astro / .html file under the given dirs for:
 *   1. raw hex / rgb() / hsl() colours             → must use a token (bg-primary, var(--primary), …)
 *   2. var(--x) where --x is not in the manifest   → unknown token
 *   3. Tailwind arbitrary values like bg-[#…], p-[13px], text-[17px]
 *   4. font-family declarations that are not a token
 *
 * The manifest is tokens/dist/manifest.json (run `npm run tokens:sync` first).
 * Lines ending in `// lumen-allow` or `/* lumen-allow *\/` are skipped (reviewers can grep for them).
 *
 * Exit 0 = clean, 1 = violations, 2 = setup problem.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = process.env.TOKENS_MANIFEST ?? path.join(ROOT, 'tokens', 'dist', 'manifest.json');
const EXTS = new Set(['.css', '.tsx', '.jsx', '.ts', '.astro', '.html', '.mdx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.astro', 'storybook-static', 'tokens']);

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: lint-tokens.mjs <dir> [<dir> ...]');
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {
  console.error(`No manifest at ${path.relative(ROOT, MANIFEST)} — run \`npm run tokens:sync\` first.`);
  process.exit(2);
}

const allowed = new Set(manifest.allowedVars ?? []);
// Brand blocks emit --color-foo as --foo; allow that spelling too.
for (const v of [...allowed]) if (v.startsWith('--color-')) allowed.add(`--${v.slice('--color-'.length)}`);

const RULES = [
  { id: 'raw-hex', re: /(?<![\w-])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi, msg: 'raw hex colour' },
  { id: 'raw-rgb', re: /\b(?:rgba?|hsla?|oklch|oklab)\(/gi, msg: 'raw colour function' },
  { id: 'arbitrary', re: /(?<![\w-])(?:bg|text|border|ring|fill|stroke|shadow|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|w|h|rounded|leading|tracking|font)-\[[^\]]+\]/g, msg: 'Tailwind arbitrary value' },
  { id: 'font-family', re: /font-family\s*:(?!\s*(?:var\(|inherit))[^;]+/gi, msg: 'font-family not from a token' },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (EXTS.has(path.extname(entry.name))) {
      yield path.join(dir, entry.name);
    }
  }
}

// Files that ARE the design system (generated token CSS, token data) are the source of truth, not violations.
const SOURCE_OF_TRUTH = /(?:^|[\\/])(?:app[\\/]lumen\.css|lib[\\/]agent[\\/]designSystem\.ts)$/;
// Runtime/component custom properties (set inline or by a library) are not colour/size tokens.
const RUNTIME_VAR = /^--(?:radix-|font-figtree$|tw-)/;
// Custom properties declared inside the scanned code (component-scoped vars like --spot-x, --skeleton).
const localVars = new Set();
async function collectLocalVars(abs) {
  for await (const file of abs.isDir ? walk(abs.p) : [abs.p]) {
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(/(?:^|[\s{;'"(,])(--[a-z0-9-]+)['"]?\s*:/gim)) localVars.add(m[1]);
  }
}
for (const d of dirs) {
  const p = path.resolve(d);
  const st = await stat(p).catch(() => null);
  if (st) await collectLocalVars({ p, isDir: st.isDirectory() });
}
const knownVar = (name) => allowed.has(name) || localVars.has(name) || RUNTIME_VAR.test(name);

const violations = [];
let files = 0;

for (const d of dirs) {
  const abs = path.resolve(d);
  const s = await stat(abs).catch(() => null);
  if (!s) {
    console.error(`skip: ${d} (not found)`);
    continue;
  }
  for await (const file of s.isDirectory() ? walk(abs) : [abs]) {
    if (SOURCE_OF_TRUTH.test(file)) continue;
    files++;
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (/lumen-allow/.test(line)) return;
      // Ignore import lines / URLs / ids in hrefs
      if (/^\s*import\s/.test(line)) return;
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line))) {
          // #fff inside a URL fragment or id selector like `#root` → only flag hex-looking tokens
          if (rule.id === 'raw-hex' && /^#[0-9a-f]+$/i.test(m[0]) && /(href|url\(|#\w+-)/.test(line.slice(Math.max(0, m.index - 12), m.index))) continue;
          // Arbitrary value that is only a known token, e.g. bg-[var(--surface-muted-5)], is token use, not a raw value.
          if (rule.id === 'arbitrary') {
            const inner = /\[([^\]]+)\]$/.exec(m[0])?.[1] ?? '';
            const vars = [...inner.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((x) => x[1]);
            const rest = inner.replace(/var\(\s*--[a-z0-9-]+\s*(?:,[^)]*)?\)/gi, '').replace(/^(?:length|color):/, '');
            if (vars.length && vars.every(knownVar) && !/[0-9#]|rgb|hsl/i.test(rest)) continue;
          }
          violations.push({ file, line: i + 1, rule: rule.id, msg: rule.msg, found: m[0] });
        }
      }
      // unknown var(--x)
      const varRe = /var\(\s*(--[a-z0-9-]+)/gi;
      let v;
      while ((v = varRe.exec(line))) {
        if (!knownVar(v[1])) violations.push({ file, line: i + 1, rule: 'unknown-var', msg: 'token not in Lumen manifest', found: v[1] });
      }
    });
  }
}

if (violations.length === 0) {
  console.log(`lumen lint: ${files} file(s), 0 violations ✓`);
  process.exit(0);
}

const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}
for (const [file, list] of byFile) {
  console.log(path.relative(ROOT, file));
  for (const v of list) console.log(`  ${v.line}: [${v.rule}] ${v.msg}: ${v.found}`);
}
console.log(`\nlumen lint: ${files} file(s), ${violations.length} violation(s) ✗`);
process.exit(1);
