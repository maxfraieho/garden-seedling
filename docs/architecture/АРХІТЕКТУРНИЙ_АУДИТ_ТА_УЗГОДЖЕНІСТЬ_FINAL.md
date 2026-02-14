# Архітектурний аудит та узгодженість — FINAL

> Створено: 2026-02-15
> Автор: Головний архітектор системи
> Статус: Фінальний аудит узгодженості архітектури
> Мова: Українська (канонічна)
> Метод: Логічний аудит cross-document consistency + canonical layout V1 verification
> Базується на: усіх канонічних документах + новий MinIO layout V1 (наданий Owner)

---

## Перелік аудитованих документів

| Документ | Скорочення |
|----------|-----------|
| АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md | [БАЗА] |
| ЦІЛЬОВА_АРХІТЕКТУРА_MASTRA_INNGEST.md | [ЦІЛЬОВА] |
| КОНТРАКТ_АГЕНТА_V1.md | [КОНТРАКТ] |
| INBOX_ТА_PROPOSAL_АРХІТЕКТУРА.md | [INBOX] |
| DRAKON_ІНТЕГРАЦІЯ_ТА_МОДЕЛЬ_ВИКОНАННЯ_АГЕНТА.md | [DRAKON] |
| LOVABLE_УЗГОДЖЕННЯ_З_RUNTIME_АРХІТЕКТУРОЮ.md | [FRONTEND] |
| ПЛАН_МІГРАЦІЇ_GH_AW_НА_MASTRA_INNGEST.md | [МІГРАЦІЯ] |
| MANIFESTO.md | [МАНІФЕСТ] |
| MinIO Canonical Layout V1 (Owner spec) | [LAYOUT] |

---

## РОЗДІЛ 1 — Перевірка інваріантів

### Інваріант 1: Folder = Agent

**ПІДТВЕРДЖЕНО**

[МАНІФЕСТ] §2.2: "Папка = Агент". [КОНТРАКТ] §1.1: `agents/<slug>/` з `_agent.md` як маркер. [LAYOUT]: `agents/<agentSlug>/` з `_agent.md` як entry point.

Усі документи та новий layout узгоджені. `_agent.md` є маркером існування агента. Папка без `_agent.md` — не агент (технічний рівень).

**Розв'язане застереження:** Маніфест (ідеологія: "будь-яка папка = потенційний агент") та контракт (технічна реальність: потрібен `_agent.md`) — це два рівні. Ідеологія описує intention, контракт описує activation. Це не конфлікт.

---

### Інваріант 2: MinIO = canonical source of truth

**ПІДТВЕРДЖЕНО**

[ЦІЛЬОВА] §1, [КОНТРАКТ] §0, [DRAKON] Інваріант 3, [INBOX] §0, [FRONTEND] Інваріант 1, [МІГРАЦІЯ] Інваріант 1 — усі підтверджують.

[LAYOUT] розширює та конкретизує MinIO layout:

```
/system/     ← глобальні policies, schemas, glossary
/zones/      ← зони з inbox та sources
/agents/     ← визначення агентів
/audit/      ← аудит-лог
```

**Розв'язане застереження (dual source of truth):**

[LAYOUT] §5 визначає: deprecated доки зберігаються у репо, не в MinIO. Це означає:

| Домен | Canonical source | Формат |
|-------|-----------------|--------|
| Agent system (definitions, runs, proposals, audit) | **MinIO** | JSON, Markdown, NDJSON |
| Notes content (Zettelkasten) | **Git** (GitHub) | Markdown |
| Agent logic (DRAKON) | **MinIO** `agents/<slug>/drakon/` | JSON |
| System policies, schemas | **MinIO** `/system/` | JSON, Markdown |
| Zone data (inbox, sources) | **MinIO** `/zones/` | JSON, Markdown |

Розмежування тепер **явне**: Git = notes content, MinIO = усе інше. Це розв'язує ambiguity з попереднього аудиту.

