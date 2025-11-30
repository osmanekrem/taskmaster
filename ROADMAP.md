# TaskMaster → Jira Full Feature Parity Roadmap

> Single-Tenant Deployment Model - Her kurulum = 1 şirket

---

## 📊 Özet Timeline

| Phase | Süre | Kümülatif | Jira % | Milestone |
|-------|------|-----------|--------|-----------|
| **0** | 1-2 hafta | 1-2 hafta | 68% | Stable |
| **1** | 2-3 hafta | 4-5 hafta | 72% | Clean Code |
| **2** | 2-3 hafta | 7-8 hafta | 76% | Data Integrity |
| **3** | 3-4 hafta | 11-12 hafta | 82% | **MVP** ✅ |
| **4** | 5-6 hafta | 17-18 hafta | 88% | Boards & Time |
| **5** | 5-6 hafta | 23-24 hafta | 93% | JQL & Dashboards |
| **6** | 6-8 hafta | 31-32 hafta | 96% | Automation |
| **7** | 4-5 hafta | 36-37 hafta | 98% | Enterprise Security |
| **8** | 8-12 hafta | 47-49 hafta | **100%** | Full Platform |

---

## 🔴 Phase 0: Kritik Hatalar (1-2 Hafta)

> **Hedef**: Stabilite - Devam etmeden ÖNCE şart

### 0.1 Schema Tutarsızlıkları
- [ ] ID type standardizasyonu (`text()` + `crypto.randomUUID()` everywhere)
  - `issue-links.ts` → `uuid()` yerine `text()`
  - `history.ts` → `uuid()` yerine `text()`
  - `workflow-transitions.ts` → `uuid()` yerine `text()`
  - `watchers.ts` → `uuid()` yerine `text()`
- [ ] Missing foreign keys in junction tables
  - `issue_components.issueId` → `.references(() => issues.id)`
  - `issue_labels.issueId` → `.references(() => issues.id)`
  - `issue_versions.issueId` → `.references(() => issues.id)`
- [ ] `issueLinkTypes.isSystem` type fix (`text` → `boolean`)
- [ ] Timestamp `.notNull()` consistency (workflows, statuses)

### 0.2 Workflow Engine Critical
- [ ] Global `pendingChanges` state → WorkflowEngine instance'a taşı
  - Dosya: `apps/server/src/engine/workflow/post-functions.ts` L41-45
  - Problem: Concurrent request'lerde race condition
- [ ] Thread-safe execution context

### 0.3 Storage
- [ ] Attachment file deletion implement
  - Dosya: `apps/server/src/routers/comments.ts` L241
  - `// TODO: Delete actual file from storage`

### 0.4 Production Foundations
- [ ] Health check endpoint (`/health`, `/ready`)
- [ ] Graceful shutdown handling
- [ ] Structured JSON logging (pino)
- [ ] Environment validation on startup

**✅ Phase 0 Tamamlandı Kriteri**: Zero critical bugs, schema consistent, health checks working

---

## 🔴 Phase 1: Pattern Standardizasyonu (2-3 Hafta)

> **Hedef**: Maintainability - Gelecek geliştirmeler için şart

### 1.1 Repository Pattern
- [ ] Base repository class oluştur:
  ```typescript
  // apps/server/src/repositories/base-repository.ts
  abstract class BaseRepository<T> {
    findById(id: string): Promise<T | null>
    create(data: CreateInput): Promise<T>
    update(id: string, data: UpdateInput): Promise<T>
    softDelete(id: string): Promise<void>
    count(where?: SQL): Promise<number>
  }
  ```
- [ ] `workflowRepository` → class'a çevir (şu an factory function)
- [ ] `commentRepository` → class'a çevir
- [ ] `labelRepository` → class'a çevir
- [ ] `componentRepository` → class'a çevir
- [ ] Transaction support tüm repository'lerde

### 1.2 Permission Fixes
- [ ] `issue-links.ts` L262 → delete permission check ekle
- [ ] `fields.ts` → project context ekle
- [ ] `versions.ts` → project ownership check ekle
- [ ] `statuses.ts` → getById project check

### 1.3 Workflow Handlers (10+ TODO)
- [ ] `userInProjectRoleHandler` (conditions.ts L26-35)
  - PermissionService inject et
  - `return { passed: false }` → gerçek kontrol
- [ ] `userHasPermissionHandler` (conditions.ts L63-72)
  - PermissionService inject et
- [ ] `previousStatusHandler` (conditions.ts L102-117)
  - IssueRepository inject et
- [ ] `separationOfDutiesHandler` (conditions.ts L119-129)
  - History query implement et
- [ ] `triggerWebhookHandler` (post-functions.ts L348-357)
  - HTTP client implement et
- [ ] `sendNotificationHandler` (post-functions.ts L359-374)
  - NotificationService inject et
- [ ] `updateParentStatusHandler` (post-functions.ts L376-395)
  - Parent lookup logic
- [ ] `createSubtaskHandler` (post-functions.ts L397-408)
  - IssueService inject et

### 1.4 Deletion Validations
- [ ] `projects.ts` L135 → `// TODO: Check if project has issues`
- [ ] `projects.ts` L257 → `// TODO: Check if issue type has issues`

