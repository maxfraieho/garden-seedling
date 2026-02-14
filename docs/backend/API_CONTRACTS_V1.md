# API Contracts V1

> Створено: 2026-02-15
> Автор: Головний архітектор системи
> Статус: Специфікація (канонічна)
> Мова: Українська (канонічна)
> Джерела: INBOX_ТА_PROPOSAL_АРХІТЕКТУРА.md §6, ЦІЛЬОВА_АРХІТЕКТУРА_MASTRA_INNGEST.md §2.5, LOVABLE_УЗГОДЖЕННЯ.md §2–4

---

## 0. Загальні правила

### 0.1 Base URL

```
https://garden-api.exodus.pp.ua
```

Усі endpoints проксюються через Cloudflare Worker. Frontend використовує `mcpGatewayClient.ts` як єдиний клієнт.

### 0.2 Автентифікація

| Тип | Header | Опис |
|-----|--------|------|
| Owner | `Authorization: Bearer <JWT>` | Повний доступ |
| Zone Guest | `X-Zone-Code: ZONE-XXXX-YYYY` | Обмежений доступ до зони |
| Agent | `X-Agent-Identity: agent:<slug>` + internal HMAC | Тільки з runtime |
| Webhook | HMAC signature у body | Зареєстроване джерело |

### 0.3 Загальні правила

| Правило | Опис |
|---------|------|
| **Content-Type** | `application/json` для всіх request/response |
| **Idempotency** | Мутуючі операції ідемпотентні за `id` або `correlationId` |
| **Rate limit** | 60 req/min per identity (Owner), 20 req/min (Agent), 10 req/min (Webhook) |
| **Correlation ID** | Опціональний header `X-Correlation-Id` для tracing |
| **Error format** | Єдиний формат помилок (див. §0.4) |
| **Timestamps** | Усі timestamps у ISO 8601 UTC |

