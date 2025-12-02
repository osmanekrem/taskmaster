# Taskmaster → Jira-Seviyesi Uygulama Yol Haritası

Single-tenant, Jira seviyesi özellik ve esneklik için tam yol haritası.

---

## 📊 Milestone Özeti

```
MVP+          (Phase 1-7)   → %75 Jira    → ~20 hafta
Advanced      (Phase 8-10)  → %85 Jira    → +10 hafta  
Enterprise    (Phase 11-13) → %92 Jira    → +10 hafta
Ecosystem     (Phase 14-15) → %95+ Jira   → +8 hafta
─────────────────────────────────────────────────────
Toplam                                     ~48 hafta
```

---

## 🔴 STAGE 1: MVP+ Foundation (Phase 1-7)

---

### Phase 1: Güvenlik & Stabilite (Hafta 1-2)

**Hedef:** Production-safe backend

| # | Task | Dosya | Öncelik | Status |
|---|------|-------|---------|--------|
| 1.1 | Workflow validator placeholder'ları implement et | `validators.ts:351-400` | Critical | ✅ |
| 1.2 | Separation of duties bypass düzelt | `conditions.ts:204-212` | Critical | ✅ |
| 1.3 | Webhook HMAC validation | `automation-service.ts:476` | Critical | ✅ |
| 1.4 | Missing permission checks | `issue-link-service.ts`, `comment-service.ts`, `worklog-service.ts` | High | ✅ |
| 1.5 | Transaction boundaries ekle | Multi-step operations in services | High | ✅ |

**Çıktı:** Güvenlik açıkları kapatılmış, data integrity sağlanmış

**Tamamlanan İşler:**
- `validators.ts`: 4 placeholder validator (`previous_status`, `all_subtasks_resolved`, `parent_status_check`, `linked_issues_resolved`) gerçek DB sorguları ile implement edildi
- `conditions.ts`: `separation_of_duties` condition'ı `changeGroups`/`changeItems` tabloları üzerinden gerçek kontrol yapıyor
- `automation-service.ts`: `validateWebhookSignature()` fonksiyonu eklendi (HMAC-SHA256, X-Hub-Signature-256/X-Signature/X-Webhook-Signature header desteği)
- `issue-link-service.ts`: `deleteLink` metoduna permission check eklendi, `createLink` ve `deleteLink` transaction ile sarmalandı
- `comment-service.ts`: `deleteComment` ve `deleteAttachment` metodlarına admin permission check eklendi

---

### Phase 2: Mimari Tutarlılık (Hafta 3-4)

**Hedef:** Tek pattern, maintainable kod

| # | Task | Detay | Status |
|---|------|-------|--------|
| 2.1 | Service pattern birleştir | Factory → Class-based (projectService, workflowService, statusService, vb.) | 🔄 |
| 2.2 | Repository-only DB access | Service'lerdeki `db.query` → repository metodları | 🔄 |
| 2.3 | BaseRepository extend | IssueRepository'yi BaseRepository'den extend et | ⬜ |
| 2.4 | Unit of Work pattern | Transaction koordinasyonu için UnitOfWork class | ✅ |
| 2.5 | Container refactor | Tüm dependency'ler container üzerinden | ⬜ |

**Tamamlanan İşler:**
- `FieldTypeService`: Factory → Class-based ✅
- `StatusService`: Factory → Class-based (backward-compatible factory wrapper) ✅
- `UserService`: Factory → Class-based (backward-compatible factory wrapper) ✅
- `TicketTypeService`: Factory → Class-based (backward-compatible factory wrapper) ✅
- `GroupService`: Plain object → Class-based (singleton instance) ✅
- `FieldService`: Factory → Class-based (backward-compatible factory wrapper) ✅
- `ProjectService`: Factory → Class-based (backward-compatible factory wrapper) ✅
- `SecurityService`: Plain object → Class-based (singleton instance) ✅
- `IssueLinkRepository`: `DbOrTx` type desteği eklendi (transaction compatibility) ✅
- `UnitOfWork` class: Transaction koordinasyonu pattern'i implement edildi ✅
- `CommentRepository`: Constructor ile DbOrTx support eklendi ✅
- `AttachmentRepository`: Constructor ile DbOrTx support eklendi ✅
- Transaction tipleri birleştirildi: `DrizzleClientOrTransaction` = `DbOrTx` ✅

