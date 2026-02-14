# Architecture Decision Record: Federated Commenting System

**Date**: 2026-01-16  
**Status**: Accepted  
**Authors**: Lovable.dev Agent

---

## Executive Summary

This document records architectural decisions for implementing a federated commenting and annotation system for the exodus.pp.ua Digital Garden. The core goal: **curated comments become part of article knowledge accessible to AI models via MCP**.

---

## Architectural Decisions

### Decision 1: Storage Layer

**Decision**: **Option B — MinIO (canonical) + Cloudflare KV (index/cache)**

**Rationale**:
- MinIO already used for MCP session storage—reuse existing infrastructure
- KV provides fast article→comment lookup (sub-10ms) without scanning MinIO
- Comments are immutable after creation (append-only pattern suits S3)
- Budget-friendly: KV ~$5/mo, MinIO self-hosted = $0

**Trade-offs**:
- ✅ Fast reads via KV index
- ✅ Durable storage in MinIO
- ⚠️ Need to keep index in sync (managed in Worker)
- ⚠️ Eventual consistency between KV and MinIO

**Rejected**:
- Option A (MinIO only): Slow list operations, no caching
- Option C (Durable Objects): Overkill for MVP, adds $5-10/mo

---

### Decision 2: Comment Threading

**Decision**: **Option B — Single-level replies (Twitter-style)**

**Rationale**:
- Unlimited nesting creates complex context for AI models
- Flat list loses conversation context
- Single-level (parent → replies) balances structure and readability
- AI can understand "comment → reply" relationship clearly

**Trade-offs**:
- ✅ Clean structure for MCP export
- ✅ Simple UI implementation
- ⚠️ Can't have reply-to-reply (acceptable for knowledge base context)

---

### Decision 3: Real-time Updates

**Decision**: **Option C — No real-time (refresh to see new comments)**

**Rationale**:
- Digital Garden is not a chat application
- Comment frequency is low (knowledge curation, not social media)
- SSE adds Worker complexity (Durable Objects needed for true real-time)
- MVP focus: correctness over speed

**Trade-offs**:
- ✅ Simple implementation
- ✅ No WebSocket/DO cost
- ⚠️ Users must refresh to see new comments (acceptable for use case)

**Future**: Add polling (30s) in Phase 2 if needed.

---

### Decision 4: Owner Curation Workflow

**Decision**: **Option C — Separate layer (comments in separate file, included in MCP export)**

**Rationale**:
- Modifying original Markdown files is destructive
- Separate storage allows curated selection for MCP
- Owner can choose which comments to include per-export
- MCP endpoint can merge comments into context dynamically

**Implementation**:
1. Comments stored in MinIO: `comments/{articleSlug}/`
2. Owner marks comments as `approved` or `merged`
3. Export Modal: checkbox "Include Approved Comments"
4. MCP resource includes comments section appended to article

**Trade-offs**:
- ✅ Non-destructive (original Markdown untouched)
- ✅ Flexible per-export curation
- ⚠️ Comments not visible in static Markdown export (only MCP)

---

### Decision 5: UI/UX Pattern

**Decision**: **Option D — Hybrid (annotations + comment section)**

**Rationale**:
- Knowledge bases benefit from inline annotations on specific text
- General discussion needs dedicated comment section
- Mobile-friendly: annotations popup on selection, comments scroll-to-section
- Matches user mental model: "highlight → annotate" and "scroll → discuss"

**Components**:
1. `CommentSection` — Below article (blog-style)
2. `AnnotationPopup` — On text selection (Hypothesis-style)
3. `AnnotationHighlight` — Visual markers on annotated text

**Trade-offs**:
- ✅ Best of both worlds
- ✅ Works on desktop and mobile
- ⚠️ More complex implementation (2 interaction modes)

---

### Decision 6: Federation Protocol (Future)

**Decision**: **Option A — Custom HTTP + Ed25519 signatures (lightweight)**

**Rationale**:
- ActivityPub requires actor management and WebFinger discovery
- Matrix requires homeserver (stateful backend)
- Custom protocol fits Worker-to-Worker architecture
- Ed25519 available via Web Crypto API in Workers

