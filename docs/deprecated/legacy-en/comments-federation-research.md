
***

# ДОСЛІДЖЕННЯ: Федеративна система коментування (Worker + MinIO)

## Executive Summary

**Контекст**: Digital Garden (exodus.pp.ua) як knowledge base для AI-моделей. Критично важливо: коментарі → частина знань → включаються в статтю для делегування AI.

**Архітектурний висновок**: 
- **Hybrid storage**: MinIO (canonical source) + Cloudflare KV (index/cache)
- **Custom lightweight federation** поверх HTTP + Ed25519 signatures
- **Eventual consistency** з manual merge коментарів у статті (owner-curated)
- **No stateful backend** — Worker як stateless gateway
- **Budget**: $3-7/міс (MinIO self-hosted, CF Free tier, KV ~$5)

***

## 1. Protocol Choice

### 1.1 Порівняльний аналіз

| Критерій | Matrix | ActivityPub | Custom HTTP + Signatures |
|----------|---------|-------------|--------------------------|
| **Складність** | High (homeserver required) | Medium (instance metadata) | Low (Worker-native) |
| **State** | Homeserver DB | Instance actor DB | Stateless (S3 only) |
| **Threaded comments** | Native (m.room.message) | Via `inReplyTo` | Custom JSON structure |
| **Federation model** | Server-to-server | Actor-to-actor | Worker-to-Worker |
| **Payload storage** | Matrix DB | Instance DB + S3 optional | MinIO-first |
| **Worker compatibility** | ❌ Needs homeserver | ⚠️ Needs actor management | ✅ Pure edge logic |
| **Real-time** | Native (sync API) | Polling | Polling / SSE |
| **Spec complexity** | 500+ pages | ~100 pages | 2-page doc |

### 1.2 Рекомендація: Custom Federation Protocol

**Чому НЕ Matrix**:
- Потребує homeserver (Synapse/Dendrite) → stateful backend
- Overhead для simple comment threads
- ❌ Contradicts "no n8n, no stateful services"

**Чому НЕ ActivityPub**:
- Instance actor model requires persistent actor storage
- `@username@domain` identity — overkill для garden-to-garden federation
- WebFinger, `.well-known/host-meta` — додаткові endpoints

**Чому Custom**:
- ✅ Worker може обробити все в memory + MinIO
- ✅ Ed25519 signatures (Cloudflare Web Crypto API)
- ✅ Minimal federation handshake:
  - Discovery: `GET /.well-known/garden-federation.json`
  - Submit: `POST /federation/inbox` з підписом
  - Verify: Ed25519 public key з MinIO (`federation/peers/{domain}/pubkey.pem`)

***

## 2. Architecture (No n8n)

### 2.1 Компоненти

```mermaid
graph TB
    subgraph "Client (React)"
        A[Article View]
        B[Comment Form]
        C[Highlight Annotation]
    end
    
    subgraph "Cloudflare Worker"
        D[API Router]
        E[Auth Middleware]
        F[Federation Handler]
        G[Signature Verifier]
    end
    
    subgraph "Storage Layer"
        H[MinIO S3]
        I[Cloudflare KV]
    end
    
    subgraph "Remote Garden"
        J[Remote Worker]
        K[Remote MinIO]
    end
    
    A -->|GET /api/comments/{slug}| D
    B -->|POST /api/comments| D
    C -->|POST /api/annotations| D
    D --> E
    E --> I
    E --> H
    D --> F
    F --> G
    F --> H
    J -->|POST /federation/inbox| F
    F -->|POST /federation/inbox| J
    G --> H
```

### 2.2 Worker Responsibilities

**Cloudflare Worker** (`worker/index.ts`):

```typescript
// Routes
const routes = {
  // Local API
  'POST /api/comments': handleCreateComment,
  'GET /api/comments/:slug': handleGetComments,
  'POST /api/annotations': handleCreateAnnotation,
  
  // Federation
  'POST /federation/inbox': handleFederatedInbox,
  'GET /.well-known/garden-federation.json': handleDiscovery,
  
  // Management
  'DELETE /api/comments/:id': handleDeleteComment,
  'PATCH /api/comments/:id': handleUpdateComment,
}
```

