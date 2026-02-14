# MASTER PLAN — Agentic Digital Garden

> Version: 1.0 | Date: 2026-02-11 | Author: Lead Architect (Claude)
> Entry point: "MVP: UI DRAKON-редактор у фронтенді"
> Method: MANIFEST-FIRST + EVIDENCE-FIRST

---

## 1. Vision

The Agentic Digital Garden transforms a human-curated Zettelkasten knowledge base into an **intelligent operational backend**. Knowledge structures — folders, files, diagrams — become **active agents** that reason, propose, and act within defined boundaries.

The system is NOT another chatbot. It is an **operational intelligence layer** where:
- Every folder defines an agent's context and responsibilities
- Every Markdown file is an instruction, memory, or behavior definition
- DRAKON diagrams encode unambiguous logic that machines execute
- NotebookLM grounds all AI reasoning in verified sources (no hallucination)
- Humans remain in the loop: agents propose, humans approve

The MVP entry point — the DRAKON editor — is the first link in the chain: **visual logic → structured text → agent behavior**. From here, we build incrementally toward the full manifesto vision.

The end state: a system where knowledge = backend, UI = role projection, agent = living form of knowledge, and production/management/thinking operate in a single cognitive space.

---

## 2. Principles (Manifest → Implementation)

| Principle | Manifesto Ref | How It Maps to Code |
|-----------|--------------|---------------------|
| **Everything is an Agent** | §2 | Each folder in `src/site/notes/` becomes an agent context. Agent definition file: `_agent.md` with YAML frontmatter. MISSING → M4 |
| **Folder = Context** | §3 | Already implemented via zones (`useAccessZones.ts`). Extend to agent activation. PARTIAL → M5 |
| **File = Instruction** | §2.2 | Notes exist as `.md` files. Need gh-aw frontmatter parser. MISSING → M4 |
| **DRAKON = Logic Language** | §6 | Editor DONE (`DrakonEditor.tsx`). Pipeline DRAKON→pseudocode DONE (`pseudocode.ts`). Pipeline pseudocode→agent.md MISSING → M2 |
| **NotebookLM = Cognitive Core** | §4 | Chat integration DONE. Citations passthrough PARTIAL. Strict grounding MISSING → M3 |
| **gh-aw Format** | §5 | Agent configs per-platform (`agents/`). **gh-aw reference now cloned** (`gh-aw/`). Spec: YAML frontmatter (`name`, `description`, `tools[]`, `infer`) + MD body. Parser MISSING → M4 |
| **Human-in-the-loop** | §8 | Edit proposals DONE. Agent action proposals MISSING → M5 |
| **Knowledge > UI** | §9 | UI is a projection. Content lives in Markdown. DONE |

---

## 3. Architecture Outline

### 3.1 Frontend (garden-seedling/src/)

**What exists:**
- React 18 SPA with 15 pages, 20 hooks, 59 garden components (`src/App.tsx`)
- Full DRAKON editor/viewer with 25+ icon types, save, pseudocode export (`src/components/garden/DrakonEditor.tsx`)
- NotebookLM chat UI with filters, tabs, pinning (`src/components/notebooklm/`)
- Zone management with consent gates, TTL, diagnostics (`src/components/zones/`)
- Edit proposals lifecycle (`src/lib/api/mcpGatewayClient.ts:451-528`)
- MCP protocol UI (`src/components/garden/MCPAccessPanel.tsx`)

**What we add:**
- PROPOSAL: Diagram management panel (list/create/open/delete diagrams per folder)
- PROPOSAL: "Generate Agent" button in DRAKON editor (diagram → pseudocode → `_agent.md`)
- PROPOSAL: Citations display in NotebookLM chat (source references with quotes)
- PROPOSAL: Agent definition viewer (render `_agent.md` frontmatter as card)
- PROPOSAL: Agent action proposal UI (like edit proposals but for agent-initiated actions)

### 3.2 Worker (garden-seedling/infrastructure/cloudflare/worker/)

**What exists:**
- Monolithic vanilla JS worker, 3327 LOC, 40+ routes (`index.js`)
- Auth (JWT), zones, sessions, NotebookLM proxy, comments, annotations, proposals, notes, DRAKON
- MinIO S3v4 integration, GitHub commit proxy

**What we add:**
- PROPOSAL: `/v1/agents/:folderId` — agent definition CRUD (read/create/update agent.md)
- PROPOSAL: `/v1/agents/:folderId/proposals` — agent action proposals
- PROPOSAL: Citations passthrough from NotebookLM chat responses
- PROPOSAL: DRAKON diagram listing endpoint (per folder)

### 3.3 Backend (notebooklm/)

