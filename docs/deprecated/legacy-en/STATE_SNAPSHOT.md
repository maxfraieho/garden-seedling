# State Snapshot

> Generated: 2026-02-11 | Commit: `5ea3b70` (main, clean) | Method: EVIDENCE-FIRST repo audit

---

## 0. Repository Topology

```
garden-seedling/
├── src/                    ← FRONTEND (React 18 + Vite + TS)
│   ├── components/
│   │   ├── garden/         (59 components — notes, editor, DRAKON, chat, zones)
│   │   ├── notebooklm/    (6 components — NotebookLM chat UI)
│   │   ├── zones/          (7 components — delegation, consent, diagnostics)
│   │   └── ui/             (37 shadcn-ui primitives)
│   ├── hooks/              (20 hooks — auth, zones, DRAKON, search, chat, NLM)
│   ├── lib/                (api, chat, comments, drakon, export, i18n, notes)
│   ├── pages/              (15 page components)
│   ├── types/              (mcpGateway.ts, drakonwidget.d.ts)
│   └── site/notes/         (content: violin.pp.ua, exodus.pp.ua, diagrams, etc.)
├── infrastructure/
│   └── cloudflare/worker/  ← WORKER/BACKEND (Cloudflare Worker v3.0, 3327 LOC vanilla JS)
├── drakongen/              ← DRAKON CODE GENERATOR (Node.js + browser bundle)
│   ├── src/                (13 JS modules)
│   ├── browser/            (drakongen.js — browser build)
│   └── examples/           (190+ .drakon/.json examples)
├── vendor/drakonwidget/    ← DRAKON WIDGET (vendor lib, loaded at runtime)
├── agents/                 ← AGENT CONFIGS (6 platform-specific: chatgpt, claude-cli, comet, lovable, replit, research)
├── infrastructure/n8n-migration/  ← N8N MIGRATION (adapter, workflows, redis, testing)
├── gh-aw/                  ← GH-AW REFERENCE (GitHub Agentic Workflows — cloned, .git removed)
│   ├── cmd/gh-aw/          (CLI: compile, run, logs, mcp inspect)
│   ├── .github/aw/         (spec: github-agentic-workflows.md)
│   ├── .github/agents/     (agent definitions: YAML frontmatter + MD body)
│   ├── .github/workflows/  (example .md workflows → compiled .lock.yml)
│   └── skills/             (24+ reusable skills: SKILL.md format)
├── docs/                   ← DOCUMENTATION (manifesto, architecture, plans, state, drakon)
├── public/libs/            (drakonwidget.js, drakongen.js — runtime scripts)
├── apps/web/               (placeholder)
├── add_editor/             (standalone editor prototype)
├── new_desijn/             (new design prototype)
└── cloud-cli/              (diagnostic reports)
```

**Backend note:** No dedicated backend server in this repo. The Cloudflare Worker IS the backend. NotebookLM orchestration lives in separate repo `/home/vokov/projects/notebooklm/`.

---

## 1. Entry Points

| Layer | Entry | Evidence |
|-------|-------|----------|
| **Frontend** | `src/main.tsx` → `App.tsx` | `createRoot(document.getElementById("root")!).render(<App />)` |
| **Router** | `src/App.tsx:54-72` | 15 `<Route>` definitions inside `<BrowserRouter>` |
| **Worker** | `infrastructure/cloudflare/worker/index.js:2936` | `export default { async fetch(request, env, ctx) { ... } }` |
| **drakongen CLI** | `drakongen/src/main.js` | Node.js entry (CLI code generation) |
| **drakongen browser** | `public/libs/drakongen.js` | Loaded dynamically via `<script>`, exposes `window.drakongen` |
| **DrakonWidget** | `public/libs/drakonwidget.js` | Loaded dynamically, exposes `window.createDrakonWidget` |

---

## 2. Current State — 25 Points

### FRONTEND

**#1 — React SPA with shadcn-ui**
- **What:** React 18 + Vite 5 + TypeScript 5.8 + Tailwind 3.4 + shadcn-ui
- **Evidence:** `package.json` (37 @radix-ui deps), `src/components/ui/` (37 files)
- **Status: DONE**

**#2 — Routing (15 pages)**
- **What:** React Router DOM with 15 routes: notes, editor, DRAKON, graph, tags, files, zones, chat, admin, policy
- **Evidence:** `src/App.tsx:54-72`, all pages in `src/pages/`
- **Status: DONE**

