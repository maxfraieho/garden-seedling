# Інвентаризація документації Garden Seedling

> Створено: 2026-02-15
> Автор: Головний архітектор системи
> Метод: Повний аудит docs/ та кореневих .md файлів
> Канонічна структура: відповідно до MinIO layout V1 та docs/ canonical spec

---

## Канонічна цільова структура docs/

```
docs/
  manifesto/           # Маніфест, глосарій, філософія
  architecture/        # Архітектурні специфікації (UA canonical)
  backend/             # Backend специфікації
  frontend/            # Frontend специфікації
  integrations/        # Інтеграційні специфікації
  migration/           # Плани міграції
  deprecated/          # gh-aw та старі англомовні документи
    gh-aw/
    legacy-en/
```

---

## Легенда статусів

| Статус | Опис |
|--------|------|
| **CANONICAL** | Канонічний документ, відповідає поточній архітектурі, українською мовою |
| **NEEDS_TRANSLATION** | Актуальний за змістом, але англійською — потребує перекладу |
| **NEEDS_UPDATE** | Частково актуальний, потребує оновлення до Mastra/Inngest архітектури |
| **DEPRECATED** | Описує gh-aw або іншу застарілу архітектуру |
| **STUB** | Порожній або placeholder документ |
| **GH-AW_ARTIFACT** | Артефакт gh-aw репозиторію, не є частиною поточної архітектури |
| **INFRA** | Інфраструктурний файл (конфіг, тести, код) — не документація |

---

## 1. docs/architecture/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md` | UA | **CANONICAL** | Фундаментальний документ поточної архітектури | KEEP |
| `ЦІЛЬОВА_АРХІТЕКТУРА_MASTRA_INNGEST.md` | UA | **CANONICAL** | Цільова архітектура Mastra + Inngest | KEEP |
| `КОНТРАКТ_АГЕНТА_V1.md` | UA | **NEEDS_UPDATE** | Не враховує оновлений canonical layout з `/zones/`, `/system/`, loader order | UPDATE |
| `DRAKON_ІНТЕГРАЦІЯ_ТА_МОДЕЛЬ_ВИКОНАННЯ_АГЕНТА.md` | UA | **CANONICAL** | Специфікація DRAKON → pseudocode → runtime | KEEP |
| `INBOX_ТА_PROPOSAL_АРХІТЕКТУРА.md` | UA | **NEEDS_UPDATE** | Потребує розділення на INBOX_ТА_RUN_LIFECYCLE_V1.md та PROPOSAL_SYSTEM_V1.md відповідно до нової структури | UPDATE + SPLIT |
| `АРХІТЕКТУРНИЙ_АУДИТ_ТА_УЗГОДЖЕНІСТЬ.md` | UA | **DEPRECATED** | Замінюється новим FINAL аудитом | DEPRECATE |
| `LANGUAGE_CANONICALIZATION.md` | UA | **CANONICAL** | Мовний інваріант | KEEP |
| `SYSTEM_OVERVIEW.md` | EN | **NEEDS_TRANSLATION** | Актуальний опис системи, але англійською; поглинутий `АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md` | DEPRECATE → legacy-en/ |
| `BACKEND_ARCH.md` | EN | **NEEDS_TRANSLATION** | Опис FastAPI backend, актуальний; потрібен як backend/ специфікація | TRANSLATE → docs/backend/ |
| `FRONTEND_ARCH.md` | EN | **NEEDS_TRANSLATION** | Опис frontend архітектури, актуальний; потрібен як frontend/ специфікація | TRANSLATE → docs/frontend/ |
| `WORKER_ARCH.md` | EN | **NEEDS_TRANSLATION** | Опис Cloudflare Worker, актуальний; потрібен у backend/ | TRANSLATE → docs/backend/ |
| `LOVABLE_VISION.md` | EN | **DEPRECATED** | Нотатки Lovable-агента; поглинуті `LOVABLE_УЗГОДЖЕННЯ_З_RUNTIME_АРХІТЕКТУРОЮ.md` | DEPRECATE → legacy-en/ |
| `DOCUMENTATION_INVENTORY.md` | UA | **CANONICAL** | Цей документ | KEEP |