**What exists:**
- FastAPI with NotebookLM integration via `notebooklm-py` (`app/main.py`)
- Notebook CRUD, source import with job queue (`app/routes/api_v1.py`)
- Chat with history support, 120s timeout (`app/services/notebooklm_service.py`)
- MinIO download service (`app/services/minio_service.py`)
- GitHub commit service (`app/services/github_service.py`)
- PostgreSQL persistent store (`app/services/persistent_store.py`)

**What we add:**
- PROPOSAL: Citations extraction from NotebookLM chat responses (parse source references)
- PROPOSAL: Structured chat response format (`{answer, citations: [{title, snippet, sourceId}]}`)
- PROPOSAL: Agent execution endpoint (`/v1/agents/execute` — reads agent.md, runs logic via NotebookLM)

### 3.4 Data / Artifacts

| Artifact | Format | Location | Status |
|----------|--------|----------|--------|
| Notes | `.md` with YAML frontmatter | `src/site/notes/` | DONE |
| DRAKON diagrams | `.drakon.json` | `src/site/notes/{folder}/diagrams/` | DONE |
| Pseudocode | `.md` with `type: pseudocode` frontmatter | Generated, not persisted yet | PARTIAL |
| Agent definitions | `_agent.md` with gh-aw-adapted frontmatter | MISSING → M4. gh-aw reference at `gh-aw/` |
| Chat threads | localStorage (frontend) + KV (worker) | `useNotebookLMChats.ts` | DONE (fragile) |
| Edit proposals | KV (worker) | Worker proposal routes | DONE |
| Agent proposals | KV (worker) | MISSING → M5 |
| Citations | Nested in chat response | MISSING → M3 |

---

## 4. Milestones

---

### M0 — Foundation: Verify & Stabilize

**Goal:** Ensure existing DRAKON editor works end-to-end. Fix critical blockers. Establish dev workflow.

**Deliverables:**
- Verified: DRAKON editor creates/saves/loads diagrams
- Verified: Pseudocode generation works in browser
- Verified: NotebookLM chat returns responses
- DONE: `docs/state/STATE_SNAPSHOT.md` (already written)
- DONE: `docs/state/KNOWN_LIMITATIONS.md` (already written)

**Tasks:**

*Lovable FE:*
- [ ] Verify DrakonEditor opens and renders empty diagram (`src/components/garden/DrakonEditor.tsx`)
- [ ] Verify DrakonEditor saves diagram via worker → GitHub (`src/hooks/useDrakonDiagram.ts`)
- [ ] Verify pseudocode export button works (`src/lib/drakon/pseudocode.ts` — `diagramToPseudocode()`)
- [ ] Verify DrakonPage handles `?id=&folder=&new=true` params correctly (`src/pages/DrakonPage.tsx`)

*Worker:*
- [ ] Verify `POST /v1/drakon/commit` saves `.drakon.json` to GitHub (`worker/index.js:3300`)
- [ ] Verify `DELETE /v1/drakon/:folder/:id` removes diagram from GitHub (`worker/index.js:3308`)

*Replit BE:*
- [ ] Verify `POST /v1/chat` returns response with NotebookLM content (`app/routes/api_v1.py`)
- [ ] Verify MinIO connectivity (`GET /v1/diagnostics/minio`)
- [ ] Verify GitHub commit works (`POST /v1/git/commit`)

**Acceptance Criteria:**
- Owner can open `/drakon?id=test&new=true`, draw a diagram, save it, reload and see it
- Pseudocode appears in dialog when "Generate" clicked
- NotebookLM chat returns non-empty response
- MinIO health check passes

**Risks:** NotebookLM auth (`storage_state.json`) may expire. MinIO endpoint may be unreachable.

**Open Questions:**
1. Is NotebookLM auth currently valid? (Check `/auth/status`)
2. Is MinIO endpoint accessible from Replit? (Check `/v1/diagnostics/minio`)

---

### M1 — DRAKON Editor UX: Diagram Management

**Goal:** Users can manage multiple DRAKON diagrams per folder. Clear navigation between diagrams and notes.

**Deliverables:**
- CREATE: `src/components/garden/DrakonDiagramsList.tsx` — list of diagrams per folder
- MODIFY: `src/pages/DrakonPage.tsx` — add diagram selector/browser
- MODIFY: `src/pages/NotePage.tsx` — add "New DRAKON diagram" action
- CREATE: Worker endpoint `GET /v1/drakon/:folderSlug/list` — list diagrams

**Tasks:**

*Lovable FE:*
- [ ] Create `DrakonDiagramsList.tsx` component: grid/list view, thumbnail preview, create/delete actions
  - Files: CREATE `src/components/garden/DrakonDiagramsList.tsx`
- [ ] Add diagram browser to DrakonPage (when no `?id` param, show list)
  - Files: MODIFY `src/pages/DrakonPage.tsx`