**Responsibilities**:
1. **Delegation tokens** (reuse existing Access Zone logic)
2. **Comment CRUD** → MinIO
3. **Federation inbox** → verify signature → store
4. **Signature generation** → Ed25519 sign outgoing
5. **Access control** → owner vs guest vs federated

**NOT responsible for**:
- ❌ Comment rendering (React side)
- ❌ AI embedding generation (optional future: OpenFaaS function)
- ❌ Real-time sync (polling from client)

***

## 3. Data Model (MinIO)

### 3.1 S3 Bucket Structure

```
garden-comments/
├── articles/
│   └── {slug}/
│       ├── snapshot.json          # Article content at delegation time
│       └── metadata.json          # Title, tags, created_at
│
├── comments/
│   └── {articleSlug}/
│       ├── {commentId}.json       # Individual comments
│       └── thread-{threadId}.json # Thread metadata
│
├── annotations/
│   └── {articleSlug}/
│       └── {annotationId}.json    # Highlights + comments
│
├── federation/
│   ├── peers/
│   │   └── {domain}/
│   │       ├── pubkey.pem         # Ed25519 public key
│   │       └── metadata.json      # Garden name, owner
│   ├── inbox/
│   │   └── {eventId}.json         # Incoming federated events
│   └── outbox/
│       └── {eventId}.json         # Outgoing federated events
│
└── index/
    └── by-article/
        └── {slug}.json            # Comment IDs for fast lookup
```

### 3.2 TypeScript Interfaces

```typescript
// Core Types
interface Comment {
  id: string;                    // UUIDv4
  articleSlug: string;
  threadId: string | null;       // null = root, else parent comment ID
  author: Author;
  content: string;               // Markdown
  createdAt: string;             // ISO 8601
  updatedAt: string | null;
  signature: string;             // Ed25519 signature of content
  origin: 'local' | 'federated';
  originDomain?: string;         // If federated
  annotationId?: string;         // Link to highlight
  status: 'pending' | 'approved' | 'rejected' | 'merged'; // Owner curation
}

interface Author {
  id: string;                    // UUID or domain-based ID
  name: string;
  domain: string;                // exodus.pp.ua or remote
  publicKey?: string;            // Ed25519 for verification
}

interface Annotation {
  id: string;
  articleSlug: string;
  highlightedText: string;
  startOffset: number;
  endOffset: number;
  comment: Comment;              // Embedded comment object
  createdAt: string;
}

interface ArticleSnapshot {
  slug: string;
  title: string;
  content: string;               // Markdown at delegation time
  createdAt: string;
  snapshotAt: string;
  version: number;
}

interface FederationEvent {
  id: string;
  type: 'comment.create' | 'comment.update' | 'comment.delete';
  actor: {
    domain: string;
    publicKey: string;
  };
  object: Comment | Annotation;
  signature: string;
  timestamp: string;
}

interface CommentIndex {
  articleSlug: string;
  totalComments: number;
  threadIds: string[];
  commentIds: string[];
  lastUpdated: string;
}
```

### 3.3 Immutability Design

**Append-only pattern**:
- Comments are **never modified** in MinIO
- Updates → create new version with `updatedAt`
- Delete → soft delete (`status: 'deleted'`)
- Index in KV updated on each change

***

## 4. Federation Flow

### 4.1 Discovery Handshake

**Scenario**: Garden B хоче коментувати статтю з Garden A

```mermaid
sequenceDiagram
    participant B as Garden B Worker
    participant A as Garden A Worker
    participant MinIO as Garden A MinIO
    
    B->>A: GET /.well-known/garden-federation.json
    A->>MinIO: Read federation/config.json
    A->>B: {domain, publicKey, version}
    
    B->>B: Store peer metadata
    B->>MinIO: Write federation/peers/garden-a.com/metadata.json
```

**`garden-federation.json`** response:

```json
{
  "domain": "exodus.pp.ua",
  "version": "1.0",
  "publicKey": "Ed25519:base64...",
  "endpoints": {
    "inbox": "https://exodus.pp.ua/federation/inbox",
    "outbox": "https://exodus.pp.ua/federation/outbox"
  },
  "owner": {
    "name": "Garden Owner",
    "contact": "owner@exodus.pp.ua"
  }
}
```