---

### Інваріант 3: `_agent.md` і pseudocode = behavioral contract

**ПІДТВЕРДЖЕНО** (з уточненням від [LAYOUT])

[КОНТРАКТ] визначає `_agent.md` як entry point. [DRAKON] визначає `pseudocode.md` як behavioral contract.

**Розв'язано [LAYOUT]:** Layout включає `pseudocode.md` як **окремий файл** поряд з `_agent.md`:

```
agents/<slug>/
  _agent.md         ← хто він, дозволи, контракт
  pseudocode.md     ← що робить (декларативна логіка)
```

**Уточнення loader order з [LAYOUT] §2:**

```
1. _agent.md      → контекст, дозволи, вхідний контракт
2. pseudocode.md  → поведінкова послідовність
3. memory/*       → постійні constraints/стиль/факти
4. zone sources + inbox → дані для grounded reasoning
```

**Рішення конфлікту:** Runtime (Mastra) **читає обидва файли**: `_agent.md` для конфігурації та instructions, `pseudocode.md` для behavioral logic. `_agent.md` — entry point; `pseudocode.md` — деталізація логіки. Вони доповнюють, не конкурують.

---

### Інваріант 4: Mastra/Inngest = runtime layers, не джерело істини

**ПІДТВЕРДЖЕНО**

[ЦІЛЬОВА] §1, [КОНТРАКТ] §0, [DRAKON] §5, [LAYOUT] §1: "Mastra/Inngest можуть мати свій стан у БД/кеші, але канонічний слід завжди в MinIO: runs/, proposals/, audit/."

Жодних суперечностей.

---

### Інваріант 5: Proposal lifecycle = mutation gate

**ПІДТВЕРДЖЕНО** (з явними винятками)

[INBOX] §0, [DRAKON] Інваріант 7, [ЦІЛЬОВА] §1 — proposal як єдиний механізм mutation.

**Явно зафіксовані винятки (operational writes):**

| Write path | Хто пише | Через Proposal? | Обґрунтування |
|-----------|----------|-----------------|---------------|
| `agents/<slug>/runs/` | Inngest/Mastra | **Ні** | Запис факту виконання, не зміна знань |
| `agents/<slug>/memory/` | Mastra (`write-memory`) | **Ні** | Operational data агента |
| `/audit/` | Worker | **Ні** | Запис аудит-лог |
| `agents/index.json` | System | **Ні** | Кеш/індекс, не source of truth |
| `zones/<id>/indexes/` | System | **Ні** | Кеш/індекс |

**[ІНВАРІАНТ]** Operational writes (runs, memory, audit, indexes) є винятками з proposal lifecycle. Вони не змінюють knowledge content і не потребують approval.

---

### Інваріант 6: Frontend = projection layer

**ПІДТВЕРДЖЕНО**

[FRONTEND] §1, [ЦІЛЬОВА] §2.5, [МАНІФЕСТ] §10, [LAYOUT] §4:

UI читає "вітрини":
- Inbox list: `zones/<zoneId>/inbox/*.json`
- Agent catalog: `agents/*/_agent.md`
- Run timeline: `agents/<slug>/runs/<runId>/status.json`
- Proposals: `agents/<slug>/proposals/<proposalId>/status.json + preview.md`
- DRAKON: `agents/<slug>/drakon/diagram.json`

Frontend **не** пише напряму у MinIO. Усі write operations — через Worker.

---

## РОЗДІЛ 2 — Authority boundaries

### 2.1 Storage authority (MinIO)

**Визначено чітко.**

MinIO — passive storage. [LAYOUT] уточнює глобальну структуру:
- `/system/` — policies, schemas (Owner write, System read)
- `/zones/` — zone data (Worker write, Frontend read)
- `/agents/` — agent data (Owner/Runtime write, Frontend read)
- `/audit/` — audit trail (Worker write, Owner read)

**Write paths формалізовано:**