**Phase 2.1 Service Dönüşümü Tamamlandı (9/9):**
- ✅ `IssueService`, `NotificationService`, `CommentService`
- ✅ `FieldTypeService`, `StatusService`, `UserService`
- ✅ `TicketTypeService`, `GroupService`, `FieldService`
- ✅ `ProjectService`, `SecurityService`

**Çıktı:** Test edilebilir, tutarlı service layer ✅

---

### Phase 3: Data Model Temizliği (Hafta 5-6)

**Hedef:** Audit-ready, optimized database

| # | Task | Detay | Status |
|---|------|-------|--------|
| 3.1 | History model birleştir | `issue_history` → `change_groups` + `change_items` migration | ⬜ |
| 3.2 | Audit field'ları ekle | `createdBy`, `updatedBy` eksik tablolara | ⬜ |
| 3.3 | Index optimizasyonu | Composite index'ler kritik query'ler için | ⬜ |
| 3.4 | Soft delete standardizasyonu | Hangi entity'ler soft delete karar ve uygula | ⬜ |
| 3.5 | Optimistic concurrency | `version` field mutable entity'lere | ⬜ |

**Çıktı:** Performanslı, audit-compliant database

---

### Phase 4: Event & Queue Güçlendirme (Hafta 7-8)

**Hedef:** Reliable event delivery

| # | Task | Detay | Status |
|---|------|-------|--------|
| 4.1 | Domain event store tablosu | `domain_events` table for persistence | ✅ |
| 4.2 | Outbox pattern | Same-transaction event save + async publish | ✅ |
| 4.3 | Event payload validation | Zod schemas for events | ✅ |
| 4.4 | Retry mechanism | Failed event retry queue with exponential backoff | ✅ |
| 4.5 | Missing event types | `IssueViewed`, `BulkIssueUpdated`, attachment events, etc. | ✅ |

**Çıktı:** Event replay, guaranteed delivery ✅

**Phase 4 Completed Files:**
- `apps/server/src/db/schema/events.ts` - Domain events + outbox schema
- `apps/server/src/db/migrations/0036_domain_events.sql` - Migration
- `apps/server/src/lib/events/domain-event-service.ts` - Event store service with outbox pattern
- `apps/server/src/workers/outbox-worker.ts` - Background processor for reliable delivery

---

### Phase 5: Core Feature Tamamlama (Hafta 9-10)

**Hedef:** Backend feature-complete

| # | Task | Detay | Status |
|---|------|-------|--------|
| 5.1 | Automation engine tamamla | `scheduled_jql`, `jql_match`, manual trigger | ✅ |
| 5.2 | Board service tamamla | `getBoardData` real implementation | ✅ |
| 5.3 | Notification engine | Email preferences, project member notify | ✅ |
| 5.4 | JQL execution | Full query execution pipeline | ✅ |
| 5.5 | Bulk operations | Bulk edit, transition, delete, move | ✅ |
| 5.6 | JQL CONTAINS operatörü | `~` ve `!~` operatörleri ekle | ✅ |
| 5.7 | JQL WAS predicates | `AFTER`, `BEFORE`, `BY`, `FROM`, `TO`, `DURING`, `ON` | ✅ |
| 5.8 | JQL fonksiyonları | `linkedIssues()`, `votedIssues()`, `watchedIssues()` | ✅ |

**Phase 5.1 Implementation Details:**
- `scheduled_jql` trigger: JQL sorgusu çalıştırıp her eşleşen issue için otomasyon tetikler
- `jql_match` condition: Issue'nun belirli bir JQL sorgusuna uyup uymadığını kontrol eder (async)
- Manual trigger: Kullanıcı tarafından manuel olarak tetiklenen otomasyonlar (opsiyonel issue context ile)

**JQL Parity Checklist:**
```
Operators:
├── ✅ =, !=, >, >=, <, <=
├── ✅ IN, NOT IN
├── ✅ IS, IS NOT (NULL/EMPTY)
├── ✅ WAS, CHANGED (basic)
├── ⬜ ~ (CONTAINS), !~ (NOT CONTAINS)
└── ⬜ WAS/CHANGED with predicates

Functions:
├── ✅ now(), startOf/endOf*()
├── ✅ currentUser(), membersOf()
├── ✅ openSprints(), closedSprints(), futureSprints()
├── ✅ releasedVersions(), unreleasedVersions()
└── ⬜ linkedIssues(), votedIssues(), watchedIssues()
```

