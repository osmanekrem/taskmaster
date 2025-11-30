# TaskMaster → Jira-Seviyesi Tam Yol Haritası

> **Hedef:** %97+ Jira Core Parity
> **Tahmini Süre:** ~6 ay (full parity)
> **MVP Süresi:** ~10-12 hafta (%85 Jira)

---

## 📊 Hedef Seviyeleri

| Milestone | Jira % | Linear % | Açıklama |
|-----------|--------|----------|----------|
| **MVP (Phase 0-9)** | 85% | 100%+ | Production-ready Agile tracker |
| **Advanced (Phase 10-12)** | 94% | - | Enterprise-lite |
| **Enterprise (Phase 13-15)** | 97.5% | - | Full Jira parity |
| **Polish (Phase 16-20)** | 98-99% | - | Mobile, multi-tenant |

---

## 📋 MVP Phases

### Phase 0: Bug Fix & Security (3-4 gün) ✅ TAMAMLANDI
> **Jira: 15% → 20%** | **Öncelik: KRİTİK**

- [x] Permission middleware → tüm router'lara ekle
  - [x] `/lib/middleware/permission.ts` oluşturuldu
  - [x] issues, projects, sprints, workflows, comments router'larına eklendi
  - [x] statuses, ticket-types, fields, user, field-types, notifications router'larına eklendi
- [x] Context tutarlılığı → tüm servisleri context'e ekle
  - [x] notification, permission, sprint servisleri context'e eklendi
- [x] Bug fix'ler:
  - [x] Search'e `summary`, `description` eklendi
  - [x] `setFieldValues()` batch upsert yapıldı (onConflictDoUpdate ile)
  - [x] `sprint_issues` cascade delete zaten mevcuttu
- [x] In-use check'leri implement edildi:
  - [x] Workflow in-use check (countWorkflowUsage)
  - [x] Status in-use check (countByStatusId, countStatusUsageInWorkflows)
  - [x] Resolution in-use check (countByResolutionId)
  - [x] Issue type in-use check (countByIssueTypeId)
- [x] Yeni permission tipleri eklendi:
  - [x] status:view, issue_type:view, field:view, user:view
  - [x] admin:manage_statuses, admin:manage_resolutions

**NOT:** permissions router hala `container` kullanıyor - ctx.services'e migrate edilmeli

---

### Phase 1: Mimari Temizlik (4-5 gün) ✅ TAMAMLANDI
> **Jira: 20% → 25%** | **Öncelik: YÜKSEK**

- [x] Event Bus oluştur (`EventEmitter`)
  - [x] `/lib/events/event-bus.ts` - Typed event sistemi
  - [x] Issue, Sprint, Project, Comment, Workflow, User event tipleri
  - [x] Typed payloads, convenience emit fonksiyonları
  - [x] Wildcard listener desteği
- [x] Missing indexes ekle:
  - [x] `workflow_transitions.workflow_id`, `from_status_id`, `to_status_id`
  - [x] `workflow_statuses.workflow_id`
  - [x] `projects.is_archived`, `projects.lead_id`, composite index
  - [x] `issues.summary`, `created_at`, `due_date`
  - [x] `notifications` - zaten mevcut (user_unread, user_type, issue_id, group_key, archived)
- [x] Transaction wrapper utility
  - [x] `/lib/transaction.ts` - withTransaction, withOptionalTransaction
  - [x] withRetryableTransaction (serialization failure retry + exponential backoff)
  - [x] DbOrTx type for service flexibility
- [x] permissions router'ı ctx.services'e migrate et
  - [x] Tüm `container.permission` → `ctx.services.permission`
- [ ] Service pattern birleştir (factory pattern) - **Ertelendi: İhtiyaç duyulduğunda**

---

### Phase 2: History & Ranking (3-4 gün) ✅ TAMAMLANDI
> **Jira: 25% → 30%** | **Öncelik: YÜKSEK**