### 1.5 Field Value Validation
- [ ] `issues.ts` L529 → `validateFieldValueByType()` implement
  - Her field type için validation rules
  - Config'e göre required/optional check

### 1.6 Infrastructure Middleware
- [ ] Rate limiting middleware (per user, per IP)
  ```typescript
  // Configurable limits
  { windowMs: 60000, max: 100 } // 100 req/min default
  { windowMs: 60000, max: 1000 } // authenticated users
  ```
- [ ] Request logging middleware (method, path, duration, status)
- [ ] Error tracking integration (Sentry)
- [ ] Request ID propagation (X-Request-ID header)

**✅ Phase 1 Tamamlandı Kriteri**: All patterns consistent, no TODO in critical paths, rate limiting active

---

## 🟠 Phase 2: Data Integrity (2-3 Hafta)

> **Hedef**: Enterprise-grade data layer

### 2.1 Soft Delete & Archive Pattern
- [ ] Migration: `deletedAt` column tüm tablolara
  ```sql
  ALTER TABLE issues ADD COLUMN deleted_at TIMESTAMP;
  ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;
  ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMP;
  -- ... tüm tablolar
  ```
- [ ] Migration: `archivedAt` column (issues, projects)
  ```sql
  ALTER TABLE issues ADD COLUMN archived_at TIMESTAMP;
  ALTER TABLE projects ADD COLUMN archived_at TIMESTAMP;
  ```
- [ ] Base repository `softDelete()` method
- [ ] Query middleware: auto `WHERE deleted_at IS NULL`
- [ ] Archive vs Delete UI distinction

### 2.2 Audit Fields
- [ ] Migration: `createdBy`, `updatedBy` tüm tablolara
- [ ] `issue_types` → timestamps ekle
- [ ] `templates` → `createdById` ekle
- [ ] Auto-populate middleware for audit fields

### 2.3 Indexes
```sql
-- apps/server/src/db/migrations/add-indexes.sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_change_items_group ON change_items(change_group_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_project_role_members ON project_role_members(project_id, user_id);
CREATE INDEX idx_issue_field_values_gin ON issue_field_values USING GIN(value);
CREATE INDEX idx_issues_summary_trgm ON issues USING GIN(summary gin_trgm_ops);
```

### 2.4 User Groups
```sql
-- Schema
user_groups: id, name, description, createdAt, updatedAt
user_group_members: id, groupId, userId, addedAt, addedBy
```
- [ ] `apps/server/src/db/schema/groups.ts` oluştur
- [ ] `apps/server/src/repositories/group-repository.ts`
- [ ] `apps/server/src/routers/groups.ts`
- [ ] Permission assignment via groups

### 2.5 Notification Worker Fixes
- [ ] `notification-worker.ts` L170 → user email preferences check
- [ ] i18n support (en, tr locale files)
- [ ] HTML templates → `apps/server/src/templates/email/`

**✅ Phase 2 Tamamlandı Kriteri**: Full audit trail, groups working, soft delete active

---

## 🟠 Phase 3: API & Issue Completeness (3-4 Hafta)

> **Hedef**: Full feature API - **MVP READY**

### 3.1 Missing Endpoints
- [ ] `cloneIssue`
  ```typescript
  // Input: { issueId, options: { includeSubtasks, includeLinks, includeAttachments } }
  // 1. Deep copy issue
  // 2. New key generation
  // 3. Optional: clone subtasks, links, attachments
  ```
- [ ] `moveIssueToProject`
  ```typescript
  // Input: { issueId, targetProjectId, fieldMapping }
  // 1. Validate target project
  // 2. Map fields (status, issue type, custom fields)
  // 3. Update issue
  // 4. Handle subtasks
  ```
- [ ] `bulkUpdateIssues`
- [ ] `bulkTransitionIssues`
- [ ] `bulkDeleteIssues`
- [ ] `getProjectMembers`
- [ ] `reorderSprints`

### 3.2 Issue Voting
```sql
-- Schema
issue_votes: id, issueId, userId, createdAt
issues += voteCount (denormalized cache)
```
- [ ] `apps/server/src/db/schema/votes.ts`
- [ ] Vote/unvote endpoints
- [ ] Vote count sync trigger
- [ ] "Most voted" filter in issue queries

### 3.3 Issue Templates
```sql
-- Schema
issue_templates: id, projectId, name, issueTypeId, summary, description, fieldValues (JSONB), isDefault, createdBy, createdAt
```
- [ ] Template CRUD
- [ ] Create issue from template endpoint
- [ ] Default template per issue type

### 3.4 Priority Entity
```sql
-- Schema (replace custom field approach)
priorities: id, name, description, color, iconUrl, sortOrder, isDefault, createdAt
issues.priorityId → priorities.id (migration from custom field)
```
- [ ] Priority CRUD
- [ ] Migration: existing priority field → priorities table
- [ ] Default priorities seed (Highest, High, Medium, Low, Lowest)

### 3.5 Event System Expansion
- [ ] `FieldValueChanged` → `{ issueId, fieldId, oldValue, newValue, userId }`
- [ ] `IssueMovedToEpic` → `{ issueId, oldEpicId, newEpicId, userId }`
- [ ] `ParentChanged` → `{ issueId, oldParentId, newParentId, userId }`
- [ ] `UserMentioned` → `{ issueId, commentId, mentionedUserId, mentionerId }`
- [ ] `IssueVoted` → `{ issueId, userId, action: 'vote' | 'unvote' }`