| Writer | Paths | Mechanism |
|--------|-------|-----------|
| Owner (через Worker) | `_agent.md`, `pseudocode.md`, `drakon/`, `system/` | Direct + audit log |
| Runtime (Mastra/Inngest) | `runs/`, `memory/` | Operational writes |
| Worker (Apply Engine) | `proposals/`, zone data | Через proposal lifecycle |
| Worker (Audit) | `audit/` | Append-only |

### 2.2 Runtime authority (Mastra)

**Визначено чітко.**

Mastra = інтерпретатор. Читає `_agent.md` + `pseudocode.md` + `memory/*`. Не зберігає стан між runs. Не модифікує контракт.

### 2.3 Orchestration authority (Inngest)

**Визначено чітко.**

Inngest = "коли" + "retry" + "durability". Не знає зміст `_agent.md`. Канонічні events:
- `inbox.item.created`
- `agent.run.requested`
- `agent.run.completed`
- `proposal.created`
- `proposal.approved`
- `proposal.rejected`

### 2.4 Mutation authority

**Визначено чітко.**

| Хто | Що може мутувати | Через що |
|-----|-----------------|----------|
| Owner | Все (agent definitions, system policies, approvals) | Direct write + audit log |
| Agent (Mastra) | `memory/`, `runs/` | Operational writes |
| Agent (Mastra) | Knowledge content | **Тільки через proposal** |
| Guest | Notes (propose edit) | **Тільки через Inbox → Proposal** |
| Telegram bot | Notes (propose note) | **Тільки через Inbox → Proposal** |
| Webhook | Artifacts | **Тільки через Inbox → Proposal** |

---

## РОЗДІЛ 3 — Конфлікти архітектури

### Конфлікт 3.1: Розташування `runs/` — РОЗВ'ЯЗАНО

**Раніше:** [КОНТРАКТ] — всередині папки агента; [ЦІЛЬОВА] — top-level.

**Рішення [LAYOUT]:** `runs/` **всередині папки агента**: `agents/<slug>/runs/<runId>/`. Паралельно — cross-agent аудит у `/audit/runs/<yyyy-mm>/<runId>.json`.

Це забезпечує:
- Per-agent isolation (простий access control)
- Cross-agent queryability (через `/audit/runs/`)

### Конфлікт 3.2: Що runtime читає — РОЗВ'ЯЗАНО

**Раніше:** Суперечність — `pseudocode.md` чи `_agent.md`.

**Рішення [LAYOUT] §2 (loader order):**
1. `_agent.md` → конфігурація, дозволи, формат proposal
2. `pseudocode.md` → поведінкова послідовність
3. `memory/*` → постійні constraints

Runtime читає **обидва** в определеному порядку. `_agent.md` — entry point, `pseudocode.md` — behavioral logic.

### Конфлікт 3.3: `pseudocode.md` у структурі — РОЗВ'ЯЗАНО

**Рішення [LAYOUT]:** `pseudocode.md` є **канонічним файлом** у папці агента, поряд з `_agent.md`. Він не є лише design-time artifact — runtime його читає.

### Конфлікт 3.4: Proposals storage — РОЗВ'ЯЗАНО

**Рішення [LAYOUT]:** Proposals живуть **всередині папки агента**:

```
agents/<slug>/proposals/<proposalId>/
  proposal.json
  diff/<path>.patch
  preview.md
  citations.json
  status.json
```

Це per-agent, не system-wide queue. Cross-agent queryability — через індекси.

### Конфлікт 3.5: DRAKON обов'язковість — РОЗВ'ЯЗАНО

**Рішення:** DRAKON — канонічний інструмент, але **не обов'язковий**. Два рівноправних шляхи:

| Шлях | Артефакти | Коли використовувати |
|------|----------|---------------------|
| **Path A** (вручну) | `_agent.md` + `pseudocode.md` (вручну) | Прості агенти з лінійною логікою |
| **Path B** (DRAKON) | `drakon/diagram.json` → `pseudocode.md` → `_agent.md` | Складна логіка з розгалуженнями |