- [x] `change_groups` + `change_items` schema (JSONB history yerine)
  - [x] `change_groups` tablosu (issue_id, user_id, action, created_at)
  - [x] `change_items` tablosu (change_group_id, field, old_string, new_string, old_value, new_value)
  - [x] ChangeActionType enum (created, updated, transitioned, assigned, etc.)
  - [x] Legacy `issue_history` tablosu korundu (backwards compat)
- [x] LexoRank ekleme:
  - [x] `issues.rank` kolonu (backlog ordering)
  - [x] `sprint_issues.rank` kolonu (sprint ordering)
  - [x] `bun add lexorank`
  - [x] `/utils/lexorank.ts` - generateInitialRank, generateRankBefore, generateRankAfter, generateRankBetween, generateRanks
- [x] Reorder endpoints:
  - [x] `reorderIssue` - Tek issue'yu afterIssueId/beforeIssueId ile taşı
  - [x] `bulkReorderIssues` - Birden fazla issue'yu sırala
  - [x] `getBacklogIssues` - Rank'e göre sıralı backlog
  - [x] Repository metodları: updateRank, getFirstRankInProject, getLastRankInProject, bulkUpdateRanks
  - [x] Sprint issue ranking repository eklendi

---

### Phase 3: Workflow Engine (7-8 gün) ✅ TAMAMLANDI
> **Jira: 30% → 42%** | **Öncelik: YÜKSEK**

- [x] Engine yapısı (`/engine/workflow/`)
  - [x] `/engine/workflow/types.ts` - WorkflowContext, Condition, Validator, PostFunction types
  - [x] `/engine/workflow/conditions.ts` - Condition handlers with registry
  - [x] `/engine/workflow/validators.ts` - Validator handlers with registry
  - [x] `/engine/workflow/post-functions.ts` - PostFunction handlers with registry
  - [x] `/engine/workflow/engine.ts` - WorkflowEngine class
  - [x] `/engine/workflow/index.ts` - Public API exports
- [x] **Typed conditions:**
  - [x] `user_in_project_role`
  - [x] `user_is_assignee`
  - [x] `user_is_reporter`
  - [x] `user_has_permission`
  - [x] `only_subtasks`
  - [x] `only_standard_issues`
  - [x] `parent_status`
  - [x] `separation_of_duties`
- [x] **Typed validators:**
  - [x] `field_required`
  - [x] `field_is_empty`
  - [x] `field_has_value`
  - [x] `field_changed`
  - [x] `resolution_set`
  - [x] `date_comparison`
  - [x] `regex_check`
  - [x] `numeric_range`
  - [x] `previous_status`
  - [x] `all_subtasks_resolved`
  - [x] `parent_status_check`
  - [x] `linked_issues_resolved`
- [x] **Typed post-functions:**
  - [x] `set_field`
  - [x] `clear_field`
  - [x] `copy_field_value`
  - [x] `assign_to_reporter`
  - [x] `assign_to_lead`
  - [x] `assign_to_current_user`
  - [x] `unassign`
  - [x] `set_resolution`
  - [x] `clear_resolution`
  - [x] `add_comment`
  - [x] `add_watcher`
  - [x] `remove_watcher`
  - [x] `trigger_notification`
  - [x] `fire_event`
  - [x] `update_change_history`
  - [x] `set_due_date`
  - [x] `move_to_sprint`
- [x] Service entegrasyonu
  - [x] `workflowService.createEngineForWorkflow()` 
  - [x] `workflowService.getAvailableTransitionsForIssue()`
  - [x] `workflowService.executeTransition()`
  - [x] `workflowService.validateTransitionRequest()`
- [x] Router endpoint'leri
  - [x] `getAvailableTransitionsForIssue` - Issue için mevcut transition'ları getir
  - [x] `executeTransition` - Transition çalıştır
  - [x] `validateTransitionRequest` - Transition'ı doğrula
- [x] Validation schema'ları
  - [x] `executeTransitionSchema`
  - [x] `validateTransitionRequestSchema`
  - [x] `getAvailableTransitionsForIssueSchema`
- [ ] Field value validation servisi (**Ertelendi:** Gerçek custom field entegrasyonu ile)
- [ ] Draft workflows support (**Ertelendi:** Advanced phases)

---