**Protocol (Phase 2/3)**:
```
Discovery: GET /.well-known/garden-federation.json
Submit:    POST /federation/inbox (signed payload)
Verify:    Ed25519 public key from MinIO
```

**Trade-offs**:
- ✅ Minimal overhead
- ✅ No external dependencies
- ⚠️ Not compatible with Mastodon/Fediverse (ok for garden-to-garden)

**Deferred**: Full federation in Phase 2.

---

## Data Models

### TypeScript Interfaces

```typescript
// Comment status workflow: pending → approved → merged (optional)
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'merged';
export type CommentOrigin = 'local' | 'federated';

export interface CommentAuthor {
  id: string;                    // UUID or session ID
  name: string;                  // Display name
  domain: string;                // Origin domain (exodus.pp.ua)
  isOwner: boolean;              // Garden owner flag
}

export interface Comment {
  id: string;                    // UUIDv4
  articleSlug: string;           // Article this comment belongs to
  parentId: string | null;       // null = root, else parent comment ID
  author: CommentAuthor;
  content: string;               // Markdown content
  createdAt: string;             // ISO 8601
  updatedAt: string | null;      // ISO 8601 if edited
  status: CommentStatus;
  origin: CommentOrigin;
  originDomain?: string;         // If federated
  annotationId?: string;         // Link to annotation (if inline comment)
}

export interface Annotation {
  id: string;                    // UUIDv4
  articleSlug: string;
  highlightedText: string;       // Selected text fragment
  startOffset: number;           // Character offset in article
  endOffset: number;
  paragraphIndex: number;        // Which paragraph (for robustness)
  commentId: string;             // Associated comment
  createdAt: string;
}

export interface CommentIndex {
  articleSlug: string;
  commentCount: number;
  annotationCount: number;
  commentIds: string[];
  annotationIds: string[];
  lastUpdated: string;
}
```

---

## API Design

### Cloudflare Worker Endpoints

**Base URL**: `https://garden-mcp-server.maxfraieho.workers.dev`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/comments/create` | Zone/Owner | Create new comment |
| GET | `/comments/:articleSlug` | Zone/Owner | Fetch comments for article |
| PATCH | `/comments/:id` | Owner | Update comment (status, content) |
| DELETE | `/comments/:id` | Owner | Soft delete comment |
| POST | `/annotations/create` | Zone/Owner | Create annotation with comment |
| GET | `/annotations/:articleSlug` | Zone/Owner | Fetch annotations for article |

### Request/Response Examples

**POST /comments/create**
```json
// Request
{
  "articleSlug": "exodus.pp.ua/architecture",
  "content": "Great explanation of the MCP flow!",
  "parentId": null,
  "authorName": "Guest",
  "accessCode": "ACCESS-XXXXXXXX"
}