### 4.2 Comment Submission Flow

**Local comment** (same garden):

```mermaid
sequenceDiagram
    participant React as React Client
    participant Worker as CF Worker
    participant KV as CF KV
    participant MinIO as MinIO
    
    React->>Worker: POST /api/comments<br/>{articleSlug, content, threadId}
    Worker->>Worker: Generate ID, timestamp
    Worker->>Worker: Sign with local key
    Worker->>MinIO: PUT comments/{slug}/{id}.json
    Worker->>KV: Update index/{slug}.json
    Worker->>React: 201 {comment}
```

**Federated comment** (remote garden):

```mermaid
sequenceDiagram
    participant RemoteReact as Remote Client
    participant RemoteWorker as Remote Worker
    participant LocalWorker as Local Worker
    participant LocalMinIO as Local MinIO
    
    RemoteReact->>RemoteWorker: POST /api/comments/federated
    RemoteWorker->>RemoteWorker: Create FederationEvent
    RemoteWorker->>RemoteWorker: Sign with Ed25519
    RemoteWorker->>LocalWorker: POST /federation/inbox<br/>{event, signature}
    LocalWorker->>LocalWorker: Verify signature
    LocalWorker->>LocalMinIO: PUT federation/inbox/{eventId}.json
    LocalWorker->>LocalMinIO: PUT comments/{slug}/{id}.json<br/>status='pending'
    LocalWorker->>RemoteWorker: 202 Accepted
```

### 4.3 Signature Scheme

**Signing** (outgoing):

```typescript
async function signEvent(event: FederationEvent, privateKey: CryptoKey): Promise<string> {
  const payload = JSON.stringify({
    id: event.id,
    type: event.type,
    actor: event.actor.domain,
    object: event.object,
    timestamp: event.timestamp,
  });
  
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    data
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

**Verification** (incoming):

```typescript
async function verifySignature(
  event: FederationEvent,
  signature: string,
  publicKeyPem: string
): Promise<boolean> {
  const publicKey = await importPublicKey(publicKeyPem);
  const payload = reconstructPayload(event);
  
  const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  
  return await crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    signatureBytes,
    new TextEncoder().encode(payload)
  );
}
```

***

## 5. Security Model

### 5.1 Per-Article Access Control

**Reuse Access Zone model**:

```typescript
interface ArticleAccessZone {
  articleSlug: string;
  accessCode: string;           // Like existing zones
  allowedActions: ('read' | 'comment' | 'annotate')[];
  expiresAt: Date;
  allowFederation: boolean;     // NEW: enable remote comments
  trustedDomains?: string[];    // Whitelist for federation
}
```

**Access validation**:

```typescript
async function canComment(
  articleSlug: string,
  accessCode: string,
  origin: 'local' | 'federated',
  domain?: string
): Promise<boolean> {
  const zone = await getAccessZone(articleSlug, accessCode);
  
  if (!zone || new Date() > zone.expiresAt) return false;
  if (!zone.allowedActions.includes('comment')) return false;
  
  if (origin === 'federated') {
    if (!zone.allowFederation) return false;
    if (zone.trustedDomains && !zone.trustedDomains.includes(domain!)) {
      return false;
    }
  }
  
  return true;
}
```

### 5.2 Rate Limiting

**Cloudflare Worker + KV**:

```typescript
async function checkRateLimit(
  domain: string,
  action: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const key = `ratelimit:${domain}:${action}`;
  const count = await env.KV.get<number>(key, 'json') || 0;
  
  if (count >= limit) return false;
  
  await env.KV.put(key, JSON.stringify(count + 1), {
    expirationTtl: windowSec,
  });
  
  return true;
}