**Çıktı:** Tüm backend API'ları çalışır durumda

---

### Phase 6: Jira-Level Schemes (Hafta 11-14)

**Hedef:** Jira esnekliği

| # | Task | Detay | Status |
|---|------|-------|--------|
| 6.1 | Workflow schemes | Project başına issue type'a özel workflow | ⬜ |
| 6.2 | Field context sistemi | Project+issue type field davranışı | ⬜ |
| 6.3 | Issue type schemes | Hangi tipler hangi projelerde | ⬜ |
| 6.4 | Screen scheme integration | Transition screen'leri workflow'a bağla | ⬜ |
| 6.5 | Notification schemes | Event bazlı notification routing | ⬜ |
| 6.6 | Draft workflow editing | Aktif workflow'u draft olarak düzenle, publish et | ⬜ |
| 6.7 | Workflow condition: user_in_group | Kullanıcı belirli grupta mı kontrolü | ⬜ |
| 6.8 | Permission scheme improvements | "Current Assignee", "Reporter" gibi dynamic holders | ⬜ |

**Scheme Parity Checklist:**
```
├── ⬜ Workflow Schemes
├── ⬜ Screen Schemes  
├── ⬜ Field Configuration Schemes
├── ⬜ Issue Type Schemes
├── ⬜ Notification Schemes
├── ⬜ Permission Schemes
├── ⬜ Issue Security Schemes
└── ⬜ Draft Workflow Support
```

**Çıktı:** Jira-level konfigürasyon esnekliği

---

### Phase 7: Frontend MVP (Hafta 15-20)

**Hedef:** Kullanılabilir UI

| # | Task | Detay | Status |
|---|------|-------|--------|
| 7.1 | Project pages | List, detail, settings, members | ⬜ |
| 7.2 | Issue pages | List, detail modal, create/edit | ⬜ |
| 7.3 | Board view | Kanban/Scrum, drag-drop, swimlanes | ⬜ |
| 7.4 | Sprint management | Planning, backlog, burndown chart | ⬜ |
| 7.5 | Search & filters | JQL input, saved filters, quick filters | ⬜ |
| 7.6 | Basic settings | Workflow status list, field list, user management | ⬜ |
| 7.7 | Issue voting | Vote/unvote, voter list UI | ⬜ |
| 7.8 | Issue watching | Watch/unwatch, watcher list UI | ⬜ |
| 7.9 | Issue attachments | File upload on issue (not just comments) | ⬜ |
| 7.10 | Activity tab | Unified activity stream (comments, history, worklogs) | ⬜ |
| 7.11 | Keyboard shortcuts | j/k navigation, e to edit, a to assign, etc. | ⬜ |

**Issue UI Parity Checklist:**
```
├── ⬜ Summary, Description, Fields
├── ⬜ Comments (threaded)
├── ⬜ History/Changelog
├── ⬜ Worklogs
├── ⬜ Links
├── ⬜ Subtasks
├── ⬜ Attachments
├── ⬜ Voting
├── ⬜ Watching
├── ⬜ Activity Stream
└── ⬜ Keyboard shortcuts
```

**Çıktı:** End-to-end kullanılabilir uygulama

---

### 📍 MVP+ Milestone Checklist: %75 Jira Coverage

```
⬜ Full issue lifecycle with attachments, voting, watching
⬜ Custom workflows with schemes & draft editing
⬜ Custom fields with contexts (21 types)
⬜ Full JQL with CONTAINS, WAS predicates, all functions
⬜ Automation engine (21 triggers, 40+ actions)
⬜ Scrum & Kanban boards
⬜ Sprint management with burndown
⬜ Permission & security schemes
⬜ Notification schemes
⬜ Audit trail
⬜ Keyboard shortcuts
```

---

## 🟠 STAGE 2: Advanced Features (Phase 8-10)

---

### Phase 8: Advanced Reporting (Hafta 21-24)

**Hedef:** Data-driven decisions