---

## 2. docs/manifesto/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `MANIFESTO.md` | UA | **CANONICAL** | Маніфест — конституція проєкту. Повна UA версія (`MANIFESTO_EXTENDED`) | KEEP |
| `MANIFESTO_EXTENDED.md` | EN | **DEPRECATED** | Англомовний розширений маніфест; зміст поглинутий українським `MANIFESTO.md` | DEPRECATE → legacy-en/ |
| `GLOSSARY.md` | EN | **NEEDS_TRANSLATION** | Глосарій термінів; актуальний, потребує UA перекладу та оновлення (gh-aw → Mastra/Inngest) | TRANSLATE + UPDATE |
| `PHILOSOPHY_EVERYTHING_AGENT.md` | EN | **NEEDS_TRANSLATION** | Філософія "Everything is Agent"; актуальний принцип | TRANSLATE |

---

## 3. docs/frontend/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `LOVABLE_УЗГОДЖЕННЯ_З_RUNTIME_АРХІТЕКТУРОЮ.md` | UA | **CANONICAL** | Контракт між архітектурою та Lovable-імплементатором | KEEP |

---

## 4. docs/migration/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `ПЛАН_МІГРАЦІЇ_GH_AW_НА_MASTRA_INNGEST.md` | UA | **CANONICAL** | План міграції з gh-aw на Mastra + Inngest | KEEP |

---

## 5. docs/plans/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `MASTER_PLAN.md` | EN | **DEPRECATED** | Використовує gh-aw milestone (M0–M6), не відповідає Mastra/Inngest | DEPRECATE → legacy-en/ |
| `ROADMAP.md` | EN | **DEPRECATED** | Базується на MASTER_PLAN.md, gh-aw milestones | DEPRECATE → legacy-en/ |
| `BACKLOG.md` | EN | **STUB** | Порожній placeholder | DELETE |
| `EXECUTION_PLAN.md` | EN | **STUB** | Порожній placeholder | DELETE |

---

## 6. docs/drakon/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `CLAUDE.md` | — | **INFRA** | Claude-mem context для drakon підпроєкту | KEEP (infra) |
| `CLAUDE_SKILLS_SELECTION_UA.md` | UA | **NEEDS_UPDATE** | DRAKON skills для Claude; може бути неактуальний | REVIEW |
| `DRAKONWIDGET_RESEARCH_UA.md` | UA | **CANONICAL** | Дослідження DrakonWidget API | KEEP |
| `IMPLEMENTATION_CHECKLIST_UA.md` | UA | **NEEDS_UPDATE** | Чекліст імплементації DRAKON; потребує перевірки актуальності | REVIEW |
| `INTEGRATION_STRATEGY_UA.md` | UA | **NEEDS_UPDATE** | Стратегія інтеграції DRAKON; потребує узгодження з Mastra | REVIEW |
| `LOVABLE_AGENT_PROMPT_UA.md` | UA | **NEEDS_UPDATE** | Промпт для Lovable; може потребувати оновлення | REVIEW |
| `PROJECT_ANALYSIS_UA.md` | UA | **CANONICAL** | Аналіз проєкту для DRAKON інтеграції | KEEP |

---

## 7. docs/state/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `STATE_SNAPSHOT.md` | EN | **NEEDS_UPDATE** | Snapshot стану на 2026-02-11; поглинутий `АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md` | DEPRECATE → legacy-en/ |
| `KNOWN_LIMITATIONS.md` | EN | **NEEDS_UPDATE** | Відомі обмеження на 2026-02-11; частково актуальний | DEPRECATE → legacy-en/ |

---

