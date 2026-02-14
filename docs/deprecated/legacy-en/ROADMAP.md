# ROADMAP — Agentic Digital Garden

> Version: 1.0 | Date: 2026-02-11 | Derived from: MASTER_PLAN.md

---

| Milestone | Outcome | Tasks | Owners | ETA |
|-----------|---------|-------|--------|-----|
| **M0 — Foundation** | DRAKON editor verified end-to-end; NotebookLM chat works; MinIO/GitHub connected | - Verify DrakonEditor save/load cycle | **FE:** Lovable | **S** |
| | | - Verify pseudocode generation in browser | **FE:** Lovable | |
| | | - Verify `/v1/chat` returns NLM response | **BE:** Replit | |
| | | - Verify MinIO connectivity (`/v1/diagnostics/minio`) | **BE:** Replit | |
| | | - Verify GitHub commit (`/v1/git/commit`) | **BE:** Replit | |
| | | - Verify worker DRAKON routes (`POST /v1/drakon/commit`) | **Worker** | |
| **M1 — Diagram Management** | Users browse, create, delete DRAKON diagrams per folder | - Create `DrakonDiagramsList.tsx` (grid/list view) | **FE:** Lovable | **S** |
| | | - Add diagram browser to DrakonPage (no-id fallback) | **FE:** Lovable | |
| | | - Add "Create DRAKON" button in NotePage | **FE:** Lovable | |
| | | - Add `GET /v1/drakon/:folder/list` to worker | **Worker** | |
| | | - Add diagram metadata to listing response | **Worker** | |
| **M2 — DRAKON → Agent Pipeline** | Visual diagram exports to pseudocode `.md` and agent `_agent.md` with gh-aw frontmatter | - Add "Export Pseudocode" to editor toolbar | **FE:** Lovable | **M** |
| | | - Create `agentExporter.ts` (pseudocode → gh-aw frontmatter) | **FE:** Lovable | |
| | | - Create `AgentDefinitionPreview.tsx` dialog | **FE:** Lovable | |
| | | - Define `src/lib/agents/types.ts` (agent schema) | **FE:** Lovable | |
| | | - Save generated files via existing commit API | **FE:** Lovable | |
| **M3 — NLM Citations** | NotebookLM chat responses include source citations; UI displays them | - Investigate `notebooklm-py` citation response format | **BE:** Replit | **M** |
| | | - Parse citation markers from NLM response | **BE:** Replit | |
| | | - Return structured `citations[]` in `/v1/chat` | **BE:** Replit | |
| | | - Passthrough citations in worker | **Worker** | |
| | | - Create `CitationBlock.tsx` component | **FE:** Lovable | |
| | | - Render citations in `NotebookLMChatPanel.tsx` | **FE:** Lovable | |
| **M4 — Agent Format (gh-aw)** | `_agent.md` files parsed and rendered as agent cards; format documented. **gh-aw reference now at `gh-aw/`** | - Document gh-aw adaptation: `docs/architecture/AGENT_FORMAT.md` (ref: `gh-aw/.github/aw/github-agentic-workflows.md`) | **Architect** | **M** |
| | | - Create `src/lib/agents/types.ts` (gh-aw frontmatter: `name`, `description`, `tools[]`, `infer` + extensions) | **FE:** Lovable | |
| | | - Create `src/lib/agents/parser.ts` (gray-matter + Zod) | **FE:** Lovable | |
| | | - Create `AgentCard.tsx` (visual agent card: name, description, tools, safe-outputs, status) | **FE:** Lovable | |
| | | - Detect + render `_agent.md` in NoteRenderer | **FE:** Lovable | |
| | | - Add `GET/PUT /v1/agents/:folder` to worker | **Worker** | |
| **M5 — Agent Proposals** | Agents propose actions; humans approve/reject; approved actions execute | - Create `AgentProposalCard.tsx` | **FE:** Lovable | **L** |
| | | - Create `/admin/agent-proposals` page | **FE:** Lovable | |
| | | - Add agent proposal CRUD to worker | **Worker** | |
| | | - Create `POST /v1/agents/execute` (stub → full) | **BE:** Replit | |
| | | - Create `app/services/agent_service.py` | **BE:** Replit | |
| | | - Agent execution reads `_agent.md` → queries NLM → returns proposal | **BE:** Replit | |
| **M6 — Full Loop** | End-to-end: DRAKON → agent → execute → propose → approve → commit | - "Activate Agent" toggle on AgentCard | **FE:** Lovable | **L** |
| | | - Agent activity log component | **FE:** Lovable | |
| | | - Agent activation trigger in worker | **Worker** | |
| | | - DRAKON pseudocode interpreter (Python) | **BE:** Replit | |
| | | - NLM-grounded decision making at branch points | **BE:** Replit | |
| | | - Document lifecycle: `AGENT_LIFECYCLE.md` | **Architect** | |
| | | - First real example agent working end-to-end | **All** | |

---

## ETA Legend

| Code | Meaning | Approximate Scope |
|------|---------|-------------------|
| **S** | Small | 1-3 focused sessions |
| **M** | Medium | 3-7 focused sessions |
| **L** | Large | 7+ focused sessions, may need iteration |

---

## Dependency Chain

```
M0 (verify) ──→ M1 (diagrams UX) ──→ M2 (pipeline)
                                          │
M0 (verify) ──→ M3 (citations) ──────────┤
                                          ↓
                                     M4 (agent format)
                                          │
                                          ↓
                                     M5 (proposals)
                                          │
                                          ↓
                                     M6 (full loop)
```

- **M0** is prerequisite for everything
- **M1** and **M3** can run in parallel after M0
- **M2** depends on M1 (diagram management UX)
- **M4** depends on M2 (agent exporter creates the format)
- **M5** depends on M4 (agents must be defined before they can propose)
- **M6** depends on M5 (full loop needs proposals + execution)

---

## Current Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0 | **READY TO START** | All code exists; needs verification |
| M1 | BLOCKED by M0 | |
| M2 | BLOCKED by M1 | |
| M3 | BLOCKED by M0 | Can start in parallel with M1 |
| M4 | BLOCKED by M2 | gh-aw reference cloned to `gh-aw/`; spec available |
| M5 | BLOCKED by M4 | |
| M6 | BLOCKED by M5 | |

---

*This roadmap is a living document. Update after each milestone completion.*
