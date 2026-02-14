# Worker Architecture

> Updated: 2026-02-11 | Runtime: Cloudflare Workers | Language: Vanilla JavaScript

---

## Purpose

The Cloudflare Worker serves as the **API gateway** between the frontend and all backend services (MinIO, GitHub, Replit backend, NotebookLM). It handles authentication, authorization, CORS, and request routing.

## Key Characteristics

| Property | Value |
|----------|-------|
| Language | Vanilla JavaScript (no dependencies) |
| Size | ~3327 LOC, single `index.js` file |
| Routes | 40+ endpoints |
| Auth | JWT (HS256) via `crypto.subtle` |
| Storage | Cloudflare KV + MinIO S3 |
| Deploy | Cloudflare Dashboard / `wrangler` |

## Route Groups

| Group | Routes | Auth Required | Purpose |
|-------|--------|---------------|---------|
| **Auth** | 5 | Mixed | Login, setup, token refresh |
| **Zones** | 8 | Owner/Guest | Zone CRUD, validation, consent |
| **NotebookLM** | 5 | Owner/Guest | Chat proxy, notebook management |
| **Sessions** | 3 | Owner | MCP session management |
| **Comments** | 3 | Mixed | Note comments |
| **Annotations** | 3 | Owner | Note annotations |
| **Proposals** | 5 | Owner/Guest | Edit proposal lifecycle |
| **Notes** | 3 | Owner | Note CRUD, Git commit |
| **DRAKON** | 2 | Owner | Diagram save/delete via GitHub |
| **Chats** | 5 | Owner | Chat sync (fire-and-forget) |
| **Git** | 1 | Owner | Direct Git operations |
| **Health** | 1 | None | Service health check |
| **MCP** | 2 | Zone | JSON-RPC + SSE transport |

## Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `KV` | KV Namespace | Owner auth, zones, sessions, chat metadata |
| `MINIO_*` | Env vars | S3 endpoint, credentials |
| `GITHUB_TOKEN` | Env var | Repository access |
| `JWT_SECRET` | Env var | Token signing |

## Security

- JWT HS256 authentication on all protected routes
- Zone access codes (hex strings) for guest delegation
- **CORS: `Access-Control-Allow-Origin: *`** — open to all origins (known limitation)
- No rate limiting at worker level (relies on Cloudflare platform protections)

## S3v4 Signing

The worker implements AWS Signature Version 4 for MinIO requests:
```
HMAC-SHA256 based request signing
Canonical request → string-to-sign → signature → Authorization header
```

## Known Limitations

1. **Monolithic** — all 40+ routes in single file; no modular architecture
2. **No TypeScript** — no type safety at API boundary
3. **No tests** — no unit or integration tests
4. **CORS wildcard** — open to all origins
5. **Two separate workers** — main worker + NotebookLM worker, no unified deploy

## Future (per MASTER_PLAN)

- M1: `GET /v1/drakon/:folder/list` — diagram listing
- M4: `GET/PUT /v1/agents/:folder` — agent definition CRUD
- M5: Agent proposal endpoints (submit, list, approve, reject)

---

*The worker is the single point of entry for all frontend-to-backend communication.*