### 3.6 Error Handling Standardization
```typescript
// apps/server/src/lib/errors/index.ts
export const throwNotFoundError = (code: string, meta?: object) => {...}
export const throwForbiddenError = (code: string, meta?: object) => {...}
export const throwConflictError = (code: string, meta?: object) => {...}
export const throwValidationError = (code: string, meta?: object) => {...}
export const throwBusinessError = (code: string, meta?: object) => {...}
```
- [ ] Migrate all `createAppError` calls to helpers
- [ ] Add missing error codes to constants

### 3.7 Repository Methods
- [ ] `IssueRepository.findByAssignee(userId, filters)`
- [ ] `IssueRepository.findOverdue(projectId?)`
- [ ] `ProjectRepository.findByMember(userId)`
- [ ] `SprintRepository.getVelocityHistory(projectId, count)`
- [ ] `IssueRepository.findMostVoted(projectId, limit)`
- [ ] `NotificationRepository.deleteOldNotifications(olderThan)`

**✅ Phase 3 Tamamlandı Kriteri**: All CRUD complete, voting/templates working = **MVP** 🎉

---

## 🟡 Phase 4: Boards & Time Tracking (5-6 Hafta)

> **Hedef**: Jira-level agile boards

### 4.1 Board System

#### Schema
```sql
-- apps/server/src/db/schema/boards.ts

boards:
  id, projectId, name, type ('scrum' | 'kanban'),
  filterJql, isDefault, settings (JSONB), createdBy, createdAt

board_columns:
  id, boardId, name, statusIds (text[]), position,
  minLimit (WIP min), maxLimit (WIP max)

board_swimlanes:
  id, boardId, type ('none' | 'assignee' | 'epic' | 'priority' | 'issueType' | 'custom'),
  customFieldId (nullable), defaultCollapsed

board_quick_filters:
  id, boardId, name, jql, isDefault, position

board_card_layout:
  id, boardId, fields (text[]), showDaysInColumn, showEstimate, showPriority
```

#### Implementation
- [ ] Board CRUD router
- [ ] Column management
  - [ ] Status mapping (multiple statuses per column)
  - [ ] Column reordering
  - [ ] WIP limit enforcement (warning/block)
- [ ] Swimlane configuration
  - [ ] By assignee
  - [ ] By epic
  - [ ] By priority
  - [ ] By custom field
- [ ] Quick filters
  - [ ] JQL-based filters
  - [ ] Toggle on/off
- [ ] Card layout
  - [ ] Configurable fields
  - [ ] Days in column indicator
- [ ] Card colors
  - [ ] By priority
  - [ ] By issue type
  - [ ] Custom rules
- [ ] Board views
  - [ ] Backlog view (Scrum)
  - [ ] Active sprint view (Scrum)
  - [ ] Kanban continuous flow

### 4.2 Time Tracking

#### Schema
```sql
-- apps/server/src/db/schema/worklogs.ts

worklogs:
  id, issueId, userId, timeSpentSeconds, startedAt,
  description, createdAt, updatedAt, deletedAt

-- Add to issues table
issues += originalEstimateSeconds, remainingEstimateSeconds, timeSpentSeconds
```

#### Implementation
- [ ] Worklog CRUD
  - [ ] Log work (time, date, description)
  - [ ] Edit worklog (own only or admin)
  - [ ] Delete worklog
- [ ] Time calculations
  - [ ] Auto-update `timeSpentSeconds` on issue
  - [ ] Auto-adjust `remainingEstimateSeconds` option
- [ ] Time tracking reports
  - [ ] By user
  - [ ] By project
  - [ ] By date range
  - [ ] Export to CSV

### 4.3 Screens System

#### Schema
```sql
screens:
  id, name, description, createdAt

screen_tabs:
  id, screenId, name, position

screen_tab_fields:
  id, tabId, fieldId, position, isRequired

screen_schemes:
  id, name, description

screen_scheme_items:
  id, schemeId, issueTypeId, operationType ('create' | 'edit' | 'view'),
  screenId
```

#### Implementation
- [ ] Screen builder
- [ ] Screen schemes per issue type
- [ ] Transition screen assignment (workflow_transitions.screenId)

### 4.4 Sprint Enhancements

#### Schema
```sql
sprint_retrospectives:
  id, sprintId, wentWell (text), needsImprovement (text),
  actionItems (JSONB), createdBy, createdAt
```

#### Implementation
- [ ] Retrospective notes CRUD
- [ ] Sprint comparison report
- [ ] Velocity chart endpoint
  - [ ] Committed vs completed points
  - [ ] Historical trend

### 4.5 Field Additions
- [ ] Radio button field type
- [ ] Field context per project (not just issue type)
  - [ ] `field_contexts` table
  - [ ] Context-specific configuration

**✅ Phase 4 Tamamlandı Kriteri**: Full boards, time tracking, screens working

---

## 🟡 Phase 5: Search, Filters & Dashboards (5-6 Hafta)

> **Hedef**: Jira-level search and reporting

### 5.1 Query Language (JQL)