| # | Task | Detay | Jira Equivalent | Status |
|---|------|-------|-----------------|--------|
| 8.1 | Velocity chart | Sprint velocity over time | ✅ Jira built-in | ⬜ |
| 8.2 | Burndown chart | Sprint burndown | ✅ Jira built-in | ⬜ |
| 8.3 | Cumulative flow diagram | Status distribution over time | ✅ Jira built-in | ⬜ |
| 8.4 | Cycle time report | Time in each status | ✅ Jira Control Chart | ⬜ |
| 8.5 | Lead time report | Created to done duration | ✅ Jira Control Chart | ⬜ |
| 8.6 | Sprint report | Commitment vs completed | ✅ Jira built-in | ⬜ |
| 8.7 | Epic report | Epic progress, child issues | ✅ Jira built-in | ⬜ |
| 8.8 | Version report | Version progress, release status | ✅ Jira built-in | ⬜ |
| 8.9 | Resolution time report | Average time to resolve | ✅ Jira built-in | ⬜ |
| 8.10 | Workload pie chart | Work distribution by assignee | ✅ Jira built-in | ⬜ |
| 8.11 | Created vs Resolved | Issue creation vs resolution trend | ✅ Jira built-in | ⬜ |
| 8.12 | Time tracking report | Logged vs estimated time | ✅ Jira built-in | ⬜ |

**Çıktı:** 12 temel Agile/management report

---

### Phase 9: Dashboard System (Hafta 25-27)

**Hedef:** Configurable dashboards

| # | Task | Detay | Status |
|---|------|-------|--------|
| 9.1 | Dashboard CRUD | Create, share, favorite | ⬜ |
| 9.2 | Gadget framework | Pluggable architecture | ⬜ |
| 9.3 | Filter results gadget | JQL sonuçları tablo | ⬜ |
| 9.4 | Pie chart gadget | Field distribution | ⬜ |
| 9.5 | Activity stream gadget | Recent activity | ⬜ |
| 9.6 | Sprint health gadget | Current sprint status | ⬜ |
| 9.7 | Assigned to me gadget | Personal issue list | ⬜ |
| 9.8 | Created vs resolved gadget | Trend chart | ⬜ |
| 9.9 | Two-dimensional filter | Matrix view (status x priority) | ⬜ |
| 9.10 | Heat map gadget | Activity heat map | ⬜ |
| 9.11 | Quick links gadget | Custom shortcuts | ⬜ |
| 9.12 | Text gadget | Markdown/HTML content | ⬜ |
| 9.13 | Wallboard mode | Full-screen TV display | ⬜ |
| 9.14 | Dashboard layout | Grid-based drag-drop | ⬜ |

**Çıktı:** Kişiselleştirilebilir dashboards (12+ gadget)

---

### Phase 10: Advanced Fields & Forms (Hafta 28-30)

**Hedef:** Jira field parity

| # | Task | Detay | Status |
|---|------|-------|--------|
| 10.1 | Cascading select | Multi-level dropdown | ⬜ |
| 10.2 | Version picker field | Native version selection | ⬜ |
| 10.3 | Component picker field | Native component selection | ⬜ |
| 10.4 | Group picker field | User group selection | ⬜ |
| 10.5 | Project picker field | Cross-project reference | ⬜ |
| 10.6 | Read-only calculated field | Değer hesaplanır, edit edilemez | ⬜ |
| 10.7 | Formula field | Basit formüller (sum, count, etc.) | ⬜ |
| 10.8 | Field dependencies | Show/hide based on other field | ⬜ |
| 10.9 | Form conditions | Dynamic form behavior | ⬜ |
| 10.10 | Field behaviors | Jira Behaviors plugin equivalent | ⬜ |
| 10.11 | Validators on fields | Field-level validation (regex, range) | ⬜ |

**Çıktı:** Full Jira field type parity (23+ types)

---

### 📍 Advanced Milestone Checklist: %85 Jira Coverage

```
⬜ MVP+ features
⬜ 12 Agile/management reports
⬜ Custom dashboards with 12+ gadgets
⬜ Wallboard mode for TV display
⬜ Calculated/formula fields
⬜ Field behaviors
⬜ Advanced field validation
```

---

## 🟡 STAGE 3: Enterprise Features (Phase 11-13)

---

### Phase 11: Portfolio & Hierarchy (Hafta 31-36)

**Hedef:** Multi-level planning (Advanced Roadmaps equivalent)

