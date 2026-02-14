# Backend Architecture

> Updated: 2026-02-11 | Stack: FastAPI (Python) on Replit | URL: notebooklm-gateway-1.replit.app

---

## Purpose

The backend serves as the **cognitive orchestration layer**, connecting the frontend (via Cloudflare Worker gateway) to NotebookLM for grounded AI reasoning. It also provides Git automation and persistent storage.

## Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | FastAPI | Async Python API server |
| AI Engine | notebooklm-py | NotebookLM browser automation |
| Storage | PostgreSQL (Replit) | Persistent config, auth state |
| Object Storage | MinIO (S3-compatible) | Note files, zone exports |
| Git | GitHub API | Commit proxy for note/diagram saves |
| Hosting | Replit (Always-On) | Deployment with secrets management |

## API Surface

| Endpoint Group | Routes | Purpose |
|---------------|--------|---------|
| `/v1/chat` | POST | NotebookLM chat (owner) |
| `/v1/notebooks` | CRUD | NotebookLM notebook management |
| `/v1/sources` | POST | Import sources into notebooks |
| `/v1/jobs/{id}` | GET | Job status polling (source import) |
| `/v1/git/commit` | POST | GitHub commit proxy |
| `/v1/diagnostics/*` | GET | MinIO, NLM, GitHub health checks |
| `/v1/health` | GET | Service health |
| `/auth/status` | GET | NotebookLM auth status |

## Key Services

### NotebookLM Service
- Uses `notebooklm-py` (browser automation via Playwright)
- 120-second timeout for chat operations
- Session state persisted in PostgreSQL (`storage_state.json`)
- **No hallucination by design** — answers grounded in uploaded sources

### MinIO Service
- Downloads files from MinIO buckets
- AWS S3v4 compatible API
- Used for zone note preparation and source import

### GitHub Service
- Commits files to GitHub repository
- Used by both note editor and DRAKON diagram persistence

### Persistent Store
- PostgreSQL for surviving Replit restarts
- Stores: `storage_state_json`, `github_config`
- Critical for NotebookLM session continuity

## Architecture Constraints

1. **NotebookLM auth is fragile** — `storage_state.json` can expire, requiring manual re-auth
2. **No rate limiting** — relies on Cloudflare Worker for request throttling
3. **Single deployment** — no staging/production separation
4. **Browser automation** — NotebookLM has no official API; relies on Playwright session

## Future (per MASTER_PLAN)

- M3: Citations extraction from NLM responses
- M5: Agent execution endpoint (`/v1/agents/execute`)
- M6: DRAKON pseudocode interpreter for agent logic

---

*The backend is accessed exclusively through the Cloudflare Worker gateway, never directly from the frontend.*