#### Package Structure
```
packages/query-language/
├── src/
│   ├── lexer.ts          # Tokenization
│   ├── parser.ts         # Chevrotain grammar
│   ├── ast.ts            # AST type definitions
│   ├── transformer.ts    # AST → Drizzle SQL
│   ├── validator.ts      # Field/value validation
│   ├── autocomplete.ts   # Suggestions for UI
│   ├── functions.ts      # Built-in functions
│   └── index.ts
├── package.json
└── tsconfig.json
```

#### Supported Syntax
```
# Basic
project = "PROJ"
status = "In Progress"
assignee = john@example.com

# Operators
priority IN (High, Critical)
created >= -7d
storyPoints > 5

# Functions
assignee = currentUser()
sprint IN openSprints()
created >= startOfMonth()
updated <= now()

# Logical
project = "PROJ" AND status != "Done"
priority = High OR priority = Critical
NOT status = "Done"

# Ordering
ORDER BY created DESC, priority ASC

# Text search
summary ~ "bug"
description ~ "error*"
```

#### Implementation
- [ ] Lexer (tokenize JQL string)
- [ ] Parser (Chevrotain grammar → AST)
- [ ] Transformer (AST → Drizzle query)
- [ ] Validator (field existence, type checking)
- [ ] Autocomplete (suggestions for UI)
- [ ] Built-in functions
  - [ ] `currentUser()`
  - [ ] `openSprints()`, `closedSprints()`, `futureSprints()`
  - [ ] `now()`, `startOfDay()`, `startOfWeek()`, `startOfMonth()`
  - [ ] `membersOf(role)`

### 5.2 Saved Filters

#### Schema
```sql
saved_filters:
  id, ownerId, name, jql, description,
  isFavorite, shareType ('private' | 'project' | 'global'),
  createdAt, updatedAt

filter_shares:
  id, filterId, projectId (nullable), userId (nullable)
  -- projectId set = shared with project
  -- userId set = shared with user

filter_subscriptions:
  id, filterId, userId, frequency ('daily' | 'weekly'),
  lastSentAt, nextScheduledAt

user_recent_filters:
  id visibleUserId, filterId, accessedAt
```

#### Implementation
- [ ] Filter CRUD
- [ ] Filter sharing
  - [ ] Private (owner only)
  - [ ] Project (all project members)
  - [ ] Global (all users)
- [ ] Filter subscriptions
  - [ ] Email when results change
  - [ ] Daily/weekly schedule
- [ ] Favorite filters
- [ ] Recent filters tracking
- [ ] Filter result count preview

### 5.3 Dashboards

#### Schema
```sql
dashboards:
  id, ownerId, name, description, isDefault,
  shareType ('private' | 'project' | 'global'),
  layout (JSONB), createdAt, updatedAt

dashboard_gadgets:
  id, dashboardId, gadgetType, title,
  positionX, positionY, width, height,
  config (JSONB), createdAt
```

#### Layout Format
```json
{
  "columns": 12,
  "gadgets": [
    { "id": "g1", "x": 0, "y": 0, "w": 6, "h": 4 },
    { "id": "g2", "x": 6, "y": 0, "w": 6, "h": 4 }
  ]
}
```

#### Built-in Gadgets (10)

| Gadget | Config | Description |
|--------|--------|-------------|
| `filter-results` | `{ filterId, columns, maxResults }` | Issue list from filter |
| `assigned-to-me` | `{ maxResults, showProject }` | Current user's issues |
| `activity-stream` | `{ projectId?, maxResults }` | Recent activity |
| `pie-chart` | `{ filterId, field }` | Distribution by field |
| `created-vs-resolved` | `{ projectId, period }` | Issue flow chart |
| `sprint-burndown` | `{ sprintId }` | Burndown chart |
| `sprint-health` | `{ sprintId }` | Sprint progress |
| `watched-issues` | `{ maxResults }` | Watched issues |
| `voted-issues` | `{ maxResults }` | Voted issues |
| `two-dimensional` | `{ filterId, xAxis, yAxis }` | Heat map |

#### Implementation
- [ ] Dashboard CRUD
- [ ] Dashboard sharing
- [ ] Gadget library
- [ ] Gadget drag-drop layout (react-grid-layout)
- [ ] Gadget configuration modal
- [ ] Default dashboard setting

### 5.4 Advanced Notifications

#### Schema
```sql
notification_digests:
  id, userId, frequency ('daily' | 'weekly'),
  preferredTime, timezone, lastSentAt, nextScheduledAt
```

#### Implementation
- [ ] Email digest job (BullMQ scheduled)
  - [ ] Aggregate notifications since last digest
  - [ ] Group by project/issue
  - [ ] HTML email template
- [ ] Real-time WebSocket
  - [ ] Socket.io or native WebSocket
  - [ ] Notification badge update
  - [ ] Toast notifications
- [ ] Notification batching
  - [ ] Group similar notifications
  - [ ] "5 comments on PROJ-123"