Інваріант уточнено: "Для агентів із `generated_from` — діаграма є авторитетним джерелом. Для агентів Path A — `pseudocode.md` є авторитетним."

### Конфлікт 3.6: DRAKON save path — РОЗВ'ЯЗАНО

**Рішення:** Owner saves DRAKON-діаграми **прямим записом** (через Worker → MinIO), без proposal. Owner є авторитетом над визначеннями агентів. Audit log пишеться.

---

## РОЗДІЛ 4 — Missing definitions (раніше undefined behavior)

### 4.1 Failure handling

| Сценарій | Визначена поведінка |
|----------|-------------------|
| **Runtime crash** | Inngest забезпечує retry (durable execution). Partial run зберігається як `status: failed` з наявними steps у `runs/<id>/status.json`. Agent → `error` якщо 3 consecutive failures. |
| **Proposal approval після contract change** | `proposal.json` зберігає `agent_version`. Apply Engine показує warning "agent version changed", але не блокує. Owner — final authority. |
| **Partial artifact write** | Порядок: Git commit → MinIO status update. Якщо MinIO fail — retry status update. Якщо Git fail — proposal → `failed`. |

### 4.2 Concurrency

| Сценарій | Визначена поведінка |
|----------|-------------------|
| **Два run одного агента** | Default concurrency = 1 per agent. Concurrent run → queued (Inngest native). |
| **Два proposals на один target** | FIFO обробка. Apply Engine перевіряє `target_hash` у proposal (optimistic concurrency). Конфлікт → proposal `failed`. |

### 4.3 Contract evolution

| Сценарій | Визначена поведінка |
|----------|-------------------|
| **Зміна `_agent.md` для active агента** | Re-validation при наступному run. Version bump — manual (Owner responsibility). |
| **Re-generation з DRAKON** | Manual trigger (Owner натискає "Re-export"). Auto re-generation заборонена. |
| **Memory management** | Schema: NDJSON (`log.ndjson` або `facts.md`). Read-memory повертає relevant entries. Size limit — визначає Owner per agent. |

### 4.4 Runtime restart

| Сценарій | Визначена поведінка |
|----------|-------------------|
| **Mastra restart** | Не має in-memory state між runs. Перезапуск = lossless (MinIO canonical). |
| **Inngest restart** | Durable execution забезпечує replay in-flight runs. Pending events — replayed. |
| **Registry rebuild** | При startup Agent Service: (1) connect MinIO, (2) rebuild `agents/index.json`, (3) register Inngest functions, (4) resume pending events. |
| **Replay failed run** | New run з new `runId` + поточна версія `_agent.md`. No determinism guarantee (LLM nondeterminism). |

---

## РОЗДІЛ 5 — Storage authority integrity

### Питання: Чи canonical storage може бути змінено без proposal approval?

**Відповідь: НІ для knowledge content. ТАК для operational data (з обмеженнями).**

| Категорія | Потребує proposal? | Обґрунтування |
|-----------|-------------------|---------------|
| Notes content (Git) | **ТАК** | Knowledge mutation = proposal |
| Agent proposals (MinIO) | **ТАК** (це сам механізм) | — |
| Agent definitions (Owner) | **НІ** (Owner = supreme authority) | + audit log запис |
| Agent runs (Runtime) | **НІ** | Operational: запис факту |
| Agent memory (Runtime) | **НІ** | Operational: agent internal state |
| Audit log | **НІ** | Append-only запис факту |
| Indexes/registry | **НІ** | Кеш, not source of truth |
| Zone inbox items | **ТАК** (через Inbox) | — |

**Перевірка:** Жоден шлях запису не дозволяє **агенту** змінити knowledge content без proposal. Owner може змінювати agent definitions напряму (він авторитет), але audit log фіксує кожну зміну.

