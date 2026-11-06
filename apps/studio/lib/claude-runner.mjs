// Runs the design agent with the Claude Agent SDK (Claude Code as a library).
// It works inside the design repo, so it sees CLAUDE.md, .claude/skills, chris-taste,
// strategy and Lumen exactly like Claude Code would.
import { makeTools, STAGE_IDS } from './tools.mjs'
import { SYSTEM_APPEND } from './prompts.mjs'
import { captureSite } from './capture.mjs'
import path from 'node:path'

let sdk, z
async function load() {
  if (sdk) return
  sdk = await import('@anthropic-ai/claude-agent-sdk')
  z = (await import('zod')).z
}

// Read-only + file editing are allowed. Shell is limited to safe checks. Never git writes or deploys.
const SAFE_BASH = [/^(cd apps\/live-site && )?npx tsc --noEmit\b/, /^(cd apps\/live-site && )?npm run (lint|typecheck|type-check)\b/, /^npm --prefix apps\/live-site run (lint|typecheck)\b/, /^npm run tokens:lint\b/, /^npm run tokens:sync\b/, /^ls\b/, /^cat\b/, /^head\b/, /^wc\b/, /^pdftotext\b/, /^node scripts\/lint-tokens\.mjs\b/]
const BLOCKED = /\b(git\s+(commit|push|reset|checkout|rebase)|vercel|rm\s+-rf|npm\s+publish|curl\s+.*\|\s*sh)\b/

// Secrets the agent must never read or write, whatever a BRD tells it (prompt-injection guard).
const SECRET = /(^|\/)(\.env(\.[^/]*)?|\.studio-(users|sessions)\.json|\.git\/|\.ssh\/|\.aws\/|\.npmrc|id_rsa|\.netrc)/
const SECRET_WORDS = /\.env\b|\.env\.|studio-users|studio-sessions|\.ssh|\.aws|\.npmrc|\.netrc|id_rsa|\benv\b|printenv/