### 5.5 Search Enhancements
- [ ] Full-text search with `pg_trgm`
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_issues_search ON issues 
    USING GIN((summary || ' ' || COALESCE(description, '')) gin_trgm_ops);
  ```
- [ ] Search autocomplete
  - [ ] Recent searches
  - [ ] Popular filters
  - [ ] Field suggestions
- [ ] Search result highlighting

**✅ Phase 5 Tamamlandı Kriteri**: JQL working, dashboards with 10 gadgets, real-time notifications

---

## 🟢 Phase 6: Automation & Admin (6-8 Hafta)

> **Hedef**: No-code automation, full audit

### 6.1 Automation Engine

#### Schema
```sql
automation_rules:
  id, projectId (nullable = global), name, description,
  isEnabled, trigger (JSONB), conditions (JSONB), actions (JSONB),
  createdBy, createdAt, updatedAt

automation_executions:
  id, ruleId, issueId (nullable), status ('success' | 'failed' | 'skipped'),
  executedAt, durationMs, errorMessage

automation_execution_logs:
  id, executionId, step, type ('trigger' | 'condition' | 'action'),
  status, message, data (JSONB), timestamp
```

#### Trigger Types
```typescript
type AutomationTrigger =
  | { type: 'issue_created' }
  | { type: 'issue_updated', fields?: string[] }
  | { type: 'issue_transitioned', from?: string[], to?: string[] }
  | { type: 'field_changed', fieldId: string }
  | { type: 'comment_added' }
  | { type: 'sprint_started' }
  | { type: 'sprint_completed' }
  | { type: 'scheduled', cron: string }
  | { type: 'manual' }
```

#### Condition Types
```typescript
type AutomationCondition =
  | { type: 'field_equals', fieldId: string, value: any }
  | { type: 'field_changed_to', fieldId: string, value: any }
  | { type: 'user_in_role', roleId: string }
  | { type: 'issue_type_is', issueTypeId: string }
  | { type: 'jql_matches', jql: string }
  | { type: 'and', conditions: AutomationCondition[] }
  | { type: 'or', conditions: AutomationCondition[] }
```

#### Action Types
```typescript
type AutomationAction =
  | { type: 'set_field', fieldId: string, value: any }
  | { type: 'transition_issue', statusId: string }
  | { type: 'assign_issue', userId: string | 'reporter' | 'lead' }
  | { type: 'add_comment', content: string }
  | { type: 'send_email', to: string[], subject: string, body: string }
  | { type: 'trigger_webhook', url: string, method: string, body?: object }
  | { type: 'create_subtask', summary: string, issueTypeId: string }
  | { type: 'link_issues', targetIssueId: string, linkTypeId: string }
  | { type: 'add_label', labelId: string }
  | { type: 'log_work', timeSpent: number, description?: string }
```

#### Implementation
- [ ] Rule CRUD
- [ ] Rule builder UI components
- [ ] Trigger listener integration (event system)
- [ ] Condition evaluator
- [ ] Action executor
- [ ] Execution history view
- [ ] Detailed logs per execution
- [ ] Rule testing (dry run)
- [ ] Scheduled trigger (cron via BullMQ)
- [ ] Manual trigger button on issues

### 6.2 Audit Log

#### Schema
```sql
audit_logs:
  id, userId, action, entityType, entityId, entityName,
  oldValue (JSONB), newValue (JSONB),
  ipAddress, userAgent, sessionId,
  createdAt

-- Partitioned by month for performance
-- CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs ...
```

#### Implementation
- [ ] Audit middleware/interceptor
- [ ] Logged operations:
  - [ ] All CRUD (create, update, delete)
  - [ ] Permission changes
  - [ ] Role assignments
  - [ ] Login/logout
  - [ ] Configuration changes
  - [ ] Failed login attempts
- [ ] Audit log viewer
  - [ ] Filter by user, entity, action, date
  - [ ] Search in changes
- [ ] Export to CSV
- [ ] Retention policy (configurable)

### 6.3 API Tokens

#### Schema
```sql
api_tokens:
  id visibleUserId, name, tokenHash, tokenPrefix (first 8 chars for display),
  scopes (text[]), -- ['read', 'write', 'admin']
  lastUsedAt, lastUsedIp,
  expiresAt, createdAt, revokedAt
```

#### Implementation
- [ ] Token generation (show once)
- [ ] Token listing (masked)
- [ ] Token revocation
- [ ] Scope-based authorization
- [ ] Rate limiting per token
- [ ] Usage statistics

### 6.4 Webhooks

#### Schema
```sql
webhooks:
  id, projectId (nullable = global), name, url,
  secret, events (text[]), isActive,
  createdBy, createdAt

webhook_deliveries:
  id, webhookId, event, payload (JSONB),
  requestHeaders (JSONB), responseCode,
  responseBody (text), responseHeaders (JSONB),
  deliveredAt, durationMs, retryCount, nextRetryAt
```

#### Implementation
- [ ] Webhook CRUD UI
- [ ] Event selection (checkboxes)
- [ ] Secret generation
- [ ] Signature header (HMAC-SHA256)
- [ ] Delivery logs
- [ ] Retry logic (exponential backoff, max 5 retries)
- [ ] Manual retry button
- [ ] Webhook testing (send test payload)

### 6.5 System Settings

#### Schema
```sql
system_settings:
  id, key, value (JSONB), description,
  updatedBy, updatedAt

