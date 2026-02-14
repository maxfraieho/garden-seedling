# Known Limitations

> Updated: 2026-02-11 | Method: EVIDENCE-FIRST repo audit | Commit: `5ea3b70`

---

## Top-10

### 1. No Agent Runtime Engine
- Manifesto: "Folder = Agent" with activation, context exploration, behavior execution
- Reality: Folders are passive note containers. No code activates an agent per folder.
- **Evidence:** No `agent-runner`, `agent-executor`, or `activateAgent` in codebase
- **Impact:** Core manifesto promise (knowledge → action) not yet delivered

### 2. Colleague Chat is a Hardcoded Stub
- `useColleagueChat.ts:106`: `// Simulate AI response (MVP - will connect to n8n/AI later)`
- `generateAIResponse()` returns random hardcoded strings per role
- 3 "colleagues" defined (Archivist, Tech Writer, Architect) but none call an LLM
- **Impact:** Chat UI exists but provides zero AI value

### 3. Monolithic Worker (3327 LOC, no types, no tests)
- Single `index.js` file: auth, MinIO, sessions, zones, NotebookLM, comments, annotations, proposals, notes, DRAKON, MCP — all in one
- Vanilla JS (no TypeScript) — no type safety at API boundary
- No unit tests, no integration tests
- **Impact:** High maintenance risk, difficult to extend or debug

### 4. No Test Framework
- No jest, vitest, playwright, or any test runner in `package.json`
- Zero test files found in entire repo
- **Impact:** All changes carry regression risk; no CI quality gate beyond lint

### 5. Notes Are Build-Time Static
- `noteLoader.ts:9`: `import.meta.glob('/src/site/notes/**/*.md', { query: '?raw', eager: true })`
- Notes baked into JS bundle at build time
- Git commits (via worker/GitHub API) write to repo, but frontend won't see changes until rebuild+redeploy
- **Impact:** Lag between note edit and visibility; not real-time

### 6. CORS Wildcard
- `worker/index.js:15`: `'Access-Control-Allow-Origin': '*'` on every response
- Any origin can call every API endpoint
- HYPOTHESIS: Acceptable for personal/dev use; needs restriction for production
- **Impact:** No origin-level access control on backend

### 7. DRAKON → Agent Pipeline Not Connected
- `drakongen` generates pseudocode + AST + prompt structures
- `pseudocode.ts` can produce Markdown with frontmatter
- But: no automated flow from DRAKON diagram → gh-aw agent file → execution
- **Evidence:** `drakonToPromptStruct.js` exists but not called from frontend
- **Impact:** Visual logic stays visual; doesn't drive agent behavior

### 8. gh-aw Format Not Yet Integrated
- Manifesto Section 5: "GitHub Agentic Workflows — universal agent format"
- `agents/` contains 6 platform-specific config folders (chatgpt, lovable, replit, etc.)
- **Update:** gh-aw reference implementation now cloned to `gh-aw/` (2843 files, spec at `gh-aw/.github/aw/github-agentic-workflows.md`)
- Known: agent format = YAML frontmatter (`name`, `description`, `tools[]`, `infer`) + Markdown body (instructions)
- Known: safe-outputs = structured write operations (create-issue, create-pull-request, add-comment, etc.)
- Known: skills system = `skills/<name>/SKILL.md` reusable modules
- **Still missing:** TypeScript parser for gh-aw frontmatter, agent card renderer, execution runtime
- **Impact:** Format is now documented; integration into garden-seedling pipeline is M4 milestone

### 9. NotebookLM Chat Messages in localStorage Only
- `useNotebookLMChats.ts:39`: `const STORAGE_CHATS = 'notebooklm:chats:v1'`
- All chat history stored in browser localStorage
- Server `touchChat`/`patchChat` calls are fire-and-forget (failure silently ignored)
- **Impact:** Chat history lost on browser clear; no cross-device sync; data loss risk

### 10. Two Separate Workers, No Unified Deploy
- Main worker: `infrastructure/cloudflare/worker/index.js`
- NotebookLM worker: `/home/vokov/projects/notebooklm/cloudflare_worker/index.js`
- No shared deployment pipeline, no monorepo tooling
- GitHub Actions workflow exists for main worker (`deploy-worker.yml`) but not for NLM worker
- **Impact:** Manual coordination needed; potential version drift

---

## Honorable Mentions

- **Architecture docs are stubs** — `docs/architecture/*.md` all contain only TODO
- **n8n migration status unknown** — infrastructure exists (`infrastructure/n8n-migration/`) but usage unclear
- **No rate limiting on frontend** — worker has no visible rate limiting implementation
- **`add_editor/`, `new_desijn/`, `cloud-cli/`** — orphan folders with unclear status; may be dead prototypes
- **`apps/web/`** — empty placeholder with only README

---

*Items marked HYPOTHESIS require Q's confirmation. All others based on code evidence.*
