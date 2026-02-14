# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
│                                                                 │
│   Owner (Admin)              Guests (Zone Access)               │
│        │                            │                           │
└────────┼────────────────────────────┼───────────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOVABLE FRONTEND                             │
│                                                                 │
│   React + TypeScript + Tailwind                                 │
│   ├── Access Gate (TODO)                                        │
│   ├── Owner Dashboard                                           │
│   ├── Zone Viewer                                               │
│   └── MCP Integration                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE WORKER                              │
│                                                                 │
│   Vanilla JavaScript (no dependencies)                          │
│   ├── Auth (JWT, password hash)                                 │
│   ├── Zones (create, validate, list)                            │
│   ├── Sessions (MCP sessions)                                   │
│   └── MCP Protocol (JSON-RPC, SSE)                              │
│                                                                 │
│   Bindings:                                                     │
│   ├── KV (MCP_SESSIONS)                                         │
│   └── Environment Variables                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    CLOUDFLARE KV        │     │       MINIO S3          │
│                         │     │                         │
│   - Owner password hash │     │   - Session files       │
│   - Zone definitions    │     │   - Note exports        │
│   - Session metadata    │     │   - Attachments         │
│                         │     │                         │
└─────────────────────────┘     └─────────────────────────┘
```

## Components

### Frontend (Lovable)

**Tech Stack:**
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui
- React Router

**Key Components:**
```
src/
├── components/garden/
│   ├── AccessZonesManager.tsx    # Zone CRUD
│   ├── MCPAccessPanel.tsx        # MCP session management
│   ├── OwnerLoginDialog.tsx      # Admin login
│   └── ...
├── hooks/
│   ├── useAccessZones.ts         # Zone state & API
│   ├── useMCPSessions.ts         # Session state & API
│   └── useOwnerAuth.tsx          # Auth state & JWT
└── pages/
    ├── Index.tsx                 # Main garden view
    └── ZoneViewPage.tsx          # Zone-restricted view
```

### Backend (Cloudflare Worker)

**Deployment:** Cloudflare Dashboard (Quick Edit)

**No Dependencies:** Vanilla JavaScript only

**Structure:**
```
infrastructure/cloudflare/worker/
├── index.js          # Main worker code
├── README.md         # Documentation
├── accessZone.md     # Zone logic docs
└── auth.md           # Auth model docs
```

### Storage

**Cloudflare KV:**
- Fast key-value storage
- Used for: auth, zones, sessions metadata
- Binding name: `KV`

**MinIO S3:**
- Object storage
- Used for: session files, exports
- AWS S3 compatible API

## Data Flow

### Authentication

```
User → Login Form → POST /auth/login → Worker
                                         │
                                         ▼
                                   Verify password
                                         │
                                         ▼
                                   Generate JWT
                                         │
                                         ▼
User ← Store token ← JWT response ← Worker
```

### Zone Access

```
Guest → Enter code → GET /zones/validate/:id → Worker
                                                  │
                                                  ▼
                                            Check KV for zone
                                                  │
                                                  ▼
                                            Verify code & expiry
                                                  │
                                                  ▼
Guest ← Show notes ← Zone data ← Worker
```

## Security Layers

1. **Cloudflare** - DDoS, WAF
2. **Worker Auth** - JWT validation
3. **Zone Access** - Code + expiration
4. **CORS** - Origin restrictions