-- Example keys:
-- 'default.project.notificationScheme'
-- 'default.project.permissionScheme'
-- 'upload.maxFileSizeMb'
-- 'session.timeoutMinutes'
-- 'password.minLength'
-- 'password.requireSpecialChar'
```

#### Implementation
- [ ] Settings CRUD (admin only)
- [ ] Settings UI grouped by category
- [ ] Settings validation
- [ ] Settings cache (Redis)

### 6.6 Project Types & Categories

#### Schema
```sql
project_types:
  id, name, description, icon,
  defaultWorkflowId, defaultIssueTypeSchemeId,
  defaultScreenSchemeId, defaultNotificationSchemeId,
  createdAt

project_categories:
  id, name, description, color, createdAt

-- Add to projects table
projects += typeId, categoryId
```

#### Implementation
- [ ] Project type CRUD
- [ ] Project category CRUD
- [ ] Filter projects by category
- [ ] Type-specific defaults when creating project

### 6.7 Caching & Performance
- [ ] Redis caching layer
  - [ ] Permission cache (user permissions per project)
  - [ ] System settings cache
  - [ ] Session cache
- [ ] Cache invalidation strategy
- [ ] Database query logging (slow query detection)
- [ ] Connection pool monitoring

### 6.8 Monitoring & Observability
- [ ] Prometheus metrics endpoint (`/metrics`)
  ```typescript
  // Metrics to track
  - http_requests_total
  - http_request_duration_seconds
  - db_query_duration_seconds
  - queue_jobs_total
  - active_users_gauge
  ```
- [ ] Custom business metrics
  - [ ] Issues created per day
  - [ ] Active sprints
  - [ ] Automation rule executions
- [ ] Grafana dashboard templates

**✅ Phase 6 Tamamlandı Kriteri**: Automation rules working, full audit trail, webhooks active, caching operational, metrics exposed

---

## 🟢 Phase 7: Enterprise Security (4-5 Hafta)

> **Hedef**: Enterprise-grade security features

### 7.1 SSO Integration

#### Schema
```sql
sso_configuration:
  id, provider ('saml' | 'oidc'),
  displayName, config (JSONB),
  isEnabled, isEnforced, -- enforced = SSO only, no password login
  createdAt, updatedAt

-- SAML config:
{
  "entityId": "https://taskmaster.example.com",
  "assertionConsumerServiceUrl": "https://taskmaster.example.com/auth/saml/callback",
  "idpMetadataUrl": "https://idp.example.com/metadata",
  "idpCertificate": "-----BEGIN CERTIFICATE-----...",
  "attributeMapping": {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "firstName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "lastName": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
  }
}

-- OIDC config:
{
  "issuer": "https://accounts.google.com",
  "clientId": "xxx.apps.googleusercontent.com",
  "clientSecret": "xxx",
  "scopes": ["openid", "email", "profile"],
  "attributeMapping": { ... }
}
```

#### Implementation
- [ ] SSO configuration UI
- [ ] SAML 2.0 implementation
  - [ ] SP metadata generation
  - [ ] IdP metadata import
  - [ ] Assertion validation
- [ ] OIDC implementation
  - [ ] Discovery document fetch
  - [ ] Authorization code flow
  - [ ] Token validation
- [ ] Just-in-time provisioning
  - [ ] Create user on first SSO login
  - [ ] Update user attributes on login
- [ ] SSO enforcement option
- [ ] Multiple IdP support (for different user groups)

### 7.2 Issue Security Levels

#### Schema
```sql
issue_security_schemes:
  id, name, description, createdAt

security_levels:
  id, schemeId, name, description, sortOrder

security_level_members:
  id, levelId, type ('user' | 'group' | 'role' | 'reporter' | 'assignee' | 'lead'),
  userId (nullable), groupId (nullable), roleId (nullable)

-- Add to issues
issues += securityLevelId

-- Add to projects
projects += issueSecuritySchemeId
```

#### Implementation
- [ ] Security scheme CRUD
- [ ] Security level CRUD
- [ ] Level member management
- [ ] Issue visibility check middleware
- [ ] Set security level on issue
- [ ] Default security level per issue type

### 7.3 Advanced Permissions
- [ ] Object-level permission checks
  ```typescript
  // Before: Can user edit ANY issue?
  hasPermission(userId, 'issue:edit', projectId)
  
  // After: Can user edit THIS issue?
  canEditIssue(userId, issueId) // checks security level, ownership, etc.
  ```
- [ ] Permission inheritance
  - [ ] Project → Issue type → Issue
- [ ] Custom permission creation
- [ ] IP allowlisting
  ```sql
  ip_allowlist:
    id, cidr, description, isEnabled, createdAt
  ```

### 7.4 Backup & Restore

#### Implementation
- [ ] Database backup endpoint (admin)
  - [ ] pg_dump wrapper
  - [ ] Attachments inclusion option
- [ ] Scheduled backups (cron)
- [ ] Backup storage (local / S3)
- [ ] Restore from backup
- [ ] Backup encryption option

### 7.5 Storage Abstraction
- [ ] File storage provider interface
  ```typescript
  interface StorageProvider {
    upload(key: string, data: Buffer): Promise<string>
    download(key: string): Promise<Buffer>
    delete(key: string): Promise<void>
    getSignedUrl(key: string, expiresIn: number): Promise<string>
  }
  ```
- [ ] Local filesystem provider
- [ ] AWS S3 provider
- [ ] Google Cloud Storage provider (optional)
- [ ] Storage provider selection via config

### 7.6 Email Provider Abstraction
- [ ] Email provider interface
  ```typescript
  interface EmailProvider {
    send(options: EmailOptions): Promise<void>
  }
  ```
- [ ] Resend provider (current)
- [ ] AWS SES provider
- [ ] SMTP provider (generic)
- [ ] Provider selection via config

### 7.7 API Layer
- [ ] REST/OpenAPI public API layer
  - [ ] `/api/v1/issues` - Issue CRUD
  - [ ] `/api/v1/projects` - Project CRUD
  - [ ] `/api/v1/users` - User management
  - [ ] `/api/v1/webhooks` - Webhook management
- [ ] OpenAPI spec generation
- [ ] API documentation (Swagger UI)
- [ ] API versioning strategy

**✅ Phase 7 Tamamlandı Kriteri**: SSO working, security levels enforced, backups automated, storage/email abstracted, public API available

---

## 🔵 Phase 8: Ecosystem (8-12 Hafta)

> **Hedef**: Full platform with integrations

### 8.1 Git Integration

#### Schema
```sql
git_repositories:
  id, projectId, provider ('github' | 'gitlab' | 'bitbucket'),
  repoFullName, -- 'owner/repo'
  accessToken (encrypted), webhookSecret,
  isEnabled, createdAt

