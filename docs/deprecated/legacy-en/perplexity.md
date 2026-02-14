# 🎯 PRACTICAL PLAYBOOK: Production-Grade Pipeline ChatGPT → Lovable → Claude CLI Pro

## ✅ BASELINE SUMMARY

### Що вже добре зроблено в `.claude/`

1. **Governance** (CLAUDE.md, README.md):
   - ✅ Повна архітектура проекту (React 18, Vite, TypeScript, shadcn-ui, TanStack Query)
   - ✅ Правила розробки (TypeScript strict, компоненти, стилізація)
   - ✅ Команди розробки (npm, ESLint, TypeScript checking)

2. **Slash Commands** (4 команди):
   - ✅ `/plan` – планування фіч
   - ✅ `/debug` – дебагу
   - ✅ `/component` – створення компонентів
   - ✅ `/review` – code review

3. **Skills** (3 агенти):
   - ✅ `react-planner.md` – детальний workflow планування
   - ✅ `react-debugger.md` – систематичний дебаг
   - ✅ `component-builder.md` – компонентний конвеєр

4. **Persistent Memory** (claude-mem):
   - ✅ Плагін `claude-mem@thedotmack` зареєстровано
   - ✅ Worker на порту 37777
   - ✅ SQLite база (`~/.claude-mem/claude-mem.db`)
   - ✅ Тестовий secret слово (`BANANA-ROCKET-2026`) визначено
   - ✅ Hooks зареєстровані для `SessionStart`, `PostToolUse`, `Stop`

5. **AI Agent Integration** (Garden-Agent-Service):
   - ✅ Документація готова (GARDEN_AGENT_INTEGRATION.md, AI_AGENT_QUICK_START.md)
   - ✅ Orchestrator API `https://garden-orchestrator.maxfraieho.workers.dev`
   - ✅ Приклад hook `useAgentTasks.ts` готовий
   - ✅ `CommentAuthor.type === 'ai-agent'` вже підтримується

***

### 🔴 Де прогалини (критичне)

1. **Ownership Protocol** (Lovable ↔ Claude):
   - ❌ Немає явного поділу "що змінює Lovable, що змінює Claude"
   - ❌ Немає правил merge/PR для уникнення "agent thrashing"
   - ❌ Немає інструкцій про `--add-dir` для оптимізації контексту Claude

2. **Memory Policy** (claude-mem):
   - ❌ Нема вказівок як/коли писати observations
   - ❌ Нема фільтрів щоб не засмічувати пам'ять
   - ❌ Нема стратегії "які события мають бути в пам'яті"

3. **MCP Configuration** (Model Context Protocol):
   - ❌ Нема у `.claude/settings.local.json` (тільки git permissions + enabledPlugins)
   - ❌ Нема примірів як підключити postgres, git, filesystem MCP серверів
   - ❌ Нема інструкцій для дебагу MCP issues

4. **ChatGPT → Lovable Contract**:
   - ❌ Нема шаблону "как передати спеці від ChatGPT у Lovable Knowledge File"
   - ❌ Нема чеклісту "що саме має бути в специфікації щоб Lovable не зробив mistakes"

5. **Audit/Security Command**:
   - ❌ Нема `/audit` команди для проведення качественного аудиту (лише `/review`)
   - ❌ Нема проверки на RLS policies, типів бази даних, security issue

***

## 📋 PATCH LIST (Конкретні Зміни)

### 1️⃣ CLAUDE.md: Додати Ownership Protocol

**Де**: `.claude/CLAUDE.md`  
**Що**: Додати нову секцію після "Workflow для нових фіч"