### Phase 4: Queue & Notifications (5-6 gün) ✅ TAMAMLANDI
> **Jira: 42% → 48%** | **Öncelik: ORTA**

- [x] BullMQ + Redis kurulum
  - [x] `bun add bullmq@5.65.0 ioredis@5.8.2`
  - [x] `/lib/redis.ts` - Redis connection management
- [x] Docker Compose (PostgreSQL + Redis + App)
  - [x] PostgreSQL, Redis, pgAdmin, Redis Commander
- [x] Job queues:
  - [x] `/lib/queue/index.ts` - Queue infrastructure
  - [x] NotificationQueue (19 notification types)
  - [x] EmailQueue
- [x] Workers:
  - [x] `/workers/notification-worker.ts` - In-app notification processor
  - [x] `/workers/email-worker.ts` - Email processor via Resend
- [x] Event bus → Queue entegrasyonu
  - [x] `/lib/events/event-to-queue.ts` - EventBus → Queue bridge
- [x] **Notification schemes:**
  - [x] `notification_schemes` tablosu
  - [x] `notification_scheme_events` (scheme_id, event_type, recipient_type, channels)
  - [x] `project_notification_schemes` - Project → Scheme assignment
  - [x] Default/Minimal/Aggressive scheme seeds
- [x] **Recipient types:**
  - [x] Current Assignee
  - [x] Reporter
  - [x] Project Lead
  - [x] Component Lead
  - [x] All Watchers
  - [x] Users in Role
  - [x] Single User
  - [x] Group Custom Field Value
  - [x] Previous Assignee
  - [x] Sprint Team Members
  - [x] Mentioned Users
  - [x] All Project Members
- [x] Repository + Service + Router
  - [x] `notification-scheme-repository.ts` (12 methods)
  - [x] `notificationSchemesRouter` (12 endpoints)

---

### Phase 5: Core Schemas (6-7 gün) ✅ TAMAMLANDI
> **Jira: 48% → 58%** | **Öncelik: ORTA**

- [x] **Issue Links:**
  - [x] `issue_link_types` (name, inward_name, outward_name)
  - [x] Default types: Blocks, Clones, Duplicates, Relates to, Causes, Parent-Child
  - [x] `issue_links` (source, target, type, created_by)
  - [x] `IssueLinkRepository` + `IssueLinkService` + `issueLinksRouter` (10 endpoints)
  - [x] Blocking issues queries
- [x] **Components:**
  - [x] `components` (project_id, name, lead_id, description, default_assignee)
  - [x] `issue_components` junction
  - [x] `ComponentRepository` + `ComponentService` + `componentsRouter` (12 endpoints)
- [x] **Versions:**
  - [x] `versions` (project_id, name, description, start_date, release_date, status: unreleased/released/archived)
  - [x] `issue_fix_versions` junction
  - [x] `issue_affected_versions` junction
  - [x] `VersionRepository` + `VersionService` + `versionsRouter` (18 endpoints)
  - [x] Release/unrelease/archive workflows
- [x] **Labels (proper entity):**
  - [x] `labels` (project_id, name, color, description)
  - [x] `issue_labels` junction
  - [x] 18 preset colors, 12 default label templates
  - [x] `LabelRepository` + `LabelService` + `labelsRouter` (16 endpoints)
- [x] **Custom Fields genişletme:**
  - [x] `cascading-select` - Bağımlı seçim
  - [x] `user-multi-picker` - Çoklu kullanıcı
  - [x] `version-picker` - Versiyon seçici
  - [x] `component-picker` - Bileşen seçici
  - [x] `label-picker` - Etiket seçici
  - [x] `sprint-picker` - Sprint seçici
  - [x] `issue-picker` - Issue seçici
  - [x] `rating` - Derecelendirme
  - [x] `color-picker` - Renk seçici
  - [x] `time-tracking` - Zaman takibi
  - [x] `rich-text` - Zengin metin editörü
  - [x] `attachment` - Dosya eki
- [x] Validation schemas (`issue-associations.ts`)
- [x] Migration: `0026_phase5-core-schemas.sql` (52 tablo)
- [ ] **Issue operations:** (Ertelendi: Phase 8)
  - [ ] Clone issue
  - [ ] Move issue (change project)
  - [ ] Archive issue