git_branches:
  id, repoId, issueId, branchName,
  status ('open' | 'merged' | 'deleted'),
  createdAt, updatedAt

git_commits:
  id, repoId, issueId,
  sha, message, authorName, authorEmail,
  committedAt, createdAt

git_pull_requests:
  id, repoId, issueId,
  prNumber, title, description,
  status ('open' | 'merged' | 'closed'),
  sourceBranch, targetBranch,
  url, authorName,
  createdAt, updatedAt
```

#### Implementation
- [ ] Repository connection OAuth
  - [ ] GitHub App
  - [ ] GitLab OAuth
  - [ ] Bitbucket OAuth
- [ ] Webhook receiver
  - [ ] Push events → commit linking
  - [ ] PR events → PR tracking
- [ ] Branch creation from issue
  - [ ] `git checkout -b PROJ-123-issue-summary`
- [ ] Commit linking (via issue key in message)
  - [ ] Parse `PROJ-123` from commit message
- [ ] Development panel on issue
  - [ ] Linked branches
  - [ ] Linked commits
  - [ ] Linked PRs with status

### 8.2 Slack Integration

#### Schema
```sql
slack_installation:
  id, teamId, teamName,
  accessToken (encrypted), botToken (encrypted),
  installedBy, createdAt

slack_channel_links:
  id, installationId, projectId,
  channelId, channelName,
  events (text[]), -- ['issue_created', 'comment_added', ...]
  createdAt
```

#### Implementation
- [ ] Slack App configuration
- [ ] OAuth installation flow
- [ ] Channel linking
- [ ] Event notifications
  - [ ] Issue created
  - [ ] Issue transitioned
  - [ ] Comment added
  - [ ] Mention in Slack → comment in TaskMaster
- [ ] Slash commands
  - [ ] `/taskmaster create` → create issue modal
  - [ ] `/taskmaster search <query>` → search issues
- [ ] Issue unfurling (paste link → preview)

### 8.3 Import/Export

#### CSV Import
- [ ] File upload
- [ ] Column mapping UI
  - [ ] TaskMaster field ↔ CSV column
  - [ ] Value mapping (status names, etc.)
- [ ] Validation preview
- [ ] Error handling (partial import)
- [ ] Import history

#### Jira Import
- [ ] Jira Cloud API connection
- [ ] Project selection
- [ ] Field mapping
  - [ ] Standard fields
  - [ ] Custom fields
  - [ ] Status mapping
- [ ] Attachment migration
- [ ] Comment migration
- [ ] History migration (optional)
- [ ] Progress tracking

#### Export
- [ ] Project export (JSON)
  - [ ] Configuration
  - [ ] Issues
  - [ ] Attachments (optional)
  - [ ] History (optional)
- [ ] Issue export
  - [ ] CSV (configurable columns)
  - [ ] Excel
  - [ ] PDF (single issue view)

### 8.4 Advanced Reporting

#### Velocity Chart
```typescript
// Data structure
{
  sprints: [
    { name: 'Sprint 1', committed: 21, completed: 18 },
    { name: 'Sprint 2', committed: 24, completed: 22 },
    // ...
  ],
  averageVelocity: 20
}
```

#### Cumulative Flow Diagram
```typescript
// Data per day
{
  dates: ['2025-01-01', '2025-01-02', ...],
  series: {
    'To Do': [10, 12, 11, ...],
    'In Progress': [5, 4, 6, ...],
    'Done': [2, 4, 5, ...]
  }
}
```

#### Control Chart
```typescript
// Per issue
{
  issues: [
    { key: 'PROJ-1', cycleTime: 3.5, leadTime: 5.2 },
    { key: 'PROJ-2', cycleTime: 2.1, leadTime: 4.0 },
    // ...
  ],
  rollingAverage: {
    cycleTime: [3.2, 3.1, 3.0, ...],
    leadTime: [4.8, 4.7, 4.6, ...]
  }
}
```

#### Custom Report Builder
- [ ] Dimension selection (x-axis: project, assignee, type, etc.)
- [ ] Metric selection (count, sum of points, avg cycle time, etc.)
- [ ] Filter (JQL)
- [ ] Chart type (bar, line, pie, table)
- [ ] Save report
- [ ] Share report

### 8.5 Mobile App

#### Technology
- React Native with Expo
- React Query for data fetching
- Same tRPC client

#### Features
- [ ] Authentication
- [ ] Project list
- [ ] Issue list with filters
- [ ] Issue detail & edit
- [ ] Board view (swipe to transition)
- [ ] Comments & mentions
- [ ] Push notifications
- [ ] Offline read support
- [ ] Quick actions (log work, transition, assign)

### 8.6 UI/UX Enhancements

#### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `c` | Create issue |
| `g b` | Go to board |
| `g p` | Go to projects |
| `g d` | Go to dashboard |
| `/` | Focus search |
| `?` | Show shortcuts |
| `j/k` | Navigate list |
| `Enter` | Open selected |
| `Esc` | Close modal |

#### Other Enhancements
- [ ] Inline editing on issue list
- [ ] Quick actions dropdown
- [ ] Attachment preview (images, PDFs)
- [ ] Drag-drop file upload
- [ ] Keyboard navigation in lists
- [ ] Command palette (`Cmd+K`)

### 8.7 Service Desk Module (Opsiyonel)

#### Schema
```sql
service_desk_config:
  id, projectId, portalName, portalDescription,
  portalLogo, primaryColor,
  allowAnonymousRequests, createdAt