**Висновок:** Storage authority integrity — **ДОТРИМАНА**.

---

## РОЗДІЛ 6 — Runtime integrity

### Питання: Чи runtime містить behavioral logic поза contract?

**Відповідь: НІ для behavioral logic. ТАК для operational logic (допустимо).**

| Категорія | Де визначено | Оцінка |
|-----------|-------------|--------|
| **Behavioral logic** (що робити) | `_agent.md` + `pseudocode.md` (MinIO) | ✅ Поза runtime |
| **Tool implementation** (як tool працює) | Runtime код Mastra | ✅ Допустимо — tool = interface implementation |
| **LLM interpretation** (як зрозуміти pseudocode) | LLM (inherent nondeterminism) | ✅ By design — pseudocode = intent, не exact execution |
| **Orchestration logic** (retry, timeout, concurrency) | Inngest config | ✅ Допустимо — operational, не behavioral |
| **Loader order** | Runtime код | ✅ Визначено в [LAYOUT] §2, реалізовано в runtime |

**Заборонені патерни (інваріант):**

- ❌ Hardcoded if/else для конкретного агента
- ❌ Default instructions у runtime
- ❌ Cached agent definitions між runs
- ❌ Мутація `_agent.md` під час виконання

**Перевірка:** Runtime (Mastra) є read-only consumer canonical storage. Він парсить contract, інтерпретує, виконує, записує результат назад у storage. Між runs — не зберігає стан агента.

**Висновок:** Runtime integrity — **ДОТРИМАНА**.

---

## РОЗДІЛ 7 — Final verdict

### ARCHITECTURE CONSISTENT

---

### Обґрунтування

Архітектурна документація після канонізації (Фаза 2) та з урахуванням нового canonical layout V1 демонструє **повну узгодженість** на рівні принципів, компонентів та специфікацій.

**Що змінилося порівняно з попереднім аудитом:**

| Проблема з попереднього аудиту | Статус | Рішення |
|-------------------------------|--------|---------|
| 3 структурні конфлікти | **РОЗВ'ЯЗАНО** | [LAYOUT] визначає canonical paths |
| 2 незафіксовані винятки | **РОЗВ'ЯЗАНО** | Operational writes зафіксовані як категорія |
| 8 undefined behaviors | **РОЗВ'ЯЗАНО** | Визначені у розділі 4 цього аудиту |
| Ambiguity DRAKON обов'язковості | **РОЗВ'ЯЗАНО** | Два рівноправних шляхи (Path A/B) |
| Dual source of truth | **РОЗВ'ЯЗАНО** | Git = notes, MinIO = все інше |

**Залишкові зони уваги (не порушення, а зони зростання):**

| Зона | Опис | Пріоритет |
|------|------|-----------|
| `agentExporter()` | Функція не реалізована ([БАЗА] §3.2) | Реалізаційний — не архітектурний |
| Memory schema formalization | Формат `memory/*` визначений (`facts.md`, `decisions.md`, `sessions/`), але JSON schema відсутня | Низький |
| Telegram bot integration | Описана в [INBOX] §2.2, не має окремої специфікації | Середній — потребує `docs/integrations/TELEGRAM_INBOX_SPEC.md` |
| ~~API contracts~~ | ~~Worker endpoints описані в різних документах, не зведені~~ | ✅ **ВИРІШЕНО:** `docs/backend/API_CONTRACTS_V1.md` |

**Додані документи (2026-02-15, frontend readiness sprint):**

| Документ | Призначення |
|----------|-------------|
| `docs/architecture/INBOX_AND_RUN_LIFECYCLE_V1.md` | Витяг lifecycle для UI: Inbox states, Run states (включно з `queued`), TypeScript interfaces |
| `docs/architecture/PROPOSAL_SYSTEM_V1.md` | Витяг Proposal lifecycle для UI: серверні стани, семантика `reviewing` (UI-only), concurrent proposals |
| `docs/backend/API_CONTRACTS_V1.md` | Консолідований API контракт: усі endpoints, schemas, auth, rate limits, idempotency |