// Usage
if (!await checkRateLimit(originDomain, 'comment.create', 10, 3600)) {
  return errorResponse(429, 'Rate limit exceeded');
}
```

### 5.3 Trust Model

**Zero trust between instances**:
- Every federated event **must** have valid signature
- Public keys stored in MinIO (`federation/peers/{domain}/pubkey.pem`)
- Manual trust: owner approves peer via UI (`trustedDomains`)

**Threat mitigation**:
- **DoS**: Rate limiting + manual peer approval
- **Spam**: All federated comments start as `status: 'pending'`
- **Impersonation**: Ed25519 signature required
- **Data integrity**: Signature covers full payload

***

## 6. Implementation

### 6.1 Cloudflare Worker Code

**File: `worker/src/index.ts`**

```typescript
import { Router } from 'itty-router';
import { S3Client } from '@aws-sdk/client-s3';
import { handleCreateComment } from './handlers/comments';
import { handleFederatedInbox } from './handlers/federation';
import { verifyAccessZone } from './auth';

export interface Env {
  KV: KVNamespace;
  MINIO_ENDPOINT: string;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  FEDERATION_PRIVATE_KEY: string; // Ed25519 PEM
}

const router = Router();

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

router.options('*', () => new Response(null, { headers: corsHeaders }));

// Local Comments API
router.post('/api/comments', async (req, env: Env) => {
  const { articleSlug, content, threadId, accessCode, annotationId } = await req.json();
  
  // Validate access
  if (!await verifyAccessZone(articleSlug, accessCode, 'comment', env)) {
    return jsonResponse({ error: 'Unauthorized' }, 403);
  }
  
  return handleCreateComment({
    articleSlug,
    content,
    threadId,
    annotationId,
    origin: 'local',
  }, env);
});

router.get('/api/comments/:slug', async (req, env: Env) => {
  const { slug } = req.params;
  
  // Read from KV index first (fast)
  const index = await env.KV.get<CommentIndex>(`index:${slug}`, 'json');
  if (!index) return jsonResponse({ comments: [] }, 200);
  
  // Fetch comments from MinIO
  const comments = await fetchCommentsFromMinIO(index.commentIds, env);
  
  return jsonResponse({ comments, total: index.totalComments }, 200);
});

// Federation
router.post('/federation/inbox', async (req, env: Env) => {
  return handleFederatedInbox(req, env);
});

router.get('/.well-known/garden-federation.json', async (req, env: Env) => {
  const publicKey = await getPublicKey(env);
  
  return jsonResponse({
    domain: new URL(req.url).hostname,
    version: '1.0',
    publicKey,
    endpoints: {
      inbox: `${new URL(req.url).origin}/federation/inbox`,
    },
  }, 200);
});

export default {
  fetch: router.handle,
};

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**File: `worker/src/handlers/comments.ts`**

```typescript
import { v4 as uuid } from 'uuid';
import { putToMinIO, updateKVIndex } from '../storage';
import type { Comment, Env } from '../types';

export async function handleCreateComment(
  data: {
    articleSlug: string;
    content: string;
    threadId?: string;
    annotationId?: string;
    origin: 'local' | 'federated';
    originDomain?: string;
  },
  env: Env
): Promise<Response> {
  const comment: Comment = {
    id: uuid(),
    articleSlug: data.articleSlug,
    threadId: data.threadId || null,
    author: {
      id: uuid(),
      name: data.origin === 'local' ? 'Local User' : 'Remote User',
      domain: data.originDomain || new URL(env.WORKER_URL).hostname,
    },
    content: data.content,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    signature: await signComment(data.content, env),
    origin: data.origin,
    originDomain: data.originDomain,
    annotationId: data.annotationId,
    status: data.origin === 'federated' ? 'pending' : 'approved',
  };
  
  // Store in MinIO
  const key = `comments/${data.articleSlug}/${comment.id}.json`;
  await putToMinIO(key, JSON.stringify(comment), env);
  
  // Update KV index
  await updateKVIndex(data.articleSlug, comment.id, env);
  
  return new Response(JSON.stringify(comment), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function signComment(content: string, env: Env): Promise<string> {
  const key = await importPrivateKey(env.FEDERATION_PRIVATE_KEY);
  const data = new TextEncoder().encode(content);
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

**File: `worker/src/handlers/federation.ts`**

```typescript
import { verifySignature } from '../crypto';
import { handleCreateComment } from './comments';
import type { FederationEvent, Env } from '../types';