| # | Task | Detay | Status |
|---|------|-------|--------|
| 11.1 | Initiative level | 4th hierarchy level above Epic | ⬜ |
| 11.2 | Portfolio backlog | Cross-project initiative view | ⬜ |
| 11.3 | Roadmap view | Timeline-based planning | ⬜ |
| 11.4 | Dependency visualization | Gantt-style dependencies | ⬜ |
| 11.5 | Capacity planning | Team capacity vs planned work | ⬜ |
| 11.6 | Program board | Multi-team coordination view | ⬜ |
| 11.7 | Release planning | Version-based release management | ⬜ |
| 11.8 | Progress rollup | Child → parent progress calculation | ⬜ |
| 11.9 | Cross-project epics | Epic spans multiple projects | ⬜ |
| 11.10 | Scenario planning | "What-if" simulations | ⬜ |
| 11.11 | Team management | Team capacity, skills | ⬜ |
| 11.12 | Release train board | SAFe-style planning | ⬜ |

**Çıktı:** Jira Advanced Roadmaps equivalent

---

### Phase 12: Advanced Automation (Hafta 37-40)

**Hedef:** Intelligent automation

| # | Task | Detay | Status |
|---|------|-------|--------|
| 12.1 | Branch conditions | Complex conditional flows | ⬜ |
| 12.2 | Related issues actions | Act on parent/child/linked | ⬜ |
| 12.3 | Cross-project actions | Multi-project automation | ⬜ |
| 12.4 | Scheduled rules | Time-based triggers | ⬜ |
| 12.5 | SLA management | Response/resolution time tracking | ⬜ |
| 12.6 | Escalation rules | Auto-escalate overdue issues | ⬜ |
| 12.7 | Automation templates | Pre-built rule templates | ⬜ |
| 12.8 | Audit dashboard | Rule execution analytics | ⬜ |
| 12.9 | DevOps triggers | `branch_created`, `commit_created`, `pull_request_*`, `build_*`, `deployment_*` | ⬜ |
| 12.10 | Slack action | Post to Slack channel/DM | ⬜ |
| 12.11 | Teams action | Post to MS Teams | ⬜ |
| 12.12 | HTTP request action | Generic webhook with response handling | ⬜ |
| 12.13 | Create Confluence page | Confluence integration action (optional) | ⬜ |

**Automation Parity:**
```
Triggers: 21 → 26 (+5 DevOps)
Actions: 40+ → 50+ (+integrations)
```

**Çıktı:** Enterprise-grade automation

---

### Phase 13: Security & Compliance (Hafta 41-44)

**Hedef:** Enterprise security

| # | Task | Detay | Status |
|---|------|-------|--------|
| 13.1 | Advanced audit log | Searchable, exportable audit | ⬜ |
| 13.2 | Data retention policies | Auto-archive/delete old data | ⬜ |
| 13.3 | Export controls | Restrict data export | ⬜ |
| 13.4 | IP allowlisting | Restrict access by IP | ⬜ |
| 13.5 | Session management | Concurrent session limits | ⬜ |
| 13.6 | API rate limiting | Per-user/endpoint limits | ⬜ |
| 13.7 | Compliance reports | SOC2, GDPR helpers | ⬜ |
| 13.8 | Backup management | Scheduled backup UI | ⬜ |

**Çıktı:** Enterprise security & compliance

---

### 📍 Enterprise Milestone Checklist: %92 Jira Coverage

```
⬜ Advanced features (Stage 2)
⬜ Portfolio planning & roadmaps
⬜ Cross-project epics
⬜ DevOps integration triggers
⬜ Slack/Teams automation
⬜ SLA management
⬜ Compliance tools
```

---

## 🟢 STAGE 4: Ecosystem (Phase 14-15)

---

### Phase 14: Integration Framework (Hafta 45-48)

**Hedef:** External connectivity

| # | Task | Detay | Status |
|---|------|-------|--------|
| 14.1 | REST API v1 | Public documented API | ⬜ |
| 14.2 | API authentication | OAuth2, API keys | ⬜ |
| 14.3 | Webhooks v2 | Subscribable webhook topics | ⬜ |
| 14.4 | Slack integration | Native Slack bot | ⬜ |
| 14.5 | Teams integration | MS Teams connector | ⬜ |
| 14.6 | GitHub integration | Issue ↔ PR linking | ⬜ |
| 14.7 | GitLab integration | Issue ↔ MR linking | ⬜ |
| 14.8 | Zapier connector | Integration platform | ⬜ |
| 14.9 | Bitbucket integration | Branch, PR, build status | ⬜ |
| 14.10 | Jenkins integration | Build status, deployment | ⬜ |
| 14.11 | OAuth2 app installation | Third-party apps can authenticate | ⬜ |
| 14.12 | API scopes | Granular permission for apps | ⬜ |
| 14.13 | Incoming mail handler | Create issues via email | ⬜ |