**Уточнення семантики (2026-02-15):**

| Уточнення | Рішення | Документ |
|-----------|---------|----------|
| `reviewing` state | UI-only стан, серверний стан не змінюється | PROPOSAL_SYSTEM_V1.md §1.3 |
| Run `queued` state | Доданий: `requested → queued → running → completed/failed` | INBOX_AND_RUN_LIFECYCLE_V1.md §2.1 |
| Status writer | Canonical writer = Inngest/backend, Mastra НЕ пише status.json | INBOX_AND_RUN_LIFECYCLE_V1.md §2.6 |
| Notification transport | MVP = polling, опціонально SSE в майбутньому | INBOX_AND_RUN_LIFECYCLE_V1.md §3 |
| Inbox expiry UX | Expired entries приховані, доступні через фільтр | INBOX_AND_RUN_LIFECYCLE_V1.md §1.4 |
| Concurrent proposals | base_revision + target_hash для optimistic concurrency | PROPOSAL_SYSTEM_V1.md §3 |

### Рівень зрілості

| Рівень | Опис | Стан |
|--------|------|------|
| 1. Ідея | Бачення без деталей | ✅ Пройдено |
| 2. Принципи | Фундаментальні інваріанти | ✅ Пройдено |
| 3. Компоненти | Ролі, boundaries, contracts | ✅ Пройдено |
| 4. Специфікація | Формати, lifecycles, state machines | ✅ Пройдено |
| 5. Operational readiness | Failure modes, recovery, concurrency | ✅ **Визначено** (цей аудит) |

**Архітектура перейшла на рівень 5. Готова до реалізації.**

### Документація після канонізації

```
docs/
  manifesto/                     ← UA canonical
    MANIFESTO.md                 ✅
    PHILOSOPHY_EVERYTHING_AGENT.md  ✅ (перекладено)
    GLOSSARY.md                  ✅ (перекладено + оновлено)

  architecture/                  ← UA canonical
    АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md          ✅
    ЦІЛЬОВА_АРХІТЕКТУРА_MASTRA_INNGEST.md ✅
    КОНТРАКТ_АГЕНТА_V1.md                 ✅ (потребує update до нового layout)
    INBOX_ТА_PROPOSAL_АРХІТЕКТУРА.md      ✅ (потребує split на два docs)
    DRAKON_ІНТЕГРАЦІЯ_ТА_МОДЕЛЬ_ВИКОНАННЯ_АГЕНТА.md ✅
    LANGUAGE_CANONICALIZATION.md           ✅
    БЕЗПЕКА_СИСТЕМИ.md                    ✅ (перекладено + оновлено)
    DOCUMENTATION_INVENTORY.md            ✅
    АРХІТЕКТУРНИЙ_АУДИТ_ТА_УЗГОДЖЕНІСТЬ_FINAL.md ✅ (цей документ)

  frontend/                      ← UA canonical
    LOVABLE_УЗГОДЖЕННЯ_З_RUNTIME_АРХІТЕКТУРОЮ.md ✅

  migration/                     ← UA canonical
    ПЛАН_МІГРАЦІЇ_GH_AW_НА_MASTRA_INNGEST.md ✅

  drakon/                        ← UA canonical (DRAKON-specific docs)
    7 файлів                     ✅

  deprecated/                    ← Archived
    gh-aw/    (10 файлів)
    legacy-en/ (13 файлів)
```

**Загалом:** 11 канонічних документів (UA), 7 DRAKON-специфічних (UA), 23 deprecated/archived. gh-aw повністю ізольований у `deprecated/`.

---

*Цей документ є фінальним архітектурним аудитом системи Garden Seedling після канонізації документації. Він підтверджує узгодженість архітектури та визначає, що система готова до реалізації.*