export async function handleFederatedInbox(
  req: Request,
  env: Env
): Promise<Response> {
  const event: FederationEvent = await req.json();
  
  // Verify signature
  const peerPublicKey = await getPeerPublicKey(event.actor.domain, env);
  if (!peerPublicKey) {
    return new Response('Unknown peer', { status: 403 });
  }
  
  const isValid = await verifySignature(event, event.signature, peerPublicKey);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Store raw event in MinIO
  await putToMinIO(
    `federation/inbox/${event.id}.json`,
    JSON.stringify(event),
    env
  );
  
  // Process based on type
  if (event.type === 'comment.create') {
    return handleCreateComment({
      ...event.object,
      origin: 'federated',
      originDomain: event.actor.domain,
    }, env);
  }
  
  return new Response('Accepted', { status: 202 });
}
```

### 6.2 MinIO Client Integration

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3Client(env: Env): S3Client {
  return new S3Client({
    region: 'us-east-1',
    endpoint: env.MINIO_ENDPOINT,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

export async function putToMinIO(key: string, body: string, env: Env) {
  const client = getS3Client(env);
  await client.send(new PutObjectCommand({
    Bucket: env.MINIO_BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/json',
  }));
}

export async function getFromMinIO(key: string, env: Env): Promise<string | null> {
  const client = getS3Client(env);
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }));
    return await response.Body?.transformToString() || null;
  } catch {
    return null;
  }
}
```

### 6.3 React Integration

**File: `src/hooks/useComments.ts`**

```typescript
import { useState, useEffect } from 'react';
import type { Comment } from '@/types';

export function useComments(articleSlug: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchComments() {
      const response = await fetch(`/api/comments/${articleSlug}`);
      const data = await response.json();
      setComments(data.comments);
      setIsLoading(false);
    }
    
    fetchComments();
    const interval = setInterval(fetchComments, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [articleSlug]);
  
  async function addComment(content: string, threadId?: string, annotationId?: string) {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleSlug,
        content,
        threadId,
        annotationId,
        accessCode: getAccessCode(), // From URL or localStorage
      }),
    });
    
    if (response.ok) {
      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
    }
  }
  
  return { comments, isLoading, addComment };
}
```

**File: `src/components/CommentThread.tsx`**

```tsx
import { useComments } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';

export function CommentThread({ articleSlug }: { articleSlug: string }) {
  const { comments, isLoading, addComment } = useComments(articleSlug);
  
  // Build thread tree
  const rootComments = comments.filter(c => !c.threadId && c.status === 'approved');
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Comments ({rootComments.length})</h2>
      
      {rootComments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={comments.filter(c => c.threadId === comment.id)}
          onReply={(content) => addComment(content, comment.id)}
        />
      ))}
      
      <CommentForm onSubmit={(content) => addComment(content)} />
    </div>
  );
}
```

**File: `src/components/AnnotationLayer.tsx`**

```tsx
import { useState } from 'react';
import { useComments } from '@/hooks/useComments';

export function AnnotationLayer({ articleSlug, content }: Props) {
  const { addComment } = useComments(articleSlug);
  const [selection, setSelection] = useState<{text: string, range: Range} | null>(null);
  
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelection({ text: sel.toString(), range: sel.getRangeAt(0) });
    }
  };
  
  const handleAnnotate = async (commentText: string) => {
    if (!selection) return;
    
    // Create annotation
    const annotation = {
      highlightedText: selection.text,
      startOffset: selection.range.startOffset,
      endOffset: selection.range.endOffset,
    };
    
    // This will need backend support for annotations
    await addComment(commentText, undefined, annotation.id);
    setSelection(null);
  };
  
  return (
    <div onMouseUp={handleMouseUp}>
      {/* Render article content */}
      <div dangerouslySetInnerHTML={{ __html: content }} />
      
      {/* Annotation popup */}
      {selection && (
        <AnnotationPopup
          position={getSelectionPosition()}
          onSubmit={handleAnnotate}
          onCancel={() => setSelection(null)}
        />
      )}
    </div>
  );
}
```

***

## 7. Deployment & Cost

### 7.1 Infrastructure