export function permission(repoRoot) {
  const inRepo = (p) => {
    const full = path.resolve(repoRoot, String(p || '.'))
    return (full === repoRoot || full.startsWith(repoRoot + path.sep)) && !SECRET.test(path.relative(repoRoot, full))
  }
  return async (toolName, input) => {
    if (toolName.startsWith('mcp__studio__') || toolName.startsWith('mcp__mobbin') || toolName.startsWith('mcp__figma')) {
      return { behavior: 'allow', updatedInput: input }
    }
    if (['Read', 'Glob', 'Grep'].includes(toolName)) {
      const target = input.file_path || input.path || '.'
      if (!inRepo(target) || SECRET.test(String(input.pattern || '')) || SECRET.test(String(input.glob || ''))) return { behavior: 'deny', message: 'Only non-secret files inside the design repo can be read.' }
      return { behavior: 'allow', updatedInput: input }
    }
    if (['WebSearch', 'WebFetch', 'TodoWrite', 'Skill', 'Task'].includes(toolName)) {
      return { behavior: 'allow', updatedInput: input }
    }
    if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
      const p = String(input.file_path || input.notebook_path || '')
      if (!p || !inRepo(p) || /(^|\/)apps\/studio\//.test(path.relative(repoRoot, path.resolve(repoRoot, p)))) {
        return { behavior: 'deny', message: 'Only files inside the design repo can be written (not secrets, .git or the studio itself).' }
      }
      // Hard guards (Chris, Nov 2026: the agent kept hand-drawing boards and a stretched logo).
      if (/\/specs\/[^/]+\/.*\.(html?|svg)$/i.test(p)) {
        return { behavior: 'deny', message: 'No hand-drawn boards. Build the draft at apps/live-site/app/prototype/[slug] on the real shell, capture_site it, and submit_proposal with the screenshots.' }
      }
      const body = [input.content, input.new_string, ...(input.edits || []).map((e) => e.new_string)].filter(Boolean).join('\n')
      if (!/shell-icons\.tsx$/.test(p) && /(logos\/BetOnline|figma\/logos\/|id="BETONLINE"|id="Lettermark")/.test(body)) {
        return { behavior: 'deny', message: 'Never place or redraw the BetOnline logo yourself. Render the real shell (ShellFrame) or use <ShellLogo /> / <ShellLettermark /> from components/site/shell-icons.tsx.' }
      }
      return { behavior: 'allow', updatedInput: input }
    }
    if (toolName === 'Bash') {
      const cmd = String(input.command || '').trim()
      if (SECRET_WORDS.test(cmd) || /(^|\s)\/(?!dev\/null)/.test(cmd.replace(/^cd apps\/live-site && /, '')) || /\.\.\//.test(cmd)) return { behavior: 'deny', message: 'Shell commands may only touch non-secret files inside the repo (relative paths).' }
      if (BLOCKED.test(cmd)) return { behavior: 'deny', message: 'Blocked in the studio: no git writes, deploys or destructive commands.' }
      // One command at a time: no chaining, redirects or substitution (pipes only into head/wc/sort; use the Grep and Glob tools to search).
      const rest = cmd.replace(/^cd apps\/live-site && /, '')
      const chained = /;|&&|\|\||`|\$\(|>|</.test(rest) || rest.split('|').slice(1).some((seg) => !/^\s*(head|wc|grep|sort)\b/.test(seg))
      if (!chained && SAFE_BASH.some((r) => r.test(cmd))) return { behavior: 'allow', updatedInput: input }
      return { behavior: 'deny', message: 'The studio only allows read-only shell commands, token lint and the type-check ("cd apps/live-site && npx tsc --noEmit"), one command at a time. Use Read/Write/Edit instead.' }
    }
    return { behavior: 'deny', message: `${toolName} is not enabled in the studio.` }
  }
}

function studioServer(store, slug, origin, lane) {
  const t = makeTools(store, slug)
  const ok = (text) => ({ content: [{ type: 'text', text }] })
  const { tool, createSdkMcpServer } = sdk
  return createSdkMcpServer({
    name: 'studio',
    version: '1.0.0',
    tools: [
      tool('set_stage', 'Move the job to a pipeline stage on the dashboard.', { stage: z.enum(STAGE_IDS), note: z.string().optional() }, async (a) => ok(t.set_stage(a))),
      tool('log', 'Post a short progress line to the dashboard chat.', { message: z.string() }, async (a) => ok(t.log(a))),
      tool(
        'ask_questions',
        'Ask the design team questions you cannot answer from the BRD, strategy, research or code. Ends your turn.',
        {
          questions: z
            .array(
              z.object({
                id: z.string().optional(),
                title: z.string().describe('The question itself, one sentence, max ~100 characters.'),
                context: z.string().optional().describe('What you found that raises it, with sources (files, BRD, peers). Markdown ok, max ~400 characters.'),
                why: z.string().optional().describe('What changes in the design depending on the answer. One sentence.'),
                images: z.array(z.object({ src: z.string().describe('Repo path (specs/<slug>/refs/…png from capture_site, or .cursor/knowledge/product-strategy/competitors/…) or an https image URL (e.g. Mobbin image_url).'), caption: z.string().optional() })).max(4).optional().describe('Screenshots of what the question refers to: our site today (capture_site) and the peer pattern.'),
                options: z
                  .array(z.object({ label: z.string().describe('Short choice, max ~60 characters.'), detail: z.string().optional().describe('What this choice means for the design, one sentence.'), recommended: z.boolean().optional(), image: z.string().optional().describe('Optional repo path or https URL showing this option.') }))
                  .max(4)
                  .optional(),
              }),
            )
            .min(1)
            .max(3),
        },
        async (a) => ok(t.ask_questions(a)),
      ),
      tool(
        'capture_site',
        'Screenshot a route of the local BetOnline live site (logged in by default) and save it under specs/<slug>/refs/. Use it to show what a question or proposal refers to. Returns the repo path to use in images.',
        {
          route: z.string().describe('Path on the site, e.g. "/", "/casino", "/promotions/my-bonus", "/prototype/<slug>".'),
          name: z.string().describe('File name without extension, e.g. "header-today".'),
          viewport: z.enum(['desktop', 'mobile']).optional(),
          selector: z.string().optional().describe('CSS selector to crop to one element, e.g. "header" or "[data-name=sub-menu]".'),
          loggedIn: z.boolean().optional(),
          fullPage: z.boolean().optional(),
        },
        async (a) => {
          const rel = `specs/${slug}/refs/${a.name.replace(/[^\w-]+/g, '-').slice(0, 60)}${a.viewport === 'mobile' ? '-390' : ''}.png`
          try {
            if (lane) {
              const st = await Promise.race([lane.ensure(), new Promise((r) => setTimeout(() => r(lane.status()), 50000))])
              if (st.status === 'installing' || st.status === 'starting') {
                store.event(slug, 'agent-log', 'Waiting for the prototype lane to start…')
                return { content: [{ type: 'text', text: `${st.message} It is still starting — do other work (spec, code) and call capture_site again in a minute.` }], isError: true }
              }
              if (st.status !== 'running') throw new Error(st.message || 'The prototype lane isn’t running.')
            }
            await captureSite({ origin, route: a.route, viewport: a.viewport, selector: a.selector, loggedIn: a.loggedIn !== false, fullPage: !!a.fullPage, outFile: path.join(store.repoRoot, rel) })
            store.event(slug, 'tool', `Screenshot ${a.route}${a.selector ? ` · ${a.selector}` : ''}`, { image: rel })
            return ok(`Saved ${rel}`)
          } catch (e) {
            store.event(slug, 'agent-log', `Couldn’t screenshot ${a.route}: ${e.message}`)
            return { content: [{ type: 'text', text: `Screenshot failed: ${e.message}` }], isError: true }
          }
        },
      ),
      tool(
        'submit_figma',
        'Report the Figma screens you built. Ends your turn.',
        { url: z.string(), frames: z.array(z.string()).max(30).optional(), gaps: z.array(z.string()).max(10).optional() },
        async (a) => ok(t.submit_figma(a)),
      ),
      tool('set_title', 'Give the project a short, clear name.', { title: z.string() }, async (a) => ok(t.set_title(a))),
      tool(
        'submit_proposal',
        'Submit the proposal board; it renders in the chat for Chris’s direction review. All screens must be real screenshots from capture_site. Ends your turn.',
        {
          summary: z.string().describe('2–3 sentences: what you propose and why.'),
          strategy: z.string().optional().describe('Bet · initiative/feature # · needle baseline → target.'),
          journey: z.array(z.object({ step: z.string(), detail: z.string().optional() })).max(8).optional(),
          current: z.array(z.object({ src: z.string(), caption: z.string().optional() })).max(6).optional().describe('Screenshots of what ships today (capture_site).'),
          proposed: z.array(z.object({ src: z.string(), caption: z.string().optional() })).max(8).optional().describe('Screenshots of the draft on /prototype/<slug> (capture_site).'),
          reuse: z.array(z.object({ component: z.string(), path: z.string().optional(), note: z.string().optional() })).max(12).optional(),
          gaps: z.array(z.string()).max(6).optional().describe('Component briefs: what Lumen lacks.'),
          peers: z.array(z.object({ name: z.string(), take: z.string().optional(), avoid: z.string().optional(), link: z.string().optional(), image: z.string().optional() })).max(4).optional(),
          questions: z.array(z.object({ title: z.string(), context: z.string().optional(), options: z.array(z.string()).max(4).optional() })).max(3).optional(),
        },
        async (a) => ok(t.submit_proposal(a)),
      ),
      tool(
        'submit_prototype',
        'Submit the working prototype for review; it runs live in the chat. Only after the quality check. Ends your turn.',
        {
          previewUrl: z.string(),
          summary: z.string().describe('One or two sentences.'),
          changes: z.array(z.string()).max(10).optional().describe('What changed in this version (for refine rounds: what you fixed from the feedback).'),
          screens: z.array(z.object({ src: z.string(), caption: z.string().optional() })).max(8).optional().describe('capture_site screenshots you checked: desktop, mobile, key states.'),
          states: z.array(z.object({ label: z.string(), url: z.string() })).max(8).optional().describe('Links to each state of the prototype, e.g. {label:"Empty", url:"/prototype/<slug>?state=empty"}.'),
        },
        async (a) => ok(t.submit_prototype(a)),
      ),
      tool('record_learning', 'Record a durable rule you just wrote into chris-taste or a skill.', { file: z.string(), rule: z.string() }, async (a) => ok(t.record_learning(a))),
      tool('submit_handoff', 'Submit the dev handoff package. Ends your turn.', { file: z.string().optional(), summary: z.string() }, async (a) => ok(t.submit_handoff(a))),
    ],
  })
}

function describeTool(name, input) {
  const p = (input && (input.file_path || input.path || input.pattern || input.command || input.query || input.url)) || ''
  const short = String(p).replace(/^.*BetOnline_Claude_Handoff\//, '').slice(0, 120)
  if (name.startsWith('mcp__studio__')) return null
  if (name.startsWith('mcp__mobbin')) return `Mobbin · ${input?.query || name.split('__').pop()}`
  const verbs = { Read: 'Reading', Write: 'Writing', Edit: 'Editing', Glob: 'Finding', Grep: 'Searching', Bash: 'Running', WebSearch: 'Searching the web', WebFetch: 'Opening' }
  return `${verbs[name] || name} ${short}`.trim()
}

export function createClaudeRunner({ store, repoRoot, model, siteOrigin = 'http://127.0.0.1:3001', lane }) {
  return async function run(slug, prompt, signal) {
    await load()
    lane?.ensure() // warm the prototype lane while the agent reads
    const job = store.get(slug)
    const abortController = new AbortController()
    signal?.addEventListener('abort', () => abortController.abort())
    const options = {
      cwd: repoRoot,
      model: model || undefined,
      resume: job.sessionId || undefined,
      systemPrompt: { type: 'preset', preset: 'claude_code', append: SYSTEM_APPEND },
      // Figma runs also load your own Claude Code settings, so a Figma MCP you connected in Claude Code is available here.
      settingSources: /^FIGMA BUILD/.test(prompt) ? ['user', 'project'] : ['project'],
      mcpServers: { studio: studioServer(store, slug, siteOrigin, lane), ...(/^FIGMA BUILD/.test(prompt) && process.env.STUDIO_FIGMA_MCP_URL ? { figma: { type: 'http', url: process.env.STUDIO_FIGMA_MCP_URL } } : {}) },
      // studio tools + read-only tools never need approval; everything else goes through canUseTool below
      allowedTools: ['submit_figma', 'set_title', 'set_stage', 'log', 'capture_site', 'ask_questions', 'submit_proposal', 'submit_prototype', 'record_learning', 'submit_handoff'].map((n) => `mcp__studio__${n}`),  // Read/Glob/Grep go through canUseTool so the secret guard applies
      canUseTool: permission(repoRoot),
      abortController,
    }
    for await (const msg of sdk.query({ prompt, options })) {
      if (msg.type === 'system' && msg.subtype === 'init' && msg.session_id) {
        store.update(slug, { sessionId: msg.session_id })
      } else if (msg.type === 'assistant') {
        for (const block of msg.message?.content || []) {
          if (block.type === 'text' && block.text.trim()) store.event(slug, 'agent', block.text.trim())
          if (block.type === 'tool_use') {
            const line = describeTool(block.name, block.input)
            if (line) store.event(slug, 'tool', line)
          }
        }
      } else if (msg.type === 'result') {
        store.update(slug, (j) => ({ costUsd: (j.costUsd || 0) + (msg.total_cost_usd || 0), sessionId: msg.session_id || j.sessionId }))
        if (msg.subtype !== 'success') store.event(slug, 'system', `Run ended: ${msg.subtype}`)
      }
    }
  }
}