## 8. docs/ (корінь) — документи першого рівня

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `README.md` | EN | **INFRA** | README для Starlight docs site (не архітектурний) | KEEP (infra) |
| `CLAUDE.md` | — | **INFRA** | Claude-mem context | KEEP (infra) |
| `architecture.md` | EN | **DEPRECATED** | Стара схема архітектури, поглинута `АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md` | DEPRECATE → legacy-en/ |
| `access-model.md` | UA/EN | **NEEDS_UPDATE** | Модель доступу; актуальний зміст, але дублює розділ 7 `АРХІТЕКТУРНА_БАЗА_СИСТЕМИ.md` | DEPRECATE → legacy-en/ |
| `security.md` | EN | **NEEDS_TRANSLATION** | Security threat model; актуальний, потрібен як окремий документ | TRANSLATE → docs/architecture/ |
| `security-findings-2026-01-19.md` | EN | **DEPRECATED** | Одноразовий security аудит; історичний артефакт | DEPRECATE → legacy-en/ |
| `comments-federation-research.md` | EN | **DEPRECATED** | Дослідження федерації коментарів; gh-aw контекст | DEPRECATE → legacy-en/ |
| `comments-system-adr.md` | EN | **NEEDS_UPDATE** | ADR системи коментарів; частково актуальний, потребує UA + оновлення до Inbox model | TRANSLATE + UPDATE |
| `copilot-cli-checksum-verification.md` | EN | **GH-AW_ARTIFACT** | Верифікація Copilot CLI checksums; gh-aw специфічний | DELETE або → deprecated/gh-aw/ |
| `file-url-inlining.md` | EN | **GH-AW_ARTIFACT** | File URL inlining для gh-aw | DELETE або → deprecated/gh-aw/ |
| `interactive-run-demo.md` | EN | **GH-AW_ARTIFACT** | Demo інтерактивного запуску gh-aw | DELETE або → deprecated/gh-aw/ |
| `interactive-run-mode.md` | EN | **GH-AW_ARTIFACT** | Специфікація interactive run mode gh-aw | DELETE або → deprecated/gh-aw/ |
| `perplexity.md` | UA/EN | **NEEDS_UPDATE** | Playbook для ChatGPT → Lovable → Claude pipeline; потребує оновлення | REVIEW |

---

## 9. docs/issues/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `hourly-ci-cleaner-tool-access.md` | EN | **GH-AW_ARTIFACT** | Issue з gh-aw CI cleaner workflow | DELETE або → deprecated/gh-aw/ |

---

## 10. docs/troubleshooting/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `copilot-schema-validation-error.md` | EN | **GH-AW_ARTIFACT** | Copilot schema error; gh-aw специфічний | DELETE або → deprecated/gh-aw/ |
| `copilot-schema-validation-deep-analysis.md` | EN | **GH-AW_ARTIFACT** | Глибокий аналіз schema error; gh-aw | DELETE або → deprecated/gh-aw/ |

---

## 11. docs/workflows/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `auto-close-parent-issues.md` | EN | **GH-AW_ARTIFACT** | Опис gh-aw workflow | DELETE або → deprecated/gh-aw/ |
| `metrics-collector.md` | EN | **GH-AW_ARTIFACT** | Опис gh-aw workflow | DELETE або → deprecated/gh-aw/ |

---

## 12. docs/slides/

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `index.md` | EN | **GH-AW_ARTIFACT** | Слайди для gh-aw презентації | DELETE або → deprecated/gh-aw/ |

---

## 13. docs/src/ (Astro site infrastructure)

| Категорія | Кількість файлів | Статус | Дія |
|-----------|-------------------|--------|-----|
| Astro components (`src/components/`) | 11 | **INFRA** | KEEP — інфраструктура docs site |
| Content docs (`src/content/docs/`) | ~94 | **GH-AW_ARTIFACT** | Весь Starlight content — описує gh-aw workflows, patterns, reference. **Не є частиною поточної архітектури** |
| Lib/scripts (`src/lib/`, `src/scripts/`) | 10 | **INFRA** | KEEP — utilities для docs site |
| Styles (`src/styles/`) | 1 | **INFRA** | KEEP |
| Config (`astro.config.mjs`, `tsconfig.json`, `package.json`) | 4+ | **INFRA** | KEEP |