- [ ] **Voting system:** (Ertelendi: Phase 8)
  - [ ] `issue_votes` (issue_id, user_id)
  - [ ] Vote count caching

---

### Phase 6: Time Tracking (4-5 gün)
> **Jira: 58% → 63%** | **Öncelik: ORTA**

- [ ] **Work logs:**
  - [ ] `work_logs` (issue_id, user_id, time_spent, started_at, description)
- [ ] **Estimate fields:**
  - [ ] `issues.original_estimate`
  - [ ] `issues.remaining_estimate`
  - [ ] `issues.time_spent`
- [ ] **Remaining estimate behavior:**
  - [ ] Auto-reduce
  - [ ] Set to specific value
  - [ ] Leave unchanged
- [ ] **Time tracking config:**
  - [ ] Working hours per day
  - [ ] Working days per week
  - [ ] Time display format
- [ ] Subtask time aggregation

---

### Phase 7: Board System (6-7 gün)
> **Jira: 63% → 72%** | **Öncelik: ORTA**

- [ ] **Board schema:**
  - [ ] `boards` (project_id, name, type: scrum/kanban, filter_jql)
  - [ ] `board_columns` (board_id, name, position)
  - [ ] `board_column_statuses` (column_id, status_id)
- [ ] **Swimlanes:**
  - [ ] `board_swimlanes` (board_id, type: none/epic/assignee/jql, config)
- [ ] **Quick filters:**
  - [ ] `board_quick_filters` (board_id, name, jql)
- [ ] **Card layout config:**
  - [ ] `board_card_config` (board_id, visible_fields[], card_colors)
  - [ ] Days in column indicator
- [ ] **WIP limits (Kanban):**
  - [ ] Column constraint (issue count / story points)
  - [ ] Visual warning when exceeded
- [ ] Board CRUD service & router

---

### Phase 8: Frontend Core (4-5 hafta)
> **Jira: 72% → 78%** | **Öncelik: YÜKSEK**

- [ ] **Project Pages:**
  - [ ] `/projects` - List
  - [ ] `/projects/:key` - Detail with tabs
  - [ ] `/projects/:key/settings` - Settings
- [ ] **Issue Pages:**
  - [ ] Issue list view (table)
  - [ ] Issue detail modal/page
  - [ ] Issue create modal
- [ ] **Board Views:**
  - [ ] Kanban board (drag-drop)
  - [ ] Backlog view
  - [ ] Sprint board
- [ ] **Shared Components:**
  - [ ] Issue card
  - [ ] Field renderer (all types)
  - [ ] Status badge
  - [ ] User picker
  - [ ] Priority icon
- [ ] **Issue operations UI:**
  - [ ] Clone modal
  - [ ] Move modal
  - [ ] Convert to subtask / Convert to issue
  - [ ] Archive/restore
- [ ] **Bulk operations:**
  - [ ] Multi-select in list/board
  - [ ] Bulk edit modal
  - [ ] Bulk transition
  - [ ] Bulk delete
- [ ] **Voting UI:**
  - [ ] Vote button on issue
  - [ ] Voters list popover

---

### Phase 9: Sprint & Reports (4-5 hafta)
> **Jira: 78% → 85%** | **Öncelik: ORTA**

- [ ] **Sprint views:**
  - [ ] Sprint planning view
  - [ ] Active sprint board
  - [ ] Sprint completion modal
- [ ] **Sprint features:**
  - [ ] Sprint goal editing
  - [ ] Scope change tracking
  - [ ] Reopen sprint
- [ ] **Reports:**
  - [ ] Burndown chart
  - [ ] Burnup chart
  - [ ] Velocity chart
  - [ ] Control chart (cycle time)
  - [ ] Cumulative flow diagram
  - [ ] Sprint report (completed/incomplete/added)
  - [ ] Epic burndown
  - [ ] Version report
- [ ] **Backlog features:**
  - [ ] Epic panel (collapse/expand)
  - [ ] Version panel
  - [ ] Quick filters