### 0.4 Error Response

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Intent action not in agent safe_outputs",
    "details": {
      "field": "intent.action",
      "value": "propose-delete",
      "allowed": ["propose-edit", "propose-summary"]
    }
  },
  "correlationId": "corr_abc123"
}
```

| HTTP Status | Коли |
|-------------|------|
| 400 | Невалідний request body |
| 401 | Відсутній або невалідний JWT/token |
| 403 | Недостатні права (Guest → Owner-only endpoint) |
| 404 | Resource не знайдено |
| 409 | Конфлікт (concurrent modification, invalid state transition) |
| 429 | Rate limit перевищено |
| 500 | Internal server error |
| 502 | Upstream error (MinIO, Inngest недоступні) |

---

## 1. Inbox

### 1.1 POST /inbox/submit

Створити Inbox Entry (намір змінити стан системи).

**Auth:** Owner (JWT) | Zone Guest (zone code) | Agent (identity)

**Request:**

```json
{
  "intent": {
    "action": "propose-edit",
    "target": "notes/violin.pp.ua/sonata-bwv1001",
    "payload": {
      "diff": {
        "type": "append",
        "position": "after-frontmatter",
        "text": "## Резюме\n\nСоната BWV 1001..."
      },
      "reasoning": "Нотатка не має резюме",
      "citations": [
        {"source": "violin-taxonomy.md", "quote": "BWV 1001 — перша соната..."}
      ]
    }
  },
  "metadata": {
    "correlation_id": "run_2026-02-14_080000_abc123",
    "priority": "normal"
  }
}
```

**Response (202 Accepted):**

```json
{
  "inbox_id": "inbox_2026-02-14_abc123",
  "status": "pending",
  "proposal_id": "prop_2026-02-14_xyz789",
  "correlationId": "run_2026-02-14_080000_abc123"
}
```

**Примітка:** Якщо auto-approve rule matched — `proposal_id` одразу повертається зі статусом `auto_approved`. UI може перевірити через GET /proposals/{id}.

---

### 1.2 GET /inbox/stats

Статистика Inbox.

**Auth:** Owner

**Response (200 OK):**

```json
{
  "pending": 3,
  "processed_today": 12,
  "rejected_today": 1,
  "expired_today": 0
}
```

---

### 1.3 GET /inbox/entries

Список Inbox entries.

**Auth:** Owner

**Query params:**

| Param | Тип | Default | Опис |
|-------|-----|---------|------|
| `status` | string | `pending` | Фільтр: `pending`, `processed`, `rejected`, `expired` |
| `limit` | number | 20 | Кількість записів |
| `offset` | number | 0 | Зміщення для пагінації |

**Response (200 OK):**

```json
{
  "entries": [
    {
      "id": "inbox_2026-02-14_abc123",
      "source": {
        "type": "agent",
        "identity": "agent:archivist-violin"
      },
      "intent": {
        "action": "propose-summary",
        "target": "notes/violin.pp.ua/sonata-bwv1001"
      },
      "metadata": {
        "priority": "normal",
        "ttl_hours": 72,
        "correlation_id": "run_2026-02-14_080000_abc123"
      },
      "status": "pending",
      "created_at": "2026-02-14T12:00:00Z",
      "proposal_id": null
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

---

## 2. Agent Run

### 2.1 POST /agents/run

Ініціювати виконання агента.

**Auth:** Owner

**Request:**

```json
{
  "agent_slug": "archivist-violin",
  "params": {
    "target_folder": "violin.pp.ua",
    "max_notes": 5
  }
}
```

**Response (200 OK):**

```json
{
  "run_id": "run_2026-02-14_080000_abc123",
  "agent_slug": "archivist-violin",
  "status": "requested",
  "correlationId": "run_2026-02-14_080000_abc123"
}
```

---

### 2.2 GET /runs/{runId}/status

Поточний статус виконання.

**Auth:** Owner

**Response (200 OK):**

```json
{
  "run_id": "run_2026-02-14_080000_abc123",
  "agent_slug": "archivist-violin",
  "status": "running",
  "trigger": "manual",
  "started_at": "2026-02-14T08:00:00Z",
  "finished_at": null,
  "current_step": "nlm-query",
  "steps_total": 4,
  "steps_completed": 2,
  "proposals_created": [],
  "error": null
}
```

Коли `status: "queued"`:

```json
{
  "run_id": "run_2026-02-14_090000_def456",
  "agent_slug": "archivist-violin",
  "status": "queued",
  "trigger": "manual",
  "started_at": null,
  "finished_at": null,
  "current_step": null,
  "steps_total": null,
  "steps_completed": 0,
  "proposals_created": [],
  "error": null,
  "queue_position": 2
}
```

---

### 2.3 GET /runs/{runId}/steps

Покрокові результати виконання.

**Auth:** Owner

**Response (200 OK):**

```json
{
  "run_id": "run_2026-02-14_080000_abc123",
  "steps": [
    {
      "step_number": 1,
      "step_name": "load-context",
      "status": "completed",
      "started_at": "2026-02-14T08:00:01Z",
      "finished_at": "2026-02-14T08:00:03Z",
      "duration_ms": 2100,
      "output_summary": "Завантажено 5 джерел з sources/",
      "error": null
    },
    {
      "step_number": 2,
      "step_name": "nlm-query",
      "status": "running",
      "started_at": "2026-02-14T08:00:04Z",
      "finished_at": null,
      "duration_ms": null,
      "output_summary": null,
      "error": null
    },
    {
      "step_number": 3,
      "step_name": "create-proposal",
      "status": "pending",
      "started_at": null,
      "finished_at": null,
      "duration_ms": null,
      "output_summary": null,
      "error": null
    }
  ]
}
```

---

## 3. Proposals

### 3.1 GET /proposals/pending

Список proposals, що очікують рішення.

**Auth:** Owner

**Query params:**

| Param | Тип | Default | Опис |
|-------|-----|---------|------|
| `agent` | string | — | Фільтр за agent slug |
| `action` | string | — | Фільтр за action type |
| `limit` | number | 20 | Кількість |
| `offset` | number | 0 | Зміщення |

**Response (200 OK):**

```json
{
  "proposals": [
    {
      "id": "prop_2026-02-14_xyz789",
      "status": "pending",
      "created_at": "2026-02-14T12:00:05Z",
      "expires_at": "2026-02-17T12:00:05Z",
      "source": {
        "type": "agent",
        "identity": "agent:archivist-violin",
        "run_id": "run_2026-02-14_080000_abc123"
      },
      "action": "propose-summary",
      "target": {
        "type": "note",
        "path": "notes/violin.pp.ua/sonata-bwv1001.md"
      },
      "content": {
        "summary": "Додати структуроване резюме нотатки BWV 1001"
      }
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### 3.2 GET /proposals/{id}

Повні деталі proposal (для detail/review view).

**Auth:** Owner

**Response (200 OK):**

```json
{
  "id": "prop_2026-02-14_xyz789",
  "inbox_entry_id": "inbox_2026-02-14_abc123",
  "status": "pending",
  "created_at": "2026-02-14T12:00:05Z",
  "updated_at": "2026-02-14T12:00:05Z",
  "expires_at": "2026-02-17T12:00:05Z",

  "source": {
    "type": "agent",
    "identity": "agent:archivist-violin",
    "run_id": "run_2026-02-14_080000_abc123"
  },

  "action": "propose-summary",
  "target": {
    "type": "note",
    "path": "notes/violin.pp.ua/sonata-bwv1001.md"
  },

  "content": {
    "summary": "Додати структуроване резюме нотатки BWV 1001",
    "diff": {
      "type": "append",
      "position": "after-frontmatter",
      "text": "## Резюме\n\nСоната BWV 1001 для скрипки соло..."
    },
    "reasoning": "Нотатка не має резюме. NotebookLM підтвердив ключові тези на основі 3 джерел.",
    "citations": [
      {
        "source": "violin-taxonomy.md",
        "quote": "BWV 1001 — перша соната для скрипки соло, Adagio-Fuga-Siciliana-Presto"
      }
    ]
  },

  "approval": {
    "decided_by": null,
    "decided_at": null,
    "decision_note": null
  },

  "apply_result": {
    "git_commit": null,
    "minio_path": null,
    "error": null
  },

  "base_revision": "abc123def",
  "target_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb924"
}
```

---

### 3.3 PATCH /proposals/{id}

Approve або Reject proposal.

**Auth:** Owner

**Request (approve):**

```json
{
  "status": "approved",
  "decision_note": "Якість резюме задовільна"
}
```

**Request (reject):**

```json
{
  "status": "rejected",
  "decision_note": "Резюме не відображає ключову тезу про аплікатуру"
}
```

**Правила:**

| Поточний status | Дозволені transitions | Примітка |
|-----------------|----------------------|----------|
| `pending` | `approved`, `rejected` | Нормальний шлях |
| `failed` | `rejected` | Owner скасовує failed proposal |
| `approved` | — | Не можна змінити після approval |
| `applied` | — | Не можна змінити |
| `rejected` | — | Final state |

**Response (200 OK):**

```json
{
  "id": "prop_2026-02-14_xyz789",
  "status": "approved",
  "approval": {
    "decided_by": "owner",
    "decided_at": "2026-02-14T14:30:00Z",
    "decision_note": "Якість резюме задовільна"
  }
}
```

**Error (409 Conflict):**

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from 'applied' to 'rejected'"
  }
}
```

---

### 3.4 GET /proposals/history

Архів обробленних proposals.

**Auth:** Owner

**Query params:**

| Param | Тип | Default | Опис |
|-------|-----|---------|------|
| `status` | string | `applied,rejected` | Фільтр за статусом |
| `agent` | string | — | Фільтр за agent slug |
| `from` | string | — | ISO 8601 date, від |
| `to` | string | — | ISO 8601 date, до |
| `limit` | number | 20 | Кількість |
| `offset` | number | 0 | Зміщення |

**Response:** Аналогічний GET /proposals/pending.

---

## 4. Artifacts

### 4.1 GET /runs/{runId}/artifacts

Артефакти, створені під час run.

**Auth:** Owner

**Response (200 OK):**

```json
{
  "run_id": "run_2026-02-14_080000_abc123",
  "artifacts": [
    {
      "name": "proposal-summary-sonata-bwv1001.json",
      "type": "application/json",
      "size_bytes": 2048,
      "created_at": "2026-02-14T08:02:30Z",
      "download_url": "/runs/run_2026-02-14_080000_abc123/artifacts/proposal-summary-sonata-bwv1001.json"
    }
  ]
}
```

---

### 4.2 GET /runs/{runId}/artifacts/{filename}

Завантажити конкретний артефакт.

**Auth:** Owner

**Response:** Binary content з відповідним Content-Type.

---

## 5. Agents

### 5.1 GET /agents

Список зареєстрованих агентів.

**Auth:** Owner

**Response (200 OK):**

```json
{
  "agents": [
    {
      "slug": "archivist-violin",
      "name": "Архіваріус Violin",
      "status": "active",
      "version": "1.2.0",
      "description": "Аналізує нові нотатки та створює резюме",
      "last_run": "2026-02-14T08:00:00Z",
      "last_run_status": "completed",
      "pending_proposals": 2
    }
  ]
}
```

---

### 5.2 GET /agents/{slug}

Деталі агента (parsed `_agent.md`).

**Auth:** Owner

**Response (200 OK):**

```json
{
  "slug": "archivist-violin",
  "name": "Архіваріус Violin",
  "version": "1.2.0",
  "description": "Аналізує нові нотатки та створює резюме",
  "status": "active",
  "model": "claude-sonnet-4-5-20250929",
  "tools": ["notebooklm-query", "read-context", "read-notes", "create-proposal"],
  "safe_outputs": ["propose-summary", "propose-tag"],
  "triggers": {
    "manual": true,
    "cron": "0 8 * * 1-5",
    "events": ["note/created"]
  },
  "context": {
    "folder": "violin.pp.ua",
    "max_sources": 5,
    "notebook_id": "nb_violin_main"
  },
  "created_at": "2026-02-01T10:00:00Z",
  "updated_at": "2026-02-14T12:00:00Z",
  "generated_from": "main-flow.drakon.json"
}
```

---

## 6. Idempotency та Correlation

### 6.1 Correlation ID

**[РІШЕННЯ]** Усі мутуючі operations приймають `X-Correlation-Id` header або `correlationId` у body. Це дозволяє:

- Tracing крізь Inbox → Proposal → Apply
- Дедуплікацію (той самий correlationId = ідемпотентність)
- Зв'язування run → proposal → apply у логах

### 6.2 Idempotency

| Endpoint | Ідемпотентність | Ключ |
|----------|-----------------|------|
| POST /inbox/submit | Так (за correlationId) | `correlationId` |
| POST /agents/run | Так (за correlationId) | `correlationId` |
| PATCH /proposals/{id} | Так (за id + status) | `id` + `status` |

Повторний POST /inbox/submit з тим самим `correlationId` повертає 200 з існуючим `inbox_id`.

### 6.3 Rate Limiting

| Identity | Ліміт | Вікно | Response при перевищенні |
|----------|-------|-------|------------------------|
| Owner | 60 req/min | Sliding window | 429 + `Retry-After` header |
| Agent | 20 req/min | Sliding window | 429 |
| Webhook | 10 req/min | Sliding window | 429 |
| Zone Guest | 30 req/min | Sliding window | 429 |

---

## Див. також

- **INBOX_ТА_PROPOSAL_АРХІТЕКТУРА.md** — повна специфікація lifecycle
- **INBOX_AND_RUN_LIFECYCLE_V1.md** — state machines для UI
- **PROPOSAL_SYSTEM_V1.md** — proposal semantics для UI
- **LOVABLE_УЗГОДЖЕННЯ_З_RUNTIME_АРХІТЕКТУРОЮ.md** — контракт frontend з runtime
- **ЦІЛЬОВА_АРХІТЕКТУРА_MASTRA_INNGEST.md** — runtime architecture

---

*Цей документ є канонічною специфікацією API контрактів системи Garden Seedling.*