**Рішення щодо docs/src/content/docs/:** Це Starlight-based documentation site для gh-aw. Весь content (~94 .md/.mdx файлів) описує gh-aw patterns (chatops, dailyops, issueops тощо), gh-aw reference (frontmatter, triggers, tools), gh-aw setup, gh-aw examples. Жоден з цих файлів не описує поточну Mastra/Inngest архітектуру.

**Рекомендація:** Starlight site або (a) повністю перебудовується під нову архітектуру, або (b) зберігається як archived reference gh-aw documentation. Вирішує Owner.

---

## 14. Кореневі .md файли репозиторію

| Файл | Мова | Статус | Причина | Дія |
|------|------|--------|---------|-----|
| `README.md` | EN | **NEEDS_UPDATE** | README проєкту; потребує оновлення відповідно до нової архітектури | UPDATE |
| `AGENTS.md` | EN | **DEPRECATED** | Описує gh-aw агентів | DEPRECATE |
| `AGENT_HANDOFF.md` | EN | **DEPRECATED** | Handoff протокол для gh-aw | DEPRECATE |
| `CHANGELOG.md` | EN | **INFRA** | Changelog; зберегти | KEEP |
| `CLAUDE_QUICK_START.md` | EN | **NEEDS_UPDATE** | Quick start для Claude; потребує оновлення | REVIEW |
| `CODE_OF_CONDUCT.md` | EN | **INFRA** | Code of Conduct; стандартний | KEEP |
| `CONTRIBUTING.md` | EN | **INFRA** | Contributing guide; стандартний | KEEP |
| `create.md` | EN | **GH-AW_ARTIFACT** | Інструкція створення gh-aw workflow | DEPRECATE |
| `install.md` | EN | **GH-AW_ARTIFACT** | Інструкція інсталяції gh-aw | DEPRECATE |
| `DEVGUIDE.md` | EN | **NEEDS_UPDATE** | Dev guide; потребує оновлення | REVIEW |
| `FRONTMATTER_HASH_SUMMARY.md` | EN | **GH-AW_ARTIFACT** | Hash специфікація для gh-aw frontmatter | DEPRECATE |
| `MIRROR_QUICK_START.md` | EN | **GH-AW_ARTIFACT** | Mirror setup для gh-aw | DEPRECATE |
| `SECURITY.md` | EN | **INFRA** | GitHub security policy | KEEP |
| `SUPPORT.md` | EN | **INFRA** | Support info | KEEP |

---

## 15. docs/public/ (медіа та схеми)

| Категорія | Кількість | Статус | Дія |
|-----------|-----------|--------|-----|
| Fonts | 3 | **INFRA** | KEEP |
| Images | 4 | **GH-AW_ARTIFACT** | org-owned/user-owned — gh-aw diagrams | KEEP (harmless) |
| Videos | 5 | **GH-AW_ARTIFACT** | gh-aw demo videos | KEEP (harmless) |
| Schemas | 2 | **GH-AW_ARTIFACT** | mcp-gateway-config, safe-inputs — gh-aw schemas | REVIEW |

---

## Зведена статистика

| Статус | Кількість файлів | % |
|--------|-------------------|---|
| **CANONICAL** | 11 | 16% |
| **NEEDS_TRANSLATION** | 5 | 7% |
| **NEEDS_UPDATE** | 8 | 12% |
| **DEPRECATED** | 13 | 19% |
| **GH-AW_ARTIFACT** | 15+ (без docs/src/content ~94) | 22% |
| **STUB** | 2 | 3% |
| **INFRA** | 14 | 20% |

**Ключовий висновок:** ~60% документації потребує дій (переклад, оновлення, deprecation або видалення). Лише 16% є канонічними документами, готовими для використання. Основний масив gh-aw артефактів (~94 Starlight content файли) потребує окремого рішення Owner.

---

*Цей інвентар є вхідною точкою для Фази 2 (канонізація) та Фази 3 (архітектурний аудит).*