**Çıktı:** Connected tool ecosystem

---

### Phase 15: Extensibility (Hafta 49-52+)

**Hedef:** Platform extensibility (Forge equivalent)

| # | Task | Detay | Status |
|---|------|-------|--------|
| 15.1 | Plugin architecture | Sandboxed plugin runtime | ⬜ |
| 15.2 | Custom UI panels | Plugin UI injection points | ⬜ |
| 15.3 | Custom actions | Plugin-defined automation actions | ⬜ |
| 15.4 | Custom conditions | Plugin-defined conditions | ⬜ |
| 15.5 | Custom fields via plugin | New field types via plugins | ⬜ |
| 15.6 | Plugin marketplace | Discovery, install, update | ⬜ |
| 15.7 | Plugin SDK | Developer documentation | ⬜ |
| 15.8 | Plugin templates | Starter templates | ⬜ |
| 15.9 | Custom issue panels | Right panel plugins | ⬜ |
| 15.10 | Custom project pages | Full page plugins | ⬜ |
| 15.11 | Custom dashboard gadgets | Plugin gadgets | ⬜ |
| 15.12 | Plugin webhooks | Plugin-specific events | ⬜ |

**Çıktı:** Extensible platform

---

### 📍 Ecosystem Milestone Checklist: %95+ Jira Coverage

```
⬜ Enterprise features (Stage 3)
⬜ Public API (REST v1)
⬜ OAuth2 app ecosystem
⬜ Native integrations (Slack, Teams, GitHub, GitLab, Bitbucket, Jenkins)
⬜ Email handler
⬜ Plugin platform (Forge equivalent)
⬜ Plugin marketplace
⬜ Custom UI extensions
```

---

## 📊 Coverage Progression

```
Phase    Hafta    Coverage    
─────────────────────────────
1-4      1-8      Foundation  
5-6      9-14     60%         
7        15-20    75%         ████████████████░░░░░
─────────────────────────────
8        21-24    78%         █████████████████░░░░
9        25-27    82%         ██████████████████░░░
10       28-30    85%         ███████████████████░░
─────────────────────────────
11       31-36    88%         ███████████████████░░
12       37-40    90%         ████████████████████░
13       41-44    92%         ████████████████████░
─────────────────────────────
14       45-48    94%         █████████████████████
15       49-52    95%+        █████████████████████
```

---

## 🎯 Karar Noktaları

| Milestone | Soru | Seçenekler |
|-----------|------|------------|
| **Phase 7 sonrası** | MVP yeterli mi? | Stop vs Continue |
| **Phase 10 sonrası** | Enterprise'a ihtiyaç var mı? | Reporting focus vs Portfolio focus |
| **Phase 13 sonrası** | SaaS mı, self-hosted mı? | Multi-tenant pivot vs Plugin focus |

---

## 📁 Branch Stratejisi

```
main                    ← Production
├── develop             ← Integration
│   ├── phase-1         ← Security fixes
│   ├── phase-2         ← Architecture
│   ├── phase-3         ← Data model
│   └── ...
└── release/v1.0        ← MVP+ release (Phase 7 sonrası)
    release/v2.0        ← Advanced release (Phase 10 sonrası)
    release/v3.0        ← Enterprise release (Phase 13 sonrası)
```

---

## 📈 Final Coverage Matrix

| Jira Feature Area | Phase | Coverage |
|-------------------|-------|----------|
| Issue Management | 1-7 | 100% |
| Custom Fields | 7, 10 | 100%+ |
| Workflows | 1, 6 | 100% |
| JQL | 5 | 100% |
| Boards (Scrum/Kanban) | 7 | 100% |
| Automation | 5, 12 | 95% |
| Reports | 8 | 80% |
| Dashboards | 9 | 70% |
| Advanced Roadmaps | 11 | 75% |
| Permissions/Security | 1, 6, 13 | 95% |
| Integrations | 14 | 80% |
| Extensibility | 15 | 70% |

**Overall:** %95+ Jira Core Features

---

## ✅ Progress Tracking

Her task tamamlandığında `⬜` → `✅` olarak güncelle.

**Son Güncelleme:** 1 Aralık 2025
