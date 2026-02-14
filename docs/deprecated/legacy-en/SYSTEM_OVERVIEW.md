# System Overview

> Updated: 2026-02-11 | Based on: STATE_SNAPSHOT.md, MANIFESTO.md, MASTER_PLAN.md

---

## Architecture Summary

The Agentic Digital Garden is a **four-layer system** where a human-curated Zettelkasten knowledge base becomes an intelligent operational backend through AI agents.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HUMAN LAYER                                  │
│   Obsidian (desktop) → Zettelkasten notes → Git push               │
│   DRAKON editor (web) → Visual logic diagrams                       │
│   Decisions, approvals, knowledge curation                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                                  │
│   React 18 + Vite + TypeScript + Tailwind + shadcn-ui               │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │  Notes   │  │  DRAKON  │  │ NotebookLM│  │  Zones   │          │
│   │  Engine  │  │  Editor  │  │  Chat UI  │  │ Manager  │          │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │ Colleague│  │  Graph   │  │  Search   │  │   MCP    │          │
│   │   Chat   │  │  Viewer  │  │  & Tags   │  │  Panel   │          │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   GATEWAY LAYER (Cloudflare Worker)                  │
│   Vanilla JS · 40+ routes · JWT auth · CORS · S3v4 signing          │
│                                                                     │
│   Auth │ Zones │ Sessions │ NotebookLM │ Comments │ Proposals       │
│   Notes │ DRAKON │ MCP │ Git proxy │ Annotations │ Health           │
│                                                                     │
│   Bindings: KV (metadata) + MinIO S3 (files) + GitHub API           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Cloudflare KV   │ │   MinIO S3   │ │  GitHub API      │
│  · Auth hashes   │ │  · Zone files│ │  · Note commits  │
│  · Zone defs     │ │  · Sessions  │ │  · DRAKON saves  │
│  · Session meta  │ │  · Exports   │ │  · Repo CRUD     │
└──────────────────┘ └──────────────┘ └──────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER (Replit FastAPI)                     │
│   Python · NotebookLM orchestration · PostgreSQL · Job queue         │
│                                                                     │
│   Chat (NLM) │ Notebook CRUD │ Source import │ MinIO download        │
│   GitHub commit │ Persistent store │ Health diagnostics              │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Patterns

### 1. Knowledge Creation (Human → System)
```
Obsidian → Git push → GitHub repo → Build → Frontend renders notes
Web Editor → Worker → GitHub API → Commit → Rebuild
DRAKON Editor → Worker → GitHub API → .drakon.json committed
```

### 2. Knowledge Consultation (System → Human)
```
User question → Worker → Replit Backend → NotebookLM → Grounded answer
                                                        (no hallucination)
```

### 3. Delegation (Owner → Guest)
```
Owner creates zone → Access code generated → Guest enters code
→ Consent gate → Zone notes visible → Guest can chat/propose edits
```

### 4. Agent Pipeline (Future: M2-M6)
```
DRAKON diagram → Pseudocode → _agent.md (gh-aw format)
→ Agent activated → Queries NotebookLM → Proposes action
→ Human approves → Git commit with attribution
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Cloudflare Worker as gateway** | Edge-deployed, zero cold start, DDoS protection built-in |
| **Vanilla JS worker (no deps)** | Cloudflare runtime constraint; keeps bundle minimal |
| **Build-time static notes** | Vite `import.meta.glob` — fast rendering, acceptable lag for personal use |
| **NotebookLM as cognitive core** | Grounded in sources, no hallucination — per manifesto §4 |
| **Git as persistence** | Notes are version-controlled; human-readable; Obsidian-compatible |
| **gh-aw agent format** | Portable, standardized (YAML+MD), proven in GitHub ecosystem |
| **DRAKON for logic** | Visual, unambiguous, human+machine readable — per manifesto §6 |

## Component Relationships

See detailed docs:
- [Frontend Architecture](./FRONTEND_ARCH.md)
- [Backend Architecture](./BACKEND_ARCH.md)
- [Worker Architecture](./WORKER_ARCH.md)

## Reference Implementation

The `gh-aw/` directory contains the cloned GitHub Agentic Workflows framework — the reference for agent definition format, safe-outputs, skills system, and security architecture. It is **not integrated** into the runtime; it serves as specification for M4+ milestones.

---

*Based on evidence from codebase audit. See [STATE_SNAPSHOT.md](../state/STATE_SNAPSHOT.md) for detailed inventory.*