- [ ] **Notification center UI:**
  - [ ] Notification list
  - [ ] Mark read/unread
  - [ ] Preferences page

---

## 🚀 Advanced Phases (Phase 10-12)

### Phase 10: Advanced Search (3-4 hafta)
> **Jira: 85% → 88%**

- [ ] **Structured Filter Builder:**
  - [ ] Field-based filters
  - [ ] AND/OR logic
  - [ ] Date range filters
- [ ] **Full JQL:**
  - [ ] Parser (PEG.js/chevrotain)
  - [ ] All operators: `=`, `!=`, `>`, `<`, `IN`, `NOT IN`, `~`, `IS`, `IS NOT`
  - [ ] Historical operators: `WAS`, `WAS IN`, `WAS NOT`, `CHANGED`
  - [ ] Boolean: `AND`, `OR`, `NOT`
  - [ ] `ORDER BY`
- [ ] **JQL functions:**
  - [ ] `currentUser()`, `membersOf()`
  - [ ] `now()`, `startOfDay()`, `endOfDay()`, `startOfWeek()`, etc.
  - [ ] `openSprints()`, `closedSprints()`, `futureSprints()`
  - [ ] `linkedIssues()`, `votedIssues()`, `watchedIssues()`
  - [ ] `projectsLeadByUser()`, `componentsLeadByUser()`
- [ ] **Saved filters:**
  - [ ] Filter CRUD
  - [ ] Share with groups/projects/global
  - [ ] Favorite filters
- [ ] **Filter subscriptions:**
  - [ ] Email results on schedule
  - [ ] Cron-based delivery
- [ ] **Search UI:**
  - [ ] Syntax autocomplete
  - [ ] Field/value autocomplete
  - [ ] Column selection in results
  - [ ] Export (CSV, Excel)

---

### Phase 11: Dashboards & Gadgets (3 hafta)
> **Jira: 88% → 91%**

- [ ] **Dashboard schema:**
  - [ ] `dashboards` (name, owner_id, layout, is_default)
  - [ ] `dashboard_gadgets` (dashboard_id, gadget_type, position, config)
- [ ] **Dashboard features:**
  - [ ] Multiple layouts (1/2/3 columns)
  - [ ] Resize gadgets
  - [ ] Reorder gadgets (drag & drop)
  - [ ] Share dashboard
  - [ ] Favorite dashboards
  - [ ] Default dashboard per user
  - [ ] System dashboard
  - [ ] Wallboard mode
- [ ] **Gadgets:**
  - [ ] Activity Stream
  - [ ] Assigned to Me
  - [ ] Created vs Resolved Chart
  - [ ] Average Age Chart
  - [ ] Pie Chart (status/priority/assignee)
  - [ ] Filter Results
  - [ ] Heat Map
  - [ ] Resolution Time
  - [ ] Road Map
  - [ ] Sprint Burndown
  - [ ] Sprint Health
  - [ ] Two Dimensional Filter Statistics
  - [ ] Voted Issues
  - [ ] Watched Issues
  - [ ] Quick Links
  - [ ] Text/Markdown

---

### Phase 12: Automation Rules (4 hafta)
> **Jira: 91% → 94%**

- [ ] **Schema:**
  - [ ] `automation_rules` (project_id, name, trigger, conditions, actions, enabled)
  - [ ] `automation_logs` (rule_id, issue_id, status, executed_at, details)
- [ ] **Triggers:**
  - [ ] Issue created
  - [ ] Issue updated
  - [ ] Issue transitioned
  - [ ] Issue commented
  - [ ] Field value changed
  - [ ] Work logged
  - [ ] Sprint started/completed
  - [ ] Version released
  - [ ] Scheduled (cron)
  - [ ] Incoming webhook
  - [ ] Manual trigger
- [ ] **Conditions:**
  - [ ] Issue fields condition
  - [ ] JQL condition
  - [ ] User condition
  - [ ] If/else blocks
  - [ ] Related issues condition