- [ ] Add "Create DRAKON diagram" button in NotePage (when viewing a folder's note)
  - Files: MODIFY `src/pages/NotePage.tsx`
- [ ] Add diagram count badge to folder navigation
  - Files: MODIFY `src/components/garden/FolderNav.tsx` (or equivalent)

*Worker:*
- [ ] Add `GET /v1/drakon/:folderSlug/list` — list `.drakon.json` files from GitHub
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`
- [ ] Add diagram metadata response (id, name, updatedAt, thumbnail placeholder)

*Replit BE:*
- No backend changes needed for M1.

**Acceptance Criteria:**
- `/drakon` without params shows list of all diagrams across folders
- `/drakon?folder=violin.pp.ua` shows diagrams for that folder
- User can create new diagram from the list
- User can delete diagram from the list (with confirmation)

**Risks:** GitHub API rate limits for listing directory contents.

**Open Questions:**
1. Should diagram thumbnails be pre-rendered (SVG/PNG) or generated client-side?

---

### M2 — DRAKON → Pseudocode → Markdown Pipeline

**Goal:** Complete pipeline: DRAKON diagram → pseudocode → Markdown agent file. First step toward "visual logic → agent behavior."

**Deliverables:**
- MODIFY: `src/components/garden/DrakonEditor.tsx` — "Export as Agent" button
- CREATE: `src/lib/drakon/agentExporter.ts` — generate `_agent.md` from diagram
- Pseudocode saved as `.md` file alongside diagram
- Agent `.md` file with gh-aw-compatible YAML frontmatter

**Tasks:**

*Lovable FE:*
- [ ] Add "Export Pseudocode" action to DrakonEditor toolbar — saves `.pseudocode.md` in same folder
  - Files: MODIFY `src/components/garden/DrakonEditor.tsx`
  - Uses: `diagramToPseudocode()` from `src/lib/drakon/pseudocode.ts`
- [ ] Create `agentExporter.ts` — wraps pseudocode in gh-aw YAML frontmatter
  - Files: CREATE `src/lib/drakon/agentExporter.ts`
  - Template: `{ role, permissions, triggers, tools }` in frontmatter + pseudocode body
- [ ] Add "Generate Agent Definition" button — generates `_agent.md` preview
  - Files: MODIFY `src/components/garden/DrakonEditor.tsx`
- [ ] Add agent definition preview dialog (rendered frontmatter + pseudocode)
  - Files: CREATE `src/components/garden/AgentDefinitionPreview.tsx`
- [ ] Save generated files via existing commit API
  - Uses: `commitNote()` from `src/lib/api/mcpGatewayClient.ts`

*Worker:*
- No new endpoints needed (uses existing `/v1/notes/commit`)

*Replit BE:*
- No backend changes for M2.

**Acceptance Criteria:**
- From DrakonEditor: click "Export Pseudocode" → `.pseudocode.md` saved to repo
- From DrakonEditor: click "Generate Agent" → `_agent.md` preview with frontmatter
- Generated files have valid YAML frontmatter and readable pseudocode body
- Pseudocode matches diagram logic (verified manually)

**Risks:** `pseudocodeToMarkdown()` output format may need adjustment for gh-aw compatibility.

**Open Questions:**
1. What fields should gh-aw frontmatter contain? (role, permissions, triggers, tools — confirm with Q)
2. Should agent.md be auto-saved or require explicit confirmation? (PROPOSAL: require confirmation per manifesto §8)

---

### M3 — NotebookLM Citations & Grounded Responses

**Goal:** NotebookLM chat responses include source citations. UI displays them. This is the "strict RAG" layer the manifesto demands.

**Deliverables:**
- MODIFY: Backend chat endpoint to extract and return citations
- MODIFY: Worker to passthrough citation data
- MODIFY: Frontend chat UI to display citations with source references
- CREATE: `src/components/notebooklm/CitationBlock.tsx`

**Tasks:**

*Replit BE:*
- [ ] Investigate `notebooklm-py` chat response format — does it return source references?
  - Files: READ `app/services/notebooklm_service.py:chat()` method
  - Evidence: Current code calls `client.chat(notebook_id, question, ...)` — response format unknown
- [ ] Parse citation markers from NotebookLM response (e.g., `[1]`, `[2]` → source mapping)
  - Files: MODIFY `app/services/notebooklm_service.py`
- [ ] Return structured citations in `/v1/chat` response: `{answer, citations: [{index, title, snippet}]}`
  - Files: MODIFY `app/routes/api_v1.py`
- [ ] Fallback: if NotebookLM doesn't return structured citations, extract `[N]` markers from text
  - Files: MODIFY `app/services/notebooklm_service.py`

*Worker:*
- [ ] Passthrough `citations` field in NotebookLM chat response
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js` (handleNotebookLMChat)
- [ ] Add `citations` to `NotebookLMChatResponse` type
  - Files: MODIFY `src/types/mcpGateway.ts` (frontend types file, but worker must pass data through)

*Lovable FE:*
- [ ] Create `CitationBlock.tsx` component — renders citation with title, snippet, link
  - Files: CREATE `src/components/notebooklm/CitationBlock.tsx`
- [ ] Modify `NotebookLMChatPanel.tsx` to render citations below answer
  - Files: MODIFY `src/components/notebooklm/NotebookLMChatPanel.tsx`
- [ ] Update `NotebookLMChatResponse` type to include `citations[]`
  - Files: MODIFY `src/types/mcpGateway.ts`

**Acceptance Criteria:**
- Chat response displays numbered citations below the answer
- Each citation shows source title and relevant snippet
- If no citations available, response renders normally (graceful degradation)

**Risks:** `notebooklm-py` library may not expose citation data in its API. Need to verify.

**Open Questions:**
1. Does `notebooklm-py` return source references? (BLOCKER — must verify before M3 starts)
2. What citation format does NotebookLM use internally? (Research task for Replit)

---

### M4 — Agent Definition Format (gh-aw)

**Goal:** Implement the gh-aw agent format adapted for Agentic Digital Garden. gh-aw reference implementation is now available at `gh-aw/` with full specification.

**Reference:** `gh-aw/.github/aw/github-agentic-workflows.md` (full spec), `gh-aw/.github/agents/` (examples)

**gh-aw Format Summary (from reference):**
- Agent file: YAML frontmatter + Markdown body
- Frontmatter fields: `name`, `description`, `tools[]` (bash, edit, github, web-fetch, web-search, playwright, MCP), `infer` (model)
- Body: natural language instructions (runtime-editable without recompilation)
- Safe-outputs: structured write operations replacing direct permissions
- Skills: reusable modules at `skills/<name>/SKILL.md`

**Our Adaptation:**
- Agent files live in note folders as `_agent.md` (Folder-as-Agent) instead of `.github/agents/`
- Safe-outputs map to Edit Proposals system (propose → approve → commit)
- Tools include NotebookLM as primary cognitive tool
- Skills map to DRAKON-exported pseudocode modules

**Deliverables:**
- CREATE: `docs/architecture/AGENT_FORMAT.md` — gh-aw adaptation spec for our project
- CREATE: `src/lib/agents/types.ts` — TypeScript types matching gh-aw frontmatter + our extensions
- CREATE: `src/lib/agents/parser.ts` — parse `_agent.md` using gray-matter + Zod validation
- CREATE: `src/components/garden/AgentCard.tsx` — render agent definition as UI card
- MODIFY: NotePage to detect and render `_agent.md` files with special styling

**Tasks:**

*Lovable FE:*
- [ ] Design adapted gh-aw frontmatter schema (TypeScript types)
  - Files: CREATE `src/lib/agents/types.ts`
  - Schema based on gh-aw: `{ name, description, tools[], infer?, safe_outputs[], context_folder, role?, active? }`
  - Reference: `gh-aw/.github/aw/github-agentic-workflows.md` (YAML schema section)
- [ ] Create agent parser (reads .md frontmatter via gray-matter, validates with Zod)
  - Files: CREATE `src/lib/agents/parser.ts`
  - Must handle gh-aw standard fields + our extensions
- [ ] Create AgentCard component (renders agent metadata as card with status badge)
  - Files: CREATE `src/components/garden/AgentCard.tsx`
  - Display: name, description, tools[], safe-outputs[], status (active/inactive)
- [ ] Modify NoteRenderer to detect `_agent.md` and render with AgentCard header
  - Files: MODIFY `src/components/garden/NoteRenderer.tsx`
- [ ] Add agent badge to folder navigation (folders with `_agent.md` show agent icon)
  - Files: MODIFY relevant navigation component

*Worker:*
- [ ] Add `GET /v1/agents/:folderSlug` — read `_agent.md` from GitHub
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`
- [ ] Add `PUT /v1/agents/:folderSlug` — create/update `_agent.md` via GitHub commit
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`

*Replit BE:*
- No backend changes for M4 (agents don't execute yet).

**Acceptance Criteria:**
- `_agent.md` files with valid gh-aw-adapted frontmatter are parsed and rendered as agent cards
- Agent cards show: name, description, tools, safe-outputs, status (active/inactive)
- Folders with `_agent.md` show agent badge in navigation
- gh-aw adaptation documented in `docs/architecture/AGENT_FORMAT.md` with reference to `gh-aw/` spec

**Risks:** gh-aw is GitHub Actions-native; adaptation to our Worker+Backend execution may need iteration.

**Open Questions:**
1. ~~What fields should frontmatter contain?~~ RESOLVED: follow gh-aw spec (`name`, `description`, `tools[]`, `infer`) + our extensions (`context_folder`, `active`, `safe_outputs[]`)
2. Should we support gh-aw skills system? (PROPOSAL: yes, as DRAKON pseudocode exports)

---

### M5 — Agent Proposals (Human-in-the-Loop Actions)

**Goal:** Agents can propose actions (not just content edits). Humans review and approve. This extends the edit proposals system to cover agent-initiated operations.

**Deliverables:**
- CREATE: `src/components/garden/AgentProposalCard.tsx`
- CREATE: `src/pages/AgentProposalsPage.tsx`
- MODIFY: Worker to support action proposals
- MODIFY: Backend to execute approved agent actions via NotebookLM

**Tasks:**

*Lovable FE:*
- [ ] Create `AgentProposalCard.tsx` — displays proposed action with agent context, diff, approve/reject
  - Files: CREATE `src/components/garden/AgentProposalCard.tsx`
- [ ] Create `AgentProposalsPage.tsx` — inbox for pending agent proposals
  - Files: CREATE `src/pages/AgentProposalsPage.tsx`
- [ ] Add route `/admin/agent-proposals` to App.tsx
  - Files: MODIFY `src/App.tsx`
- [ ] Add proposal count badge to admin navigation
  - Files: MODIFY relevant admin nav component

*Worker:*
- [ ] Add `POST /v1/agents/:folderSlug/propose` — agent submits action proposal
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`
- [ ] Add `GET /v1/agents/proposals/pending` — list pending proposals
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`
- [ ] Add `POST /v1/agents/proposals/:id/approve` — execute approved action
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`
- [ ] Add `POST /v1/agents/proposals/:id/reject` — reject proposal
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`

*Replit BE:*
- [ ] Add `POST /v1/agents/execute` — execute agent logic (read _agent.md → query NotebookLM → return result)
  - Files: CREATE `app/routes/agents.py`
  - Files: CREATE `app/services/agent_service.py`
- [ ] Agent execution: parse pseudocode steps → query NotebookLM for each decision point → collect results
  - Files: MODIFY `app/services/notebooklm_service.py`

**Acceptance Criteria:**
- Agent can submit a proposal (via API)
- Owner sees proposals in `/admin/agent-proposals`
- Owner can approve (action executes) or reject (action discarded)
- Approved action creates a Git commit with agent attribution

**Risks:** Agent execution logic is complex. Start with simple "query NotebookLM and propose response" pattern.

**Open Questions:**
1. What agent actions are supported in v1? (PROPOSAL: content suggestions, note summaries, tag proposals)
2. Should agent execution be synchronous or queued? (PROPOSAL: queued via existing job system)

---

### M6 — Full Loop: DRAKON → Agent → Action → Approval

**Goal:** End-to-end: draw DRAKON diagram → generate agent → agent executes logic → proposes action → human approves → knowledge updates. The manifesto's full vision.

**Deliverables:**
- Full pipeline working for at least one real use case
- Documentation: `docs/architecture/AGENT_LIFECYCLE.md`
- Example: working agent defined via DRAKON for a specific knowledge domain

**Tasks:**

*Lovable FE:*
- [ ] "Activate Agent" toggle on AgentCard — triggers first execution
  - Files: MODIFY `src/components/garden/AgentCard.tsx`
- [ ] Agent execution status indicator (running/idle/error)
  - Files: MODIFY `src/components/garden/AgentCard.tsx`
- [ ] Agent activity log (recent proposals, approvals, rejections)
  - Files: CREATE `src/components/garden/AgentActivityLog.tsx`

*Worker:*
- [ ] Agent activation webhook/trigger mechanism
  - Files: MODIFY `infrastructure/cloudflare/worker/index.js`

*Replit BE:*
- [ ] DRAKON pseudocode interpreter — parse steps, branch on decisions
  - Files: CREATE `app/services/drakon_interpreter.py`
- [ ] NotebookLM-grounded decision making — at each branch, query NLM with context
  - Files: MODIFY `app/services/agent_service.py`
- [ ] Document agent lifecycle: `docs/architecture/AGENT_LIFECYCLE.md`
  - Files: CREATE in frontend repo `docs/architecture/AGENT_LIFECYCLE.md`

**Acceptance Criteria:**
- Complete cycle: DRAKON → agent.md → execute → propose → approve → commit
- At least one real example agent working end-to-end
- Agent grounded in NotebookLM sources (no hallucination)

**Risks:** High complexity. Agent interpreter is a significant engineering effort.

**Open Questions:**
1. What is the first real use case? (PROPOSAL: "Summarize folder notes and propose index" agent)
2. Should DRAKON interpreter run in backend (Python) or browser (JS)? (PROPOSAL: backend, for NotebookLM access)
3. How to handle agent errors gracefully? (PROPOSAL: fail-safe to proposal with error context)

---

## 5. Risks & Dependencies (Top-10)

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | NotebookLM auth expires (`storage_state.json`) | Chat/import breaks | Monitor `/auth/status`; document re-auth flow |
| R2 | `notebooklm-py` doesn't expose citations | M3 blocked | Verify early; fallback to regex parsing |
| R3 | Monolithic worker (3327 LOC) becomes unmaintainable | Slow iteration | PROPOSAL: modular refactor in future milestone |
| R4 | No test framework | Regressions accumulate | PROPOSAL: add vitest (frontend) + pytest (backend) |
| R5 | Notes are build-time static | UX lag after edits | Accept for MVP; future: dynamic note loading |
| R6 | CORS wildcard in production | Security risk | Restrict to known origins before public launch |
| R7 | localStorage-only chat history | Data loss | PROPOSAL: migrate to KV-backed persistence (M3+) |
| R8 | GitHub API rate limits | Diagram listing/save fails | Implement caching in worker KV |
| R9 | DRAKON pseudocode quality varies | Bad agent definitions | Manual review (human-in-the-loop covers this) |
| R10 | Two workers, no shared deploy | Version drift | PROPOSAL: unified CI/CD pipeline |

---

## 6. Next Actions (Top-10, ordered)

1. **Verify DRAKON editor end-to-end** (M0) — Owner: Lovable FE
2. **Verify NotebookLM chat works** (M0) — Owner: Replit BE
3. **Verify MinIO + GitHub connectivity** (M0) — Owner: Replit BE
4. **Create DrakonDiagramsList component** (M1) — Owner: Lovable FE
5. **Add diagram listing endpoint to worker** (M1) — Owner: Worker
6. **Investigate notebooklm-py citation support** (M3 prep) — Owner: Replit BE
7. **Create agentExporter.ts** (M2) — Owner: Lovable FE
8. **Adapt gh-aw frontmatter schema for project** (M4 prep) — Owner: Architect (this role) — Reference: `gh-aw/.github/aw/github-agentic-workflows.md`
9. **Add "Export Pseudocode" to editor** (M2) — Owner: Lovable FE
10. **Create AgentDefinitionPreview component** (M2) — Owner: Lovable FE

---

## 7. Agent Task Packs

### 7.1 Lovable-Ready Tasks (Frontend)

---

**L1: Verify DRAKON Editor Save/Load**
- **Goal:** Confirm existing DrakonEditor creates, saves, and reloads diagrams
- **Context:** `src/components/garden/DrakonEditor.tsx` (27KB), `src/hooks/useDrakonDiagram.ts`, `src/pages/DrakonPage.tsx`
- **Files to touch:** Read-only verification; report issues
- **Constraints:** Do NOT modify code. Only verify and report.
- **Acceptance:** Document: "Can create new diagram → save → reload" with screenshot or step-by-step

---

**L2: DRAKON Diagram List Component**
- **Goal:** Create a component that lists all DRAKON diagrams in a folder
- **Context:** Diagrams stored as `src/site/notes/{folder}/diagrams/{id}.drakon.json`. Currently no list view exists.
- **Files to touch:** CREATE `src/components/garden/DrakonDiagramsList.tsx`
- **Constraints:** Use existing shadcn-ui components (Card, Button, Badge). Follow existing component patterns from `src/components/garden/`.
- **Acceptance:** Component renders grid of diagram cards. Each card shows name, updated date. Click opens `/drakon?id={id}&folder={folder}`.

---

**L3: Diagram Browser in DrakonPage**
- **Goal:** When `/drakon` is opened without `?id`, show diagram browser instead of blank editor
- **Context:** `src/pages/DrakonPage.tsx:27` — currently shows "select" step with manual ID input
- **Files to touch:** MODIFY `src/pages/DrakonPage.tsx`, USE `src/components/garden/DrakonDiagramsList.tsx`
- **Constraints:** Keep existing URL params behavior. Add folder selector.
- **Acceptance:** `/drakon` shows list of all diagrams. `/drakon?folder=X` filters by folder.

---

**L4: "Export Pseudocode" Button in Editor**
- **Goal:** Add toolbar button that generates pseudocode from current diagram and saves as `.pseudocode.md`
- **Context:** `diagramToPseudocode()` in `src/lib/drakon/pseudocode.ts` already works. `pseudocodeToMarkdown()` wraps with frontmatter.
- **Files to touch:** MODIFY `src/components/garden/DrakonEditor.tsx`
- **Constraints:** Use existing `commitNote()` from `mcpGatewayClient.ts` to save. Show preview before saving.
- **Acceptance:** Click "Export Pseudocode" → dialog shows pseudocode preview → "Save" commits `.pseudocode.md` to repo.

---

**L5: Agent Exporter Module (gh-aw adapted)**
- **Goal:** Create module that wraps pseudocode in gh-aw-adapted YAML frontmatter to produce `_agent.md`
- **Context:** `src/lib/drakon/pseudocode.ts` generates pseudocode. gh-aw spec at `gh-aw/.github/aw/github-agentic-workflows.md`.
- **Files to touch:** CREATE `src/lib/drakon/agentExporter.ts`, CREATE `src/lib/agents/types.ts`
- **Constraints:** Frontmatter follows gh-aw format: `name, description, tools[], infer?` + our extensions: `context_folder, role?, safe_outputs[], generated_from`. Use Zod for schema validation.
- **Acceptance:** `exportAsAgent(pseudocode, metadata)` returns valid Markdown with gh-aw-compatible YAML frontmatter. Frontmatter parses correctly with gray-matter.

---

**L6: Agent Definition Preview Dialog**
- **Goal:** Show preview of generated `_agent.md` before saving
- **Context:** Generated by `agentExporter.ts`. Needs to display frontmatter fields + pseudocode body.
- **Files to touch:** CREATE `src/components/garden/AgentDefinitionPreview.tsx`
- **Constraints:** Use shadcn Dialog. Render frontmatter as key-value table. Render pseudocode as code block.
- **Acceptance:** Dialog shows agent name, role, permissions, and pseudocode. "Save" button commits to repo.

---

**L7: Citation Block Component**
- **Goal:** Create component to display NotebookLM citations in chat responses
- **Context:** `NotebookLMChatResponse` type in `src/types/mcpGateway.ts:75` has optional `citations` field.
- **Files to touch:** CREATE `src/components/notebooklm/CitationBlock.tsx`, MODIFY `src/components/notebooklm/NotebookLMChatPanel.tsx`
- **Constraints:** Graceful degradation: if no citations, render normally. Citation card: title, snippet, expandable.
- **Acceptance:** When `citations[]` present in response, they render below the answer as collapsible cards.

---

**L8: Agent Card Component (gh-aw adapted)**
- **Goal:** Render `_agent.md` files as visual agent cards in notes
- **Context:** Folders may contain `_agent.md` with gh-aw-adapted YAML frontmatter. Reference: `gh-aw/.github/agents/` for format examples.
- **Files to touch:** CREATE `src/components/garden/AgentCard.tsx`, MODIFY `src/components/garden/NoteRenderer.tsx`
- **Constraints:** Parse frontmatter with gray-matter. Display: name, description, tools[], safe-outputs[], status badge. Follow gh-aw field names.
- **Acceptance:** When viewing a note that IS an `_agent.md`, it renders with AgentCard header showing gh-aw fields instead of plain markdown.

---

**L9: "Create DRAKON Diagram" from Note Page**
- **Goal:** Add action button in NotePage to create a new DRAKON diagram linked to the current note's folder
- **Context:** `src/pages/NotePage.tsx`. Diagrams are folder-scoped.
- **Files to touch:** MODIFY `src/pages/NotePage.tsx`
- **Constraints:** Button visible only to authenticated owner. Navigates to `/drakon?folder={slug}&new=true`.
- **Acceptance:** Owner viewing a note can click "New DRAKON Diagram" → opens editor pre-configured for that folder.

---

**L10: Chat History Persistence Indicator**
- **Goal:** Show user that chat history is localStorage-only with warning/info badge
- **Context:** `useNotebookLMChats.ts:39` — localStorage only. Users may not know data is at risk.
- **Files to touch:** MODIFY `src/components/notebooklm/NotebookLMChatsWall.tsx`
- **Constraints:** Non-intrusive info badge. Text: "Chat history is stored locally in this browser."
- **Acceptance:** Badge visible on chat wall. Tooltip explains limitation.

---

### 7.2 Replit-Ready Tasks (Backend)

---

**B1: Verify NotebookLM Chat Response Format**
- **Goal:** Document exact response structure from `notebooklm-py` chat, especially citation/source data
- **Context:** `app/services/notebooklm_service.py:chat()`. Uses `client.chat(notebook_id, question, ...)`.
- **Files to touch:** Read-only investigation. CREATE `docs/research/notebooklm-response-format.md` (or equivalent).
- **Constraints:** Do NOT modify code. Do NOT expose auth credentials.
- **Acceptance:** Document with: response JSON structure, presence/absence of citations, source reference format.

---

**B2: Verify MinIO + GitHub Connectivity**
- **Goal:** Confirm backend can reach MinIO and GitHub from current deployment
- **Context:** `app/services/minio_service.py`, `app/services/github_service.py`
- **Files to touch:** Use existing `/v1/diagnostics/minio` and `/v1/git/status` endpoints.
- **Constraints:** Do NOT expose credentials. Report only connectivity status.
- **Acceptance:** Both services return "ok" status. If not, document error and proposed fix.

---

**B3: Add Citations Extraction to Chat Response**
- **Goal:** Parse NotebookLM chat responses to extract source references and return structured citations
- **Context:** `app/routes/api_v1.py` — `/v1/chat` endpoint. Response currently returns `{answer: "..."}`.
- **Files to touch:** MODIFY `app/services/notebooklm_service.py`, MODIFY `app/routes/api_v1.py`
- **Constraints:** Graceful fallback if no citations found. Regex-based extraction of `[1]`, `[2]` markers as minimum.
- **Acceptance:** `/v1/chat` response includes `citations: [{index, title?, snippet?}]` when available.

---

**B4: Structured Chat Response Schema**
- **Goal:** Standardize chat response format with explicit fields for answer, citations, metadata
- **Context:** Current response is ad-hoc. Frontend expects `NotebookLMChatResponse` type.
- **Files to touch:** MODIFY `app/routes/api_v1.py`, ADD Pydantic response model
- **Constraints:** Backward compatible — existing fields remain. New fields are optional.
- **Acceptance:** Response matches: `{success: true, answer: str, citations: list[Citation]?, raw: dict?}`

---

**B5: Health Check Enhancement**
- **Goal:** Add service component status to health endpoint (NotebookLM auth, MinIO, GitHub, PostgreSQL)
- **Context:** `GET /v1/health` exists but may be simple.
- **Files to touch:** MODIFY `app/routes/api_v1.py`
- **Constraints:** No credentials in response. Only status booleans.
- **Acceptance:** `/v1/health` returns `{status: "ok", components: {notebooklm: bool, minio: bool, github: bool, postgres: bool}}`

---

**B6: Agent Execution Endpoint (Stub)**
- **Goal:** Create `/v1/agents/execute` endpoint that reads agent definition and returns stub response
- **Context:** No agent execution exists yet. This is the foundation for M5-M6.
- **Files to touch:** CREATE `app/routes/agents.py`, CREATE `app/services/agent_service.py`
- **Constraints:** Stub only — parse agent.md frontmatter, validate, return parsed structure. No actual execution.
- **Acceptance:** `POST /v1/agents/execute {agent_md: "..."}` returns parsed agent definition with `{name, role, steps: []}`.

---

**B7: Import Job Status Enhancement**
- **Goal:** Add progress percentage and per-source status to job polling response
- **Context:** `GET /v1/jobs/{id}` — `app/services/jobs.py`. Results tracked per-source.
- **Files to touch:** MODIFY `app/routes/api_v1.py`
- **Constraints:** Backward compatible response.
- **Acceptance:** Job response includes `progress: 0-100`, `results: [{source, status, error?}]`.

---

**B8: Chat History Endpoint (Stub)**
- **Goal:** Create endpoint to persist chat messages server-side (preparation for moving off localStorage)
- **Context:** Frontend stores in localStorage (`useNotebookLMChats.ts`). KNOWN_LIMITATIONS #9.
- **Files to touch:** CREATE `app/routes/chat_history.py`, ADD PostgreSQL table for chat messages
- **Constraints:** Stub — accept messages, store in PostgreSQL, return on query. No real-time sync yet.
- **Acceptance:** `POST /v1/chats/{id}/messages` stores message. `GET /v1/chats/{id}/messages` returns history.

---

**B9: Document Backend API for Frontend Team**
- **Goal:** Create API documentation that Lovable agent can use to integrate frontend
- **Context:** All routes in `app/routes/api_v1.py` and `app/routes/auth.py`
- **Files to touch:** CREATE `docs/api/BACKEND_API.md` (in backend repo or frontend repo docs)
- **Constraints:** Include: endpoint, method, auth requirement, request/response schemas, examples.
- **Acceptance:** Complete API reference covering all endpoints.

---

**B10: Persistent Store Migration Check**
- **Goal:** Verify PostgreSQL persistent store is working correctly after Replit republish
- **Context:** `app/services/persistent_store.py`. Stores `storage_state_json` and `github_config`.
- **Files to touch:** Read-only verification. Use existing endpoints.
- **Constraints:** Do NOT expose stored credentials.
- **Acceptance:** After simulated restart, `storage_state.json` and GitHub config are restored.

---

*End of MASTER_PLAN v1.0*