**Cloudflare Worker**:
```bash
# wrangler.toml
name = "garden-comments"
main = "src/index.ts"
compatibility_date = "2026-01-16"

[env.production]
kv_namespaces = [
  { binding = "KV", id = "your-kv-id" }
]

[env.production.vars]
MINIO_ENDPOINT = "https://minio.exodus.pp.ua"
MINIO_BUCKET = "garden-comments"

[env.production.secrets]
MINIO_ACCESS_KEY = "..."
MINIO_SECRET_KEY = "..."
FEDERATION_PRIVATE_KEY = "..."
```

**Deploy**:
```bash
npm install -g wrangler
wrangler deploy --env production
```

**MinIO Setup**:
```bash
# Create bucket
mc mb minio/garden-comments

# Set lifecycle for federation inbox (auto-delete after 90 days)
mc ilm add --expiry-days 90 minio/garden-comments/federation/inbox
```

### 7.2 Cost Analysis

| Component | Usage | Cost |
|-----------|-------|------|
| **Cloudflare Worker** | Free tier: 100k req/day | $0 |
| **Cloudflare KV** | 1GB storage, 10M reads | ~$5/mo |
| **MinIO** (self-hosted) | 10GB storage | $0 (existing) |
| **Bandwidth** | CF free egress | $0 |
| **Domain** | Existing | $0 |
| **Total** | | **~$5/mo** |

**Scaling**:
- **100k comments**: KV $5 + Worker still free = $5/mo
- **1M comments**: KV $15 + Worker $5 = $20/mo
- **10M comments**: Consider Durable Objects ($10-50/mo)

### 7.3 Monitoring

```typescript
// Add to Worker
async function logMetric(metric: string, value: number, env: Env) {
  await env.KV.put(`metrics:${metric}:${Date.now()}`, JSON.stringify(value), {
    expirationTtl: 86400 * 7, // 7 days
  });
}

// Usage
await logMetric('comment.created', 1, env);
await logMetric('federation.inbox.received', 1, env);
```

**Cloudflare Dashboard**:
- Worker analytics (requests, CPU time)
- KV metrics (reads, writes, storage)

***

## Appendix: API Reference

### Local Comments API

**POST /api/comments**
```json
{
  "articleSlug": "programming/rust-basics",
  "content": "Great article!",
  "threadId": "optional-parent-id",
  "annotationId": "optional-highlight-id",
  "accessCode": "zone-access-code"
}
```

**GET /api/comments/:slug**
```json
{
  "comments": [...],
  "total": 42
}
```

### Federation API

**GET /.well-known/garden-federation.json**
```json
{
  "domain": "exodus.pp.ua",
  "version": "1.0",
  "publicKey": "Ed25519:AAAA...",
  "endpoints": {
    "inbox": "https://exodus.pp.ua/federation/inbox"
  }
}
```

**POST /federation/inbox**
```json
{
  "id": "event-uuid",
  "type": "comment.create",
  "actor": {
    "domain": "friend-garden.com",
    "publicKey": "Ed25519:BBBB..."
  },
  "object": { /* Comment object */ },
  "signature": "base64-signature",
  "timestamp": "2026-01-16T06:00:00Z"
}
```

***

## Компроміси та обґрунтування

### ✅ Що ми отримуємо
- **Minimal moving parts**: Worker + MinIO + KV (не потрібен n8n)
- **Federated**: Сади можуть коментувати один одного
- **AI-friendly**: Коментарі в MinIO → легко додати до статті для MCP
- **Owner-curated**: Federated comments = pending → owner approve → merge to article
- **Budget-friendly**: ~$5/місяць

### ⚠️ Компроміси
- **No real-time**: Polling кожні 30 сек (можна додати SSE пізніше)
- **Manual peer approval**: Треба додавати trusted domains вручну
- **No full ActivityPub**: Не сумісний з Mastodon/etc (але можна додати bridge)
- **Eventual consistency**: Federated comments можуть затриматись

### 🚀 Розширення (Phase 2)
- **SSE для real-time**: Cloudflare Durable Objects
- **AI embeddings**: OpenFaaS function для semantic search в коментарях
- **ActivityPub bridge**: Окремий Worker як adapter
- **Moderation tools**: React UI для approve/reject federated comments