**#3 — Owner Auth (JWT)**
- **What:** JWT-based owner auth with setup wizard, login, token refresh. Guards all admin routes.
- **Evidence:** `src/hooks/useOwnerAuth.tsx`, `src/components/garden/OwnerSetupWizard.tsx`, `src/components/AccessGuard.tsx`
- **Status: DONE**

**#4 — i18n (5 languages)**
- **What:** Internationalization with en, uk, de, fr, it locales
- **Evidence:** `src/lib/i18n/locales/` (5 files), `src/hooks/useLocale.tsx`
- **Status: DONE**

**#5 — Theme (dark/light/system)**
- **What:** Theme toggle with persistence
- **Evidence:** `src/components/theme-provider.tsx`, `App.tsx:82` (`storageKey="garden-ui-theme"`)
- **Status: DONE**

### KNOWLEDGE ENGINE

**#6 — Markdown notes rendering + frontmatter**
- **What:** Notes loaded from `src/site/notes/` via Vite `import.meta.glob` (eager, raw). gray-matter frontmatter parsing (JSON + YAML). `dg-publish` / `dg-home` support.
- **Evidence:** `src/lib/notes/noteLoader.ts:8-13` (`import.meta.glob('/src/site/notes/**/*.md', { query: '?raw', eager: true })`), `parseFrontmatter()` at line 30
- **Status: DONE**

**#7 — Note editor with Git persistence**
- **What:** WYSIWYG-style editor that commits via GitHub API through worker
- **Evidence:** `src/components/garden/NoteEditor.tsx`, `src/hooks/useNoteEditor.ts`, `src/lib/api/mcpGatewayClient.ts:562` (`commitNote()`)
- **Status: DONE**

**#8 — Wikilinks + suggestions**
- **What:** `[[...]]` Obsidian-compatible wikilinks with autocomplete
- **Evidence:** `src/lib/notes/wikilinkParser.ts`, `src/hooks/useWikilinkSuggestions.ts`
- **Status: DONE**

**#9 — Tags + Search**
- **What:** Tag system + full-text search across notes
- **Evidence:** `src/lib/notes/tagResolver.ts`, `src/lib/notes/searchResolver.ts`, `src/hooks/useTags.ts`, `src/hooks/useSearch.ts`
- **Status: DONE**

**#10 — Link graph visualization**
- **What:** D3/force-based knowledge graph
- **Evidence:** `src/lib/notes/linkGraph.ts`, `src/pages/GraphPage.tsx`
- **Status: DONE**

### DRAKON

**#11 — DrakonWidget integration (viewer + editor)**
- **What:** DRAKON flowchart viewer and full editor, loaded dynamically from vendor lib
- **Evidence:** `src/lib/drakon/adapter.ts` (dynamic `<script>` loading of `/libs/drakonwidget.js`), `src/components/garden/DrakonViewer.tsx` (11KB), `src/components/garden/DrakonEditor.tsx` (27KB)
- **Status: DONE**

**#12 — drakongen pseudocode generation (browser)**
- **What:** DRAKON → pseudocode/tree conversion in browser via dynamically loaded drakongen.js
- **Evidence:** `src/lib/drakon/pseudocode.ts` — `window.drakongen.toPseudocode()`, `toTree()`. `pseudocodeToMarkdown()` wraps output with YAML frontmatter.
- **Status: DONE**

**#13 — DRAKON diagram persistence (Git)**
- **What:** Save/delete DRAKON diagrams as `.drakon.json` in GitHub via worker
- **Evidence:** `src/hooks/useDrakonDiagram.ts` — `commitDrakonDiagram()`, `deleteDrakonDiagram()`. Files at `src/site/notes/{folder}/diagrams/{id}.drakon.json`
- **Status: DONE**

**#14 — DRAKON embedded in notes**
- **What:** `:::drakon id="name" height="400" mode="view":::` directive syntax renders DRAKON diagrams inline in markdown notes
- **Evidence:** `src/components/garden/DrakonDiagramBlock.tsx`, integration documented in `src/lib/drakon/CLAUDE.md`
- **Status: DONE**

**#15 — drakongen CLI (Node.js)**
- **What:** Code generator: DRAKON → pseudocode, AST, prompt structures, project-mode
- **Evidence:** `drakongen/src/` — 13 JS modules including `drakongen.js`, `drakonToStruct.js`, `drakonToPromptStruct.js`, `printPseudo.js`, `translate.js`
- **Status: DONE** (standalone tool, not integrated into agent pipeline)