- [ ] **Actions:**
  - [ ] Create issue
  - [ ] Edit issue fields
  - [ ] Clone issue
  - [ ] Delete issue
  - [ ] Transition issue
  - [ ] Assign issue
  - [ ] Link issues
  - [ ] Add comment
  - [ ] Send email
  - [ ] Send Slack/Teams message
  - [ ] Create version
  - [ ] Release version
  - [ ] Create sprint
  - [ ] Log work
  - [ ] Lookup issues (batch action)
  - [ ] Create variable
  - [ ] Delay action
- [ ] **Smart values:**
  - [ ] `{{issue.key}}`, `{{issue.summary}}`
  - [ ] `{{now}}`, `{{now.plusDays(7)}}`
  - [ ] `{{triggerUser.displayName}}`
  - [ ] Text manipulation
  - [ ] Math functions
- [ ] **UI:**
  - [ ] Rule builder
  - [ ] Rule logs viewer
  - [ ] Enable/disable toggle
  - [ ] Rule templates

---

## 🏢 Enterprise Phases (Phase 13-15)

### Phase 13: Screens System (2-3 hafta)
> **Jira: 94% → 95.5%**

- [ ] **Screen schema:**
  - [ ] `screens` (id, name, description)
  - [ ] `screen_tabs` (screen_id, name, position)
  - [ ] `screen_fields` (tab_id, field_id, position)
- [ ] **Screen types:**
  - [ ] Create screen
  - [ ] Edit screen
  - [ ] View screen
  - [ ] Transition screen
- [ ] **Screen schemes:**
  - [ ] `screen_schemes` (id, name)
  - [ ] `screen_scheme_items` (scheme_id, operation, screen_id)
- [ ] **Issue type screen schemes:**
  - [ ] `issue_type_screen_schemes` (id, name)
  - [ ] `issue_type_screen_scheme_items` (scheme_id, issue_type_id, screen_scheme_id)
- [ ] **Field configuration:**
  - [ ] Required/optional per screen
  - [ ] Hidden fields
  - [ ] Field descriptions
  - [ ] Default values
- [ ] **UI:**
  - [ ] Screen editor
  - [ ] Scheme management

---

### Phase 14: Advanced Permissions (1-2 hafta)
> **Jira: 95.5% → 96.5%**

- [ ] **Issue security levels:**
  - [ ] `security_schemes` (id, name, default_level_id)
  - [ ] `security_levels` (scheme_id, name, description)
  - [ ] `security_level_members` (level_id, type, value)
  - [ ] Issue → security_level assignment
  - [ ] Filter by security access
- [ ] **Extended permission types:**
  - [ ] Set Issue Security
  - [ ] Schedule Issues
  - [ ] View Voters and Watchers
  - [ ] Manage Watchers
- [ ] **Permission conditions:**
  - [ ] Reporter-only
  - [ ] Assignee-only
  - [ ] Group custom field value
  - [ ] User custom field value

---

### Phase 15: Integrations & API (2-3 hafta)
> **Jira: 96.5% → 97.5%**

- [ ] **Enhanced Webhooks:**
  - [ ] JQL filtering
  - [ ] Secret token (HMAC)
  - [ ] Retry policy
  - [ ] All events (sprint, board, version, user)
  - [ ] Webhook logs UI
- [ ] **REST API enhancements:**
  - [ ] OpenAPI 3.0 spec
  - [ ] API explorer UI (Swagger)
  - [ ] Cursor-based pagination
  - [ ] Field expansion
  - [ ] Rate limiting
- [ ] **API authentication:**
  - [ ] Personal access tokens
  - [ ] Token scopes
  - [ ] Token management UI
  - [ ] OAuth 2.0
- [ ] **Git integration:**
  - [ ] `commits` table
  - [ ] `branches` table
  - [ ] `pull_requests` table
  - [ ] Smart commits parsing
  - [ ] GitHub/GitLab/Bitbucket webhooks
  - [ ] Development panel in issue view

---

## 📊 Bonus Phases (Phase 16-20)

### Phase 16: Additional Reports (1-2 hafta)
- [ ] Resolution time report
- [ ] Time tracking report
- [ ] User workload report
- [ ] Deployment frequency
- [ ] Cycle time report