// Response
{
  "success": true,
  "comment": {
    "id": "a1b2c3d4",
    "articleSlug": "exodus.pp.ua/architecture",
    "content": "Great explanation of the MCP flow!",
    "status": "pending",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

**POST /annotations/create**
```json
// Request
{
  "articleSlug": "exodus.pp.ua/architecture",
  "highlightedText": "Cloudflare Worker handles all backend logic",
  "startOffset": 142,
  "endOffset": 185,
  "paragraphIndex": 3,
  "comment": {
    "content": "This is the key architectural decision!",
    "authorName": "Reader"
  },
  "accessCode": "ACCESS-XXXXXXXX"
}

// Response
{
  "success": true,
  "annotation": { ... },
  "comment": { ... }
}
```

---

## MinIO Bucket Structure

```
garden-data/
├── comments/
│   └── {articleSlug}/
│       ├── {commentId}.json        # Individual comment
│       └── ...
│
├── annotations/
│   └── {articleSlug}/
│       ├── {annotationId}.json     # Annotation with comment ref
│       └── ...
│
├── index/
│   └── comments/
│       └── {articleSlug}.json      # Comment index for fast lookup
│
└── federation/                      # Phase 2+
    ├── peers/
    │   └── {domain}/
    │       └── pubkey.pem
    └── inbox/
        └── {eventId}.json
```

---

## React Components

### New Components

| Component | Responsibility |
|-----------|----------------|
| `CommentSection.tsx` | Container for article comments, displays thread |
| `CommentThread.tsx` | Renders threaded comments (parent + replies) |
| `CommentItem.tsx` | Single comment with author, content, actions |
| `CommentForm.tsx` | Input form for new comment/reply |
| `AnnotationLayer.tsx` | Text selection detection, popup trigger |
| `AnnotationPopup.tsx` | Form that appears on text selection |
| `AnnotationHighlight.tsx` | Visual highlight on annotated text |
| `CommentModerationPanel.tsx` | Owner-only: approve/reject/merge comments |

### New Hooks

| Hook | Responsibility |
|------|----------------|
| `useComments.ts` | Fetch/create/update comments for article |
| `useAnnotations.ts` | Fetch/create annotations for article |
| `useTextSelection.ts` | Track text selection for annotations |

---

## Integration Plan

### 1. Access Zone Integration

Reuse existing access control:
- Comments require valid `accessCode` (zone-based or owner JWT)
- Guest comments via zone access start as `status: 'pending'`
- Owner comments auto-approved (`status: 'approved'`)

```typescript
// In Worker: validate access before creating comment
const zone = await getAccessZone(articleSlug, accessCode);
if (!zone || !zone.allowedActions?.includes('comment')) {
  return errorResponse('Not authorized to comment', 403);
}
```

### 2. MCP Export Integration

Modify `/sessions/create` and resource handlers:
- Add `includeComments: boolean` option
- Append approved comments to article context

```typescript
// In MCP resource/read handler
if (session.includeComments) {
  const comments = await fetchApprovedComments(articleSlug, env);
  const commentsSection = formatCommentsForAI(comments);
  return {
    content: article.content + '\n\n---\n\n## Community Notes\n\n' + commentsSection,
  };
}
```

### 3. Export Modal Update

Add to `ExportModal.tsx`:
- Checkbox: "Include Approved Comments"
- Pass flag to `createSession()`

---

## Implementation Phases

### Phase 1: MVP (Current Sprint)

**Scope**:
1. ✅ Comment storage in MinIO + KV index
2. ✅ Basic CRUD API in Worker
3. ✅ `CommentSection` component below articles
4. ✅ `CommentForm` for owner to add comments
5. ✅ Owner moderation (approve/reject)
6. ✅ Include comments in MCP export

**Not in MVP**:
- ❌ Annotations (Phase 2)
- ❌ Federation (Phase 2-3)
- ❌ Guest commenting UI (Phase 2)

### Phase 2: Annotations + Guest UX

**Scope**:
- Annotation layer with text selection
- Guest comment form via AccessZone
- Real-time polling (30s)
- Visual highlights on annotated text

### Phase 3: Federation

**Scope**:
- `/.well-known/garden-federation.json`
- `/federation/inbox` endpoint
- Ed25519 signature verification
- Peer discovery and approval UI

---

## Success Criteria

| Criteria | MVP | Phase 2 | Phase 3 |
|----------|-----|---------|---------|
| Owner can comment on articles | ✅ | ✅ | ✅ |
| Guest can comment via zone | - | ✅ | ✅ |
| Comments stored in MinIO | ✅ | ✅ | ✅ |
| Owner can approve/reject | ✅ | ✅ | ✅ |
| MCP export includes comments | ✅ | ✅ | ✅ |
| Annotations on text | - | ✅ | ✅ |
| Federation between gardens | - | - | ✅ |
| Mobile-friendly UI | ✅ | ✅ | ✅ |
| Budget < $10/month | ✅ | ✅ | ✅ |

---

## Appendix: Cost Analysis

| Component | MVP Cost | Scale (10k comments) |
|-----------|----------|----------------------|
| Cloudflare Worker | $0 (free tier) | $0 |
| Cloudflare KV | $5/mo | $5/mo |
| MinIO (self-hosted) | $0 | $0 |
| Total | **$5/mo** | **$5/mo** |
