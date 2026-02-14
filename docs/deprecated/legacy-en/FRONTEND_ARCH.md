# Frontend Architecture

> Updated: 2026-02-11 | Stack: React 18 + Vite 5 + TypeScript 5.8 + Tailwind 3.4

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 | Component UI |
| Build | Vite 5 | Fast HMR, import.meta.glob for notes |
| Language | TypeScript 5.8 | Type safety |
| Styling | Tailwind CSS 3.4 + shadcn-ui | Design system (37 Radix primitives) |
| Routing | React Router DOM 6 | 15 pages, client-side navigation |
| State | React hooks (custom) | 20 hooks for domain logic |
| i18n | Custom (5 locales) | en, uk, de, fr, it |
| Charts | Recharts | Data visualization |
| Markdown | react-markdown + remark-gfm | Note rendering |

## Directory Structure

```
src/
├── components/
│   ├── garden/          # 59 components — core domain
│   │   ├── DrakonEditor.tsx      (27KB — full DRAKON editor)
│   │   ├── DrakonViewer.tsx      (11KB — read-only viewer)
│   │   ├── NoteEditor.tsx        (WYSIWYG with Git commit)
│   │   ├── NoteRenderer.tsx      (Markdown → React)
│   │   ├── AccessZonesManager.tsx
│   │   └── MCPAccessPanel.tsx
│   ├── notebooklm/     # 6 components — NLM chat UI
│   │   ├── NotebookLMChatsWall.tsx
│   │   └── NotebookLMChatPanel.tsx
│   ├── zones/           # 7 components — delegation
│   │   ├── ZoneConsentGate.tsx
│   │   └── ZoneNotebookLMChat.tsx
│   └── ui/              # 37 shadcn-ui primitives
├── hooks/               # 20 custom hooks
│   ├── useOwnerAuth.tsx          (JWT auth state)
│   ├── useAccessZones.ts         (zone CRUD)
│   ├── useDrakonDiagram.ts       (diagram persistence)
│   ├── useNotebookLMChats.ts     (chat localStorage)
│   ├── useColleagueChat.ts       (AI chat — STUB)
│   └── useLocale.tsx             (i18n)
├── lib/
│   ├── api/mcpGatewayClient.ts   (worker API client, 600+ LOC)
│   ├── drakon/                   (adapter, pseudocode, export)
│   ├── notes/                    (loader, parser, wikilinks, search, tags, graph)
│   ├── i18n/                     (types, 5 locale files)
│   └── chat/types.ts             (colleague chat types)
├── pages/               # 15 route pages
└── site/notes/          # Static Markdown content (Zettelkasten)
```

## Key Patterns

### 1. Notes as Build-Time Assets
```typescript
// noteLoader.ts — Vite bundles all .md files at build time
const modules = import.meta.glob('/src/site/notes/**/*.md', { query: '?raw', eager: true });
```
**Trade-off:** Fast rendering, but edits require rebuild to be visible.

### 2. DRAKON Vendor Integration
```typescript
// adapter.ts — dynamic script loading of vendor libs
const script = document.createElement('script');
script.src = '/libs/drakonwidget.js'; // exposes window.createDrakonWidget
```
Both DrakonWidget and drakongen are loaded as browser globals, not npm packages.

### 3. API Client Pattern
All backend calls go through `mcpGatewayClient.ts` which:
- Adds JWT auth header
- Handles error responses
- Provides typed methods per domain (zones, notes, drakon, proposals, etc.)

### 4. Auth Guard
```typescript
// AccessGuard.tsx wraps protected routes
// useOwnerAuth.tsx manages JWT token lifecycle
```

### 5. Localization
Custom i18n with `useLocale()` hook. No external library. Supports 5 languages including DRAKON editor labels and pseudocode generation.

## External Runtime Dependencies

| Dependency | Loaded From | Purpose |
|-----------|-------------|---------|
| DrakonWidget | `/libs/drakonwidget.js` | DRAKON diagram rendering + editing |
| drakongen | `/libs/drakongen.js` | Diagram → pseudocode/AST conversion |

## Known Limitations

- No test framework (vitest recommended but not installed)
- Colleague Chat AI responses are hardcoded stubs
- Chat history in localStorage only (data loss risk)
- Notes are static at build time

---

*See [KNOWN_LIMITATIONS.md](../state/KNOWN_LIMITATIONS.md) for full list.*