### ACCESS ZONES / DELEGATION

**#16 — Zone CRUD (create/list/revoke)**
- **What:** Owner creates time-limited zones with folder restrictions, access codes. Supports `web`, `mcp`, `both` access types.
- **Evidence:** `src/hooks/useAccessZones.ts:132` (createZone), `src/hooks/useAccessZones.ts:210` (revokeZone), `src/hooks/useAccessZones.ts:95` (listZones). Worker routes: `POST /zones/create`, `DELETE /zones/:id`, `GET /zones/list`
- **Status: DONE**

**#17 — Zone guest validation + consent gate**
- **What:** Guests validate zone via access code. Consent gate requires confidentiality acceptance before viewing content. TTL expiration check with 30s polling.
- **Evidence:** `src/hooks/useZoneValidation.ts:37` (validates via `GET /zones/validate/:zoneId`), `src/components/zones/ZoneConsentGate.tsx`, `consentRequired` defaults to `true`
- **Status: DONE**

**#18 — Zone NotebookLM integration**
- **What:** Zones can auto-create NotebookLM notebooks. Notes uploaded to MinIO → imported into NotebookLM. Guest chat via zone access code.
- **Evidence:** `createNotebookLM` param in `CreateZoneParams`, `src/components/zones/NotebookLMSetupPanel.tsx`, `src/components/zones/ZoneNotebookLMChat.tsx`, worker route `POST /zones/:zoneId/notebooklm/chat`
- **Status: DONE**

### NOTEBOOKLM

**#19 — NotebookLM chat UI (owner + guest)**
- **What:** Chat wall with filters, tabs, create dialog. Messages stored in localStorage. Chats synced to server (fire-and-forget). Unread count, pinning, archiving.
- **Evidence:** `src/hooks/useNotebookLMChats.ts` (localStorage keys: `notebooklm:chats:v1`, `notebooklm:messages:v1:*`), `src/components/notebooklm/NotebookLMChatsWall.tsx`, `ChatsWallFilters.tsx`, `NotebookLMChatPanel.tsx`
- **Status: DONE**

**#20 — NotebookLM API (chat, job status, retry)**
- **What:** `POST /notebooklm/chat` (owner), `POST /zones/:zoneId/notebooklm/chat` (guest). Job status polling. 120s timeout for browser automation.
- **Evidence:** `src/lib/api/mcpGatewayClient.ts:268-295`, `timeoutMs: 120000`
- **Status: DONE**

### CHAT (Colleague AI)

**#21 — Colleague Chat (MVP stub)**
- **What:** 3 AI "colleagues" (Archivist, Tech Writer, Architect) with simulated responses. localStorage persistence. No real AI backend.
- **Evidence:** `src/hooks/useColleagueChat.ts:106` — `// Simulate AI response (MVP - will connect to n8n/AI later)`, `generateAIResponse()` returns hardcoded strings per role
- **Status: PARTIAL** — UI done, AI responses are stubs

### CLOUDFLARE WORKER

**#22 — Worker v3.0 (full API gateway)**
- **What:** Monolithic vanilla JS worker. 40+ routes. JWT auth, MinIO S3v4, KV sessions, NotebookLM orchestration, GitHub commit proxy, comments, annotations, edit proposals, DRAKON persistence.
- **Evidence:** `infrastructure/cloudflare/worker/index.js` (3327 LOC). Route groups: auth (5), zones (8), notebooklm (5), chats (5), sessions (3), comments (3), annotations (3), proposals (5), notes (3), drakon (2), git (1), health (1).
- **Status: DONE**

**#23 — Edit Proposals system**
- **What:** Guests submit content edits. Owner reviews (accept commits to GitHub, reject discards). Full lifecycle.
- **Evidence:** Worker routes `POST /zones/:zoneId/proposals`, `GET /proposals/pending`, `POST /proposals/:id/accept`, `POST /proposals/:id/reject`. Frontend: `mcpGatewayClient.ts:451-528`
- **Status: DONE**

**#24 — MCP Protocol (JSON-RPC + SSE)**
- **What:** MCP session management, JSON-RPC handler, SSE transport
- **Evidence:** Worker routes `POST /mcp`, `GET /sse`. Frontend: `src/hooks/useMCPSessions.ts`, `src/components/garden/MCPAccessPanel.tsx`
- **Status: DONE**

### INFRASTRUCTURE