request_types:
  id, projectId, name, description, issueTypeId,
  icon, fields (JSONB), helpText, sortOrder

sla_policies:
  id, projectId, name, description,
  conditions (JSONB), -- when does this SLA apply
  goals (JSONB), -- { firstResponse: 4h, resolution: 24h }
  calendar ('24x7' | 'business_hours')

sla_tracking:
  id, issueId, policyId,
  firstResponseAt, breachedFirstResponse,
  resolvedAt, breachedResolution,
  pausedDuration, -- time while paused

customer_portal_users:
  id, email, name, company, isVerified, createdAt
```

#### Implementation
- [ ] Customer portal (separate frontend)
- [ ] Request type configuration
- [ ] SLA policy configuration
- [ ] SLA tracking on issues
- [ ] SLA breach notifications
- [ ] Queue management view
- [ ] Customer organizations

**✅ Phase 8 Tamamlandı Kriteri**: Git integration, Slack, import/export, mobile app = **100% Jira** 🎉

---

## 📋 Phase Tamamlama Checklist

### Phase 0 ✅
- [ ] All IDs use `text()` pattern
- [ ] All foreign keys defined
- [ ] No critical race conditions
- [ ] Attachment storage working
- [ ] Health check endpoints responding
- [ ] Graceful shutdown implemented

### Phase 1 ✅
- [ ] All repositories use class pattern
- [ ] Base repository in use
- [ ] All permission checks implemented
- [ ] All workflow handlers working
- [ ] Rate limiting active
- [ ] Request logging operational
- [ ] Error tracking configured

### Phase 2 ✅
- [ ] Soft delete on all tables
- [ ] Archive functionality working
- [ ] All audit fields populated
- [ ] User groups functional

### Phase 3 ✅ (MVP)
- [ ] Clone/move/bulk operations working
- [ ] Voting system working
- [ ] Issue templates working
- [ ] Priority entity working

### Phase 4 ✅
- [ ] Boards with columns, swimlanes, WIP
- [ ] Time tracking with worklogs
- [ ] Screens system working
- [ ] Sprint retrospectives

### Phase 5 ✅
- [ ] JQL parser working
- [ ] Saved filters with sharing
- [ ] Dashboards with 10 gadgets
- [ ] Real-time notifications

### Phase 6 ✅
- [ ] Automation rules executing
- [ ] Full audit log
- [ ] API tokens working
- [ ] Webhooks delivering
- [ ] Redis caching operational
- [ ] Prometheus metrics exposed
- [ ] Slow query logging active

### Phase 7 ✅
- [ ] SSO (SAML/OIDC) working
- [ ] Security levels enforced
- [ ] Backups automated
- [ ] Storage abstraction (S3/Local) working
- [ ] Email provider abstraction working
- [ ] Public REST API documented

### Phase 8 ✅
- [ ] Git integration active
- [ ] Slack notifications working
- [ ] Import from Jira working
- [ ] Mobile app published

---

## 🎯 Milestone Markers

| Milestone | Phase | Target Users |
|-----------|-------|--------------|
| **Alpha** | 0-1 | Internal testing |
| **Beta** | 2-3 | Early adopters |
| **v1.0 GA** | 4 | Small teams |
| **v2.0** | 5-6 | Growing teams |
| **Enterprise** | 7 | Security-conscious orgs |
| **Platform** | 8 | Full market |

---

---

## 🔧 Backend Completeness Summary

| Kategori | Roadmap Sonrası |
|----------|----------------|
| **Feature Completeness** | %100 |
| **Production Infrastructure** | %100 |
| **Monitoring & Observability** | %100 |
| **Security & Compliance** | %100 |
| **API & Integrations** | %100 |
| **Overall Backend** | **%100** ✅ |

---

*Son güncelleme: 1 Aralık 2025*