### Phase 17: Advanced Issue Operations (1 hafta)
- [ ] Split issue
- [ ] Convert issue type
- [ ] Merge issues
- [ ] Issue templates

### Phase 18: Advanced Board Features (1 hafta)
- [ ] Estimation poker
- [ ] Board wallboard mode
- [ ] Multi-project boards
- [ ] Personal boards

### Phase 19: Multi-tenancy (2-3 hafta)
- [ ] Organizations/Workspaces
- [ ] Cross-project dashboards
- [ ] Global automation rules
- [ ] Site-wide settings

### Phase 20: Mobile App (4-6 hafta)
- [ ] React Native app
- [ ] Offline support
- [ ] Push notifications
- [ ] Quick actions

---

## 📈 Progress Tracker

| Phase | Status | Start | End | Notes |
|-------|--------|-------|-----|-------|
| Phase 0 | ✅ Completed | 29 Kas | 29 Kas | Bug fix, security, in-use checks |
| Phase 1 | ✅ Completed | 30 Kas | 30 Kas | Event Bus, indexes, transaction |
| Phase 2 | ✅ Completed | 30 Kas | 30 Kas | Change history, LexoRank, reorder |
| Phase 3 | ✅ Completed | 30 Kas | 30 Kas | Workflow Engine, conditions, validators, post-functions |
| Phase 4 | ✅ Completed | 30 Kas | 30 Kas | BullMQ, Redis, workers, notification schemes |
| Phase 5 | ✅ Completed | 30 Kas | 30 Kas | Issue links, components, versions, labels, custom fields |
| Phase 6 | ⏳ Not Started | | | Time Tracking |
| Phase 7 | ⏳ Not Started | | | Board System |
| Phase 8 | ⏳ Not Started | | | Frontend Core |
| Phase 9 | ⏳ Not Started | | | Sprint & Reports |
| Phase 10 | ⏳ Not Started | | | Advanced Search |
| Phase 11 | ⏳ Not Started | | | Dashboards & Gadgets |
| Phase 12 | ⏳ Not Started | | | Automation Rules |
| Phase 13 | ⏳ Not Started | | | Screens System |
| Phase 14 | ⏳ Not Started | | | Advanced Permissions |
| Phase 15 | ⏳ Not Started | | | Integrations & API |

---

## 🎯 Karar Noktaları

| Milestone | Karar |
|-----------|-------|
| **Phase 9 sonrası** | MVP yeterli mi, yoksa Advanced'a devam mı? |
| **Phase 10 sonrası** | Full JQL gerekli mi, structured filter yeterli mi? |
| **Phase 12 sonrası** | Enterprise features gerekli mi? |
| **Phase 15 sonrası** | Mobile app, multi-tenancy gibi büyük özellikler? |

---

## 📅 Timeline Özeti

| Phase | Süre | Kümülatif |
|-------|------|-----------|
| Phase 0-4 | 3-4 hafta | 48% |
| Phase 5-7 | 2.5-3 hafta | 72% |
| Phase 8-9 | 8-10 hafta | **85% (MVP)** |
| Phase 10-12 | 10-11 hafta | **94%** |
| Phase 13-15 | 5-6 hafta | **97.5%** |
| Phase 16-20 | 8-12 hafta | **98-99%** |

**MVP:** ~10-12 hafta
**Full Parity:** ~6 ay

---

## 🔧 Teknik Kararlar

| Karar | Seçim | Neden |
|-------|-------|-------|
| Custom Fields | Hybrid EAV + JSONB + Cache | Esneklik + performans |
| Workflow Engine | Interpreter Pattern | Type-safe, extensible |
| Permissions | Hierarchical RBAC | Jira model, kanıtlanmış |
| History | ChangeGroups + ChangeItems | Field-level query |
| Ranking | LexoRank | No rebalancing |
| Notifications | Event Bus + BullMQ | Decoupled, async |
| Transactions | TX injection | Explicit, testable |
| DI | Lazy singleton factory | Simple, no deps |

---

*Son güncelleme: 30 Kasım 2025*