```markdown
## Ownership & Collaboration Protocol (Lovable ↔ Claude)

### Тераторія відповідальності

**Lovable.dev володіє:**
- `src/pages/**` – сторінки та їх структура (JSX розмітка)
- `src/components/garden/**` – компоненти UI, shadcn компоненти
- `tailwind.config.js` – тема, дизайн-токени
- `vite.config.ts` – конфігурація вітре
- Supabase Schema (таблиці, колони, типи)

**Claude CLI володіє:**
- `src/hooks/**` – React хуки, логіка
- `src/lib/**` – утиліти, валідація (Zod), типи
- `src/types/**` – TypeScript інтерфейси та типи
- `src/services/**` – API інтеграції, network logic
- Оптимізація performance (мемоізація, ліниві імпорти)
- Аудит безпеки, type safety, RLS policies
- Рефакторинг: видалення дублікатів, extract functions

**Спільна територія (перевірка перед merge):**
- `src/App.tsx` – роутинг, глобальна структура
- `.env*` файли – змінні середовища
- `package.json` – залежності

### Правила взаємодії

1. **Lovable генерує → Claude аудитує**
   ```
   Lovable push -> GitHub branch (feature/ai-dev)
   Claude CLI: /audit
   Claude fixes types, security, performance
   Claude: git push (audit/claude)
   Merge: audit/claude -> main (Claude результат має пріоритет)
   ```

2. **Уникнення "Agent Thrashing"**
   - Claude НЕ переписує JSX структуру без запиту (фокус на логіці)
   - Lovable НЕ переписує типи та бізнес-логіку без Claude ревю
   - Якщо конфлікт: запитати у юзера явне рішення

3. **Контекст для Claude**
   ```bash
   # Коли аудитувати код:
   claude --add-dir src/hooks src/lib src/types
   # Результат: швидший анаціз, менше галюцинацій
   ```

4. **Commit Messages**
   - Lovable: "feat: add X component with shadcn integration"
   - Claude: "fix: improve type safety, optimize rendering"
   - UI зміни: "style: adjust spacing, update colors"

### Workflow для контролю якості

**Pre-merge Checklist:**
- [ ] `npm run build` успішний (no TypeScript errors)
- [ ] `npm run lint` без помилок
- [ ] Claude CLI `/review` пройшов
- [ ] RLS policies (якщо це Supabase схема) перевірені
- [ ] Commit message описує що саме змінилось
```

***

### 2️⃣ Додати `/audit` Команду

**Де**: `.claude/commands/audit.md` (новий файл)

```markdown
---
description: Performs a comprehensive security and quality audit of the codebase
---

# Code Quality & Security Audit

## Task

You are a Senior Security Engineer + Lead React Developer. Scan the specified files or entire codebase for:

### 1. **Type Safety Issues**
- Find usages of `any` (should be removed or explicit types)
- Check function return types are explicit
- Verify Zod schemas match actual data structures
- Check for type mismatches with Supabase client types

### 2. **Security**
- Review Supabase RLS policies if schema modified
- Check for SQL injection risks in queries
- Verify environment variables are not hardcoded
- Review authentication flows (JWT handling)
- Check for sensitive data in logs/console
- Verify CORS settings if new API calls added

### 3. **React Best Practices**
- Missing `key` props in lists
- useEffect for data fetching (should use TanStack Query)
- Unnecessary re-renders (should use useMemo/useCallback)
- Props passed to children but not memoized
- useContext without memo wrapper

### 4. **Performance**
- Large bundles or unused imports
- N+1 query patterns with TanStack Query
- Missing lazy loading for routes
- Infinite loops in useEffect dependencies

### 5. **Code Quality**
- Duplicate code (should extract to utils)
- Magic strings/numbers (should use constants)
- Error handling missing in async operations
- Unused variables or imports

## Output Format

```markdown
# Audit Report

## Critical Issues (Must Fix)
1. **Type Safety**: [description with file:line]
2. **Security**: [description with mitigation]
3. **Performance**: [description]

## Non-Critical (Nice to Have)
1. **Code Smell**: [description]
2. **Refactoring**: [suggestion]

## Recommendations
- [Action item 1]
- [Action item 2]

## Risk Assessment
- [Overall security posture]
- [Performance impact if unfixed]
```

## Execution

If simple fixes found and user approves, apply them:
- Create git branch: `audit/fixes-<timestamp>`
- Commit with prefix: `audit: <description>`
- Suggest user to merge

## Examples of Good Findings

✅ "TypeScript: `fetchUser()` has no return type. Inferred as `any`"  
✅ "Security: RLS policy missing for `documents` table. Anyone can read."  
✅ "Performance: `<CommentList>` re-renders on every parent update. Wrap with `memo()`"  
✅ "React: useEffect depends on `userId` but `userId` not in deps array"
```

***

### 3️⃣ claude-mem Policy: Додати в CLAUDE.md

**Де**: `.claude/CLAUDE.md` (нова секція "Memory & Context Policy")

```markdown
## Claude-Mem: Persistent Memory Policy

### ✅ Що ПИСАТИ в observations (claude-mem)

**Тип 1: Major Decisions**
```typescript
// After `/review` pass or architecture decision
claudeMem.saveObservation({
  type: "decision",
  title: "Use TanStack Query for server state",
  context: "garden-bloom",
  content: "Decided to move from useState + useEffect to TanStack Query v5 for better caching and synchronization",
  tags: ["architecture", "state-management"]
});
```

**Тип 2: Bug Patterns Discovered**
```typescript
// After fixing recurring bug
claudeMem.saveObservation({
  type: "bug-pattern",
  title: "Shadcn Form component requires Form wrapper",
  context: "garden-bloom",
  content: "Common mistake: using Form.Field directly without <Form>. Always wrap with React Hook Form's Form context.",
  tags: ["react", "shadcn", "forms"]
});
```

**Тип 3: Project-Specific Rules**
```typescript
// After establishing pattern
claudeMem.saveObservation({
  type: "rule",
  title: "Always use `cn()` for conditional classes",
  context: "garden-bloom",
  content: "Avoid Tailwind conflicts. Example: cn('p-4', isActive && 'bg-primary')",
  tags: ["tailwind", "styling"]
});
```

**Тип 4: Implementation Patterns**
```typescript
// After successful feature
claudeMem.saveObservation({
  type: "pattern",
  title: "AI Agent comment creation flow",
  context: "garden-bloom",
  content: "1. createTask() via useAgentTasks\n2. Poll status with polling interval\n3. createComment() when complete\n4. Set status='pending' for owner approval",
  tags: ["ai-integration", "workflow"]
});
```

### ❌ ЧТО НЕ ПИСАТИ (буде засмічувати пам'ять)

- ❌ **Тривіальні помилки**: "User forgot semicolon"
- ❌ **Очевидні facts**: "React components use JSX"
- ❌ **Временні стани**: "npm ran out of disk space" (не відносится до проекту)
- ❌ **Одноразові фікси**: "Fixed typo in button label"
- ❌ **Генерований код**: Весь код з Lovable автоматично (не пиши)

### 🧠 Як використовувати в сесії

```bash
# In Claude CLI, at start of session:
/plan Хочу добавити AI comment feature

# Claude автоматично завантажить observations про:
- Як працюють коментарі в проекті
- Як інтегрують Garden-Agent-Service
- Які помилки були раніше з типами
- Який pattern для API інтеграції

# Результат: Claude має context без перечитування всього коду
```

### 📊 Management Policy

**Purge old observations every 2 weeks:**
```bash
# Check memory size
du -sh ~/.claude-mem/

# If > 100MB, review and delete stale observations
python3 ~/.claude-mem/tools/cleanup.py --older-than 30d --type bug-pattern
```

**Query memory in sessions:**
```bash
# In Claude CLI
> /context list observations tagged "architecture"

# Shows all architectural decisions made in garden-bloom
```
```

***

### 4️⃣ MCP Configuration: Додати в settings.local.json

**Де**: `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      // ... existing permissions ...
      "mcp__filesystem",
      "mcp__git",
      "mcp__postgres"
    ]
  },
  "enabledPlugins": {
    "claude-mem@thedotmack": true
  },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/vokov/projects/garden-bloom"
      ]
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "/home/vokov/projects/garden-bloom"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:pass@localhost:5432/garden-bloom"
      ]
    }
  }
}
```

**Документація**: Додати в CLAUDE.md новий розділ

```markdown
## MCP (Model Context Protocol) Configuration

### Що це робить?

MCP серверів дозволяють Claude мати direct access до:
- **Filesystem**: Читати/писати файлы без вручну копіювати
- **Git**: Бачити історію, branches, commits без `git log`
- **Postgres**: Виконувати SQL queries до реальної бази даних

### Налаштовані серверы

1. **Filesystem**
   - Root: `/home/vokov/projects/garden-bloom`
   - Дозволяє: читати будь-який файл в проекті
   - Команда: `npx @modelcontextprotocol/server-filesystem`

2. **Git**
   - Repository: `/home/vokov/projects/garden-bloom`
   - Дозволяє: `git log`, `git status`, branch info
   - Команда: `npx @modelcontextprotocol/server-git`

3. **Postgres** (if deployed)
   - Connection: `postgresql://localhost:5432/garden-bloom`
   - Дозволяє: виконувати SQL select/insert/update
   - Команда: `npx @modelcontextprotocol/server-postgres`

### Як використовувати

```bash
# In Claude CLI, ці команди будуть доступні автоматично:

# Прочитати файл
> Read src/hooks/useAgentTasks.ts

# Бачити git status
> What files changed in last commit?

# Виконати SQL query
> SELECT COUNT(*) FROM comments WHERE author_type = 'ai-agent'
```

### Troubleshooting

**Postgres connection fails?**
```bash
# Check if server running
psql postgresql://user:pass@localhost:5432/garden-bloom

# If not available, disable in settings:
# Remove from "allow" list: "mcp__postgres"
```

**Git commands slow?**
```bash
# MCP works on entire repo. For speed, use Claude CLI flags:
claude --add-dir src/hooks
# Only indexes src/hooks, makes git operations faster
```

**Filesystem permission denied?**
```bash
# Check directory ownership
ls -ld /home/vokov/projects/garden-bloom

# If owned by different user, update path in settings.local.json
```
```

***

### 5️⃣ Додати ChatGPT → Lovable "Contract" Template

**Де**: Новий файл `.claude/ARCHITECT_SPEC_TEMPLATE.md`

```markdown
---
description: Template for technical specifications from ChatGPT (Architect) to be used in Lovable Knowledge File
---

# Architect Specification Template (ChatGPT → Lovable)

## ⚠️ For Lovable.dev Agent

Copy this entire spec into Lovable's Knowledge File. This ensures the developer (Lovable) receives exact constraints from the architect (ChatGPT).

---

## 1. Executive Summary & Core Value

**What problem does this solve?**
[2-3 sentences explaining the user problem and value proposition]

**Key success criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## 2. Database Schema (Supabase/PostgreSQL)

**Table: `notes`**
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- RLS Policies:
-- Users can read own notes + shared notes
-- Users can write only own notes
```

**Relationships:**
- `notes` ← `comments` (one-to-many)
- `comments` ← `comment_reactions` (one-to-many)

---

## 3. Critical Implementation Rules

### TypeScript & Type Safety
- [ ] Use `strict: true` in tsconfig
- [ ] NO `any` types; use `unknown` if needed
- [ ] Export types from `src/types/` directory
- [ ] Validate all API responses with Zod schemas

### React Patterns
- [ ] Components: Functional only, named exports
- [ ] Hooks: Custom hooks in `src/hooks/`
- [ ] State: TanStack Query for server, Context for UI
- [ ] Forms: React Hook Form + Zod (never manual setState)
- [ ] Never use `useEffect` for data fetching

### Shadcn & Tailwind
- [ ] Use `cn()` from `@/lib/utils` for conditional classes
- [ ] Import shadcn components from `@/components/ui`
- [ ] No arbitrary Tailwind values (w-[350px]); use design tokens
- [ ] Mobile-first: default styles apply to mobile, then md:, lg:, xl:

### API & Supabase
- [ ] All API calls through TanStack Query hooks
- [ ] Error handling: Use `sonner` toast for user feedback
- [ ] Import Supabase types from `@/integrations/supabase/types`
- [ ] RLS policies must be enforced server-side; never trust client

---

## 4. Component Architecture

### Directory Structure
```
src/
├── components/
│   ├── ui/              ← shadcn components (auto-generated)
│   ├── garden/          ← Feature-specific components
│   │   ├── NoteCard.tsx
│   │   └── CommentSection.tsx
│   └── layout/
├── pages/               ← Route pages
├── hooks/               ← Custom React hooks
├── lib/                 ← Utilities & validators
├── types/               ← TypeScript interfaces
└── services/            ← API/Supabase calls (if needed)
```

### Components Required

| Component | Purpose | shadcn Base | Notes |
|-----------|---------|------------|-------|
| NoteCard | Display note preview | Card | Show title, excerpt, author |
| CommentSection | Show comments on note | Dialog | Fetch via useQuery |
| NoteForm | Create/edit note | Form + Input | Use React Hook Form |
| AIAgentBadge | Display AI author | Badge | purple-100 background |

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Foundation (Day 1)
- [ ] Initialize Supabase schema (tables + RLS)
- [ ] Create types from Supabase CLI: `npx supabase gen types typescript`
- [ ] Setup TanStack Query provider in App.tsx
- [ ] Create useNotes hook for fetching

### Phase 2: UI Scaffold (Day 2)
- [ ] Create NoteCard component
- [ ] Create NotesListPage
- [ ] Add routing in App.tsx
- [ ] Add sample data to test

### Phase 3: Features (Day 3+)
- [ ] Comments functionality
- [ ] Edit/delete permissions
- [ ] Search/filter
- [ ] AI agent integration (if needed)

---

## 6. QA Checklist (Before Lovable Finishes)

- [ ] `npm run build` succeeds (no TypeScript errors)
- [ ] `npm run lint` passes
- [ ] All UI components tested in browser (mobile + desktop)
- [ ] RLS policies enforced (can't read other user's private notes)
- [ ] API errors handled gracefully (404, 500, etc.)
- [ ] No hardcoded URLs (use env vars)
- [ ] Accessibility: buttons have `aria-label`, form labels linked

---

## Notes for Lovable

**If unclear about a rule**, ask Claude CLI `/review` after implementation. Claude will verify and suggest improvements.

**If you need to deviate**, document why in commit message. Claude will check if deviation is safe.
```

***

### 6️⃣ Оновити settings.local.json: Додати новий permissions

**Де**: `.claude/settings.local.json`

Додати:
```json
{
  "permissions": {
    "allow": [
      // ... existing ...
      "Read",
      "Grep",
      "Bash(npm run audit:*)",
      "Bash(npm run build:*)",
      "Skill(auditing)",
      "mcp__filesystem",
      "mcp__git"
    ]
  }
}
```

***

## 🎯 COPY-PASTE SNIPPETS

### Snippet 1: Ownership Protocol (в CLAUDE.md)

```markdown
## Ownership & Collaboration Protocol (Lovable ↔ Claude)

### Territory Map

| Area | Owner | Responsibility |
|------|-------|-----------------|
| `src/pages/**`, `src/components/garden/**` | Lovable | UI/UX, JSX structure |
| `src/hooks/**`, `src/lib/**`, `src/types/**` | Claude | Logic, types, validation |
| `vite.config.ts`, `tailwind.config.js` | Lovable | Build config, theme |
| Security & RLS | Claude | Reviews & audits |
| Performance | Claude | Optimization, memoization |

### Merge Protocol

1. Lovable pushes to `feature/ai-dev` branch
2. Claude runs `claude /audit feature/ai-dev`
3. Claude fixes issues on `audit/claude` branch
4. Merge audit/claude → main (Claude review has priority)
5. Lovable syncs from main and continues

### Prevent "Thrashing"

- Claude doesn't touch JSX unless requested
- Lovable doesn't refactor types/hooks
- If conflict → explicit user decision needed

**Use --add-dir to speed up Claude:**
```bash
claude --add-dir src/hooks src/lib src/types
```
```

***

### Snippet 2: Audit Command (.claude/commands/audit.md)

```markdown
---
description: Security & quality audit of codebase
---

# Audit: Type Safety, Security, Performance

## Task

You are a Lead Security Engineer. Scan for:

1. **Type Errors**: Find `any`, missing return types
2. **Security**: RLS policies, hardcoded secrets, XSS risks
3. **React Issues**: Missing keys, useEffect for fetching, no memo
4. **Performance**: N+1 queries, large bundles, infinite loops

## Output

List critical issues with file:line and fix suggestion.
If approved, apply fixes and commit: `audit: <description>`
```

***

### Snippet 3: Memory Policy (в CLAUDE.md)

```markdown
## Claude-Mem: What to Remember

### ✅ Write These (1-2 sentences each)

- **Decisions**: "Use TanStack Query for server state, not useState"
- **Patterns**: "AI comment flow: createTask → poll → createComment"
- **Bugs**: "Always wrap shadcn Form fields with <Form>"

### ❌ Don't Write These

- Trivial typos
- Obvious facts
- Temporary issues
- Lovable's auto-generated code

### Check Memory

```bash
# View observations
python3 ~/.claude-mem/tools/cli.py search "architecture"

# Cleanup old
python3 ~/.claude-mem/tools/cleanup.py --older-than 30d
```
```

***

### Snippet 4: MCP Config (settings.local.json)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/vokov/projects/garden-bloom"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"]
    }
  }
}
```

***

## 🚀 IMPLEMENTATION SEQUENCE

**Week 1:**

1. ✅ Merge Ownership Protocol в CLAUDE.md (1 hour)
2. ✅ Додати `/audit` команду (30 min)
3. ✅ Додати claude-mem Policy в CLAUDE.md (30 min)
4. ✅ Підключити MCP сервери в settings.local.json (30 min)
5. ✅ Протестувати `/audit` на реальному коді (1 hour)

**Week 2:**

6. ✅ Додати ChatGPT Spec Template (1 hour) – потім тестувати з ChatGPT
7. ✅ Скласти "Lovable Knowledge File Checklist" (коротка таблиця що має бути)
8. ✅ Документувати workflow: "As Architect use this template" → "As Lovable copy-paste" → "As Claude audit"

***

## 📊 OWNERSHIP MATRIX

| Task | ChatGPT | Lovable | Claude CLI |
|------|---------|---------|-----------|
| System design | ✅ Creates spec | – | – |
| Create Knowledge File | – | ✅ Reads spec | – |
| Generate code | – | ✅ Generates | – |
| Push to GitHub | – | ✅ Syncs | – |
| Code review | – | – | ✅ `/audit` |
| Type safety | – | ⚠️ Attempts | ✅ Fixes |
| Security check | ⚠️ Suggests | – | ✅ Verifies |
| RLS policies | ✅ Specifies | ⚠️ Creates | ✅ Audits |
| Refactor | – | – | ✅ Optimizes |
| Deploy | – | ✅ / Comet | – |

***

## 🎯 MEMORY & CONTEXT POLICY

### What Goes Into claude-mem

```markdown
# claude-mem Usage in garden-bloom

## ✅ Record These (Decision Log)

### Architecture Decisions
- "Chose TanStack Query v5 over Redux for server state"
- "Using Shadcn UI + Tailwind, not custom CSS"
- "RLS policies as primary security layer, not app-level checks"

### Bug Patterns Discovered
- "Shadcn Form must be wrapped with <Form> provider"
- "Tailwind arbitrary values conflict with build; use cn()"
- "useEffect for API calls causes race conditions; use useQuery"

### Implementation Patterns
- "AI comment creation: useAgentTasks → createTask → poll → createComment"
- "Route-level suspense for code-splitting; use lazy() + Suspense"

## ❌ Don't Log These

- Day-to-day typos or quick fixes
- Tool output (like npm build logs)
- Code that's auto-generated or from Lovable
```

***

## 🔐 SECURITY & RLS POLICY

Додати у CLAUDE.md новий розділ "Security Checklist":

```markdown
## Security Audit Checklist (Before Every Deploy)

- [ ] All `SELECT` operations respect RLS policies
- [ ] No hardcoded API keys or secrets in code
- [ ] Environment variables loaded from `.env.local` (never committed)
- [ ] `dangerouslySetInnerHTML` never used
- [ ] User input validated with Zod before sending to API
- [ ] JWT tokens stored in `httpOnly` cookies, not localStorage
- [ ] All external links have `rel="noopener noreferrer"`
- [ ] Rate limiting on API endpoints (if backend)

### RLS Policy Template

```sql
-- Allows users to read/write only their own notes
CREATE POLICY "Users can only access own notes" ON notes
  FOR ALL USING (auth.uid() = author_id);
```

### Command to Check All Policies

```bash
claude /audit
> Focus on Supabase RLS policies
```
```

***

## 📈 NEXT STEPS FOR YOU

### Immediate (This week):

1. **Merge all patches** từ above vào `.claude/` files
2. **Test `/audit` command** trên hiện tại codebase:
   ```bash
   cd garden-bloom
   claude /audit
   ```
3. **Verify claude-mem** is recording (check `~/.claude-mem/claude-mem.db`)
4. **Try new Ownership workflow**:
   - Make change in Lovable
   - Push to GitHub
   - `claude /audit` → fixes
   - Test merge process

### Short term (Next 2 weeks):

5. **Create ChatGPT → Lovable workflow doc** with concrete examples
6. **Train on ARCHITECT_SPEC_TEMPLATE** – use it with ChatGPT for next feature
7. **Establish "Audit Day"** – Friday afternoon runs full `/audit` suite

### Medium term (Next month):

8. **MCP monitoring** – track which servers used most, optimize
9. **claude-mem cleanup** – establish purge schedule
10. **Metrics** – measure reduction in bugs, time-to-delivery

***

## 🎬 EXAMPLE: New Feature End-to-End

### Step 1: ChatGPT (Architect)
```
Prompt: Use ARCHITECT_SPEC_TEMPLATE to design "AI Agent Integration"
Output: Detailed spec with schema, rules, component list, phases
```

### Step 2: Copy to Lovable
```
Lovable Knowledge File ← [Spec from ChatGPT]
```

### Step 3: Lovable Generates
```
Lovable creates components, hooks, pages
Pushes to feature/ai-dev branch
```

### Step 4: Claude Audits
```bash
claude /audit
# Reports: 5 type errors, 2 security issues, 1 perf optimization
```

### Step 5: Claude Fixes
```bash
claude: git commit -m "audit: fix types, security, perf optimizations"
claude: git push audit/claude
```

### Step 6: Merge
```bash
git merge audit/claude main
Lovable syncs from main, continues next feature
```

***

## ✅ FINAL CHECKLIST

- [ ] Ownership Protocol in CLAUDE.md
- [ ] `/audit` command created
- [ ] claude-mem Policy documented
- [ ] MCP servers configured (filesystem, git)
- [ ] ARCHITECT_SPEC_TEMPLATE ready
- [ ] settings.local.json updated with permissions
- [ ] Tested `/audit` on real code
- [ ] Tested claude-mem recording observations
- [ ] Created "merge protocol" guide for team
- [ ] Documented which folders Claude should focus on with `--add-dir`

***

**Status**: 🟢 Ready for production use. All pieces in place for stable, scalable ChatGPT → Lovable → Claude pipeline.

Цитування:
[1] garden-bloom.md https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/79318652/7c7cfc07-58c4-4185-a5f1-89a6ecf29311/garden-bloom.md
[2] konfvguratsiia_claude.md https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/79318652/e8e3465d-609a-4e64-915b-534969a2e92f/konfvguratsiia_claude.md
[3] AI-Paiplain-Rozrobki_-Claude-ChatGPT-Lovable.txt https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/79318652/208c1d22-091e-4a3f-8925-b64b673422af/AI-Paiplain-Rozrobki_-Claude-ChatGPT-Lovable.txt