**#25 — n8n migration infrastructure**
- **What:** Adapter layer, workflow definitions, Redis config, testing scripts for migrating from n8n
- **Evidence:** `infrastructure/n8n-migration/` — `adapter/`, `workflows/`, `redis/`, `testing/`, `scripts/`, `docker-compose.yml`
- **Status: PARTIAL** — infrastructure exists but migration status unclear

---

### GH-AW REFERENCE IMPLEMENTATION

**#26 — gh-aw cloned as reference (not integrated)**
- **What:** GitHub Agentic Workflows framework cloned into `gh-aw/` directory. Provides the specification for agent format: YAML frontmatter (config) + Markdown body (natural language instructions). Compiles `.md` → `.lock.yml` for GitHub Actions. Includes CLI (`gh aw compile/run/logs`), safe-outputs system, tools (bash, edit, github, web-fetch, web-search, playwright), skills system, network firewall (AWF), MCP Gateway integration.
- **Evidence:** `gh-aw/README.md`, `gh-aw/.github/aw/github-agentic-workflows.md` (full spec), `gh-aw/.github/agents/` (agent definitions), `gh-aw/skills/` (24+ skill modules)
- **Status: REFERENCE ONLY** — not yet integrated into garden-seedling codebase

**#27 — gh-aw Agent Definition Format (reference)**
- **What:** Agents defined as `.github/agents/<name>.md` with YAML frontmatter: `name`, `description`, `tools[]`, `infer` (model). Body contains natural language instructions. Supports safe-outputs (create-issue, create-pull-request, add-comment, etc.) instead of direct write permissions.
- **Evidence:** `gh-aw/.github/agents/` directory, `gh-aw/.github/aw/github-agentic-workflows.md`
- **Status: REFERENCE** — to be adapted for Folder-as-Agent format in M4

**#28 — gh-aw Skills System (reference)**
- **What:** Reusable knowledge modules at `skills/<name>/SKILL.md`. Each skill provides domain-specific instructions an agent can use. Skills are referenced by workflows/agents.
- **Evidence:** `gh-aw/skills/` (24+ directories)
- **Status: REFERENCE** — maps to manifesto's File-as-Instruction concept

---

## 3. Key Gaps (Manifesto vs. Reality)

| # | Manifesto Expectation | Current State | Gap |
|---|----------------------|---------------|-----|
| G1 | Folder = Agent with activation | Folders are passive note containers | No agent runtime engine |
| G2 | gh-aw universal agent format | 6 platform-specific configs in `agents/`; gh-aw reference implementation cloned to `gh-aw/` | Reference available, parser/executor not yet built |
| G3 | DRAKON → Agent pipeline | drakongen generates pseudocode only | No DRAKON → gh-aw → execution flow |
| G4 | RAG integration | MinIO stores files; no embedding/retrieval | NotebookLM as de-facto substitute (HYPOTHESIS) |
| G5 | Subagent hierarchy | Subfolder structure exists | No parent-child delegation runtime |
| G6 | Agent portability | Agents are repo-local | No import/export/registry |
| G7 | Colleague Chat AI | Hardcoded stub responses | Real AI integration pending (`useColleagueChat.ts:106`) |

---

## 4. External Dependencies

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| Cloudflare Workers + KV | Edge compute + session storage | `worker/index.js`, `wrangler.toml` |
| MinIO (S3-compatible) | Object storage for zone notes | `worker/index.js:167` (`uploadToMinIO`) |
| GitHub API | Note/diagram persistence (commit-based) | Worker routes `/v1/notes/commit`, `/v1/drakon/commit` |
| NotebookLM (Google) | Cognitive layer (grounded AI) | `/home/vokov/projects/notebooklm/`, worker proxy |
| Lovable.dev | UI generation | `package.json` (`lovable-tagger`) |

---

## 5. Security Notes

- JWT auth HS256 — worker-side, `crypto.subtle` based
- Zone access codes for guest delegation (hex strings)
- CORS: `Access-Control-Allow-Origin: *` — **open to all origins** (worker line 15)
- `.env` exists, appears empty; secrets via Cloudflare env vars
- No hardcoded secrets found in scanned source
- MinIO credentials referenced as `env.MINIO_ACCESS_KEY`, `env.MINIO_SECRET_KEY` (worker env bindings, not in code)
- GitHub token referenced as `env.GITHUB_TOKEN` (worker env binding)

---

*Snapshot reflects codebase as of commit `5ea3b70` on `main`.*
