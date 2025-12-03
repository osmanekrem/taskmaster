// =============================================================================
// DEPENDENCY INJECTION CONTAINER
// =============================================================================
// Centralized container for managing service and repository instances
// Implements lazy loading and proper dependency injection
//
// Design Principles:
// 1. Lazy loading - instances created on first access
// 2. Singleton per container - same instance returned on subsequent calls
// 3. Proper DI - dependencies injected through container, not created internally
// 4. Testability - can create new container with mock db
//
// Usage:
// - Production: import { container } from '@/lib/container'
// - Testing: const testContainer = Container.create(mockDb)
// =============================================================================

import { db } from '@/db';
import { userService } from '@/services/user-service';
import { fieldService } from '@/services/field-service';
import { fieldTypeService } from '@/services/field-type-service';
import { ticketTypeService } from '@/services/ticket-type-service';
import { statusService } from '@/services/status-service';
import { workflowService } from '@/services/workflow-service';
import { ProjectService } from '@/services/project-service';
import { IssueService } from '@/services/issue-service';
import { IssueRepository } from '@/repositories/issue-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import { CommentService } from '@/services/comment-service';
import {
  CommentRepository,
  AttachmentRepository,
} from '@/repositories/comment-repository';
import { NotificationService } from '@/services/notification-service';
import {
  WatcherRepository,
  NotificationRepository,
  NotificationPreferencesRepository,
  DigestSettingsRepository,
} from '@/repositories/notification-repository';
import { PermissionService } from '@/services/permission-service';
import {
  RoleRepository,
  RolePermissionRepository,
  RoleMemberRepository,
  PermissionSchemeRepository,
} from '@/repositories/permission-repository';
import { SprintService } from '@/services/sprint-service';
// New imports for DI container expansion
import { ComponentService } from '@/services/component-service';
import { ComponentRepository } from '@/repositories/component-repository';
import { IssueLinkService } from '@/services/issue-link-service';
import { IssueLinkRepository } from '@/repositories/issue-link-repository';
import { LabelService } from '@/services/label-service';
import { LabelRepository } from '@/repositories/label-repository';
import { VersionService } from '@/services/version-service';
import { VersionRepository } from '@/repositories/version-repository';
import { GroupService } from '@/services/group-service';
// Phase 0: Additional imports for complete DI coverage
import { AuditService } from '@/services/audit-service';
import { auditRepository } from '@/repositories/audit-repository';
import { WebhookService } from '@/services/webhook-service';
import { webhookRepository } from '@/repositories/webhook-repository';
import { FilterService } from '@/services/filter-service';
import { filterRepository } from '@/repositories/filter-repository';
import { WorklogService } from '@/services/worklog-service';
import { worklogRepository } from '@/repositories/worklog-repository';
import { ScreenService } from '@/services/screen-service';
import { screenRepository } from '@/repositories/screen-repository';
import { BoardService } from '@/services/board-service';
import { boardRepository } from '@/repositories/board-repository';
import { AutomationService } from '@/services/automation-service';
import { SecurityService } from '@/services/security-service';
import { TicketTypeRepository } from '@/repositories/ticket-type-repository';
import { WorkflowRepository } from '@/repositories/workflow-repository';
import { StatusRepository } from '@/repositories/status-repository';
import { FieldRepository } from '@/repositories/field-repository';
import { 
  SprintRepository, 
  SprintIssueRepository, 
  SprintHistoryRepository, 
  BurndownRepository 
} from '@/repositories/sprint-repository';
import type { DrizzleClient } from '@/lib/types/db';

class Container {
  // ===========================================================================
  // PRIVATE STATE
  // ===========================================================================

  private readonly _db: DrizzleClient;

  // Repository instances (cached for singleton behavior)
  private _issueRepository: IssueRepository | null = null;
  private _projectRepository: ProjectRepository | null = null;
  private _commentRepository: CommentRepository | null = null;
  private _attachmentRepository: AttachmentRepository | null = null;
  private _watcherRepository: WatcherRepository | null = null;
  private _notificationRepository: NotificationRepository | null = null;
  private _notificationPreferencesRepository: NotificationPreferencesRepository | null =
    null;
  private _digestSettingsRepository: DigestSettingsRepository | null = null;
  private _roleRepository: RoleRepository | null = null;
  private _rolePermissionRepository: RolePermissionRepository | null = null;
  private _roleMemberRepository: RoleMemberRepository | null = null;
  private _permissionSchemeRepository: PermissionSchemeRepository | null = null;
  // New repositories for expanded DI
  private _componentRepository: ComponentRepository | null = null;
  private _issueLinkRepository: IssueLinkRepository | null = null;
  private _labelRepository: LabelRepository | null = null;
  private _versionRepository: VersionRepository | null = null;
  // Phase 0: Additional repositories
  private _ticketTypeRepository: TicketTypeRepository | null = null;
  private _workflowRepository: WorkflowRepository | null = null;
  private _statusRepository: StatusRepository | null = null;
  private _fieldRepository: FieldRepository | null = null;
  private _sprintRepository: SprintRepository | null = null;
  private _sprintIssueRepository: SprintIssueRepository | null = null;
  private _sprintHistoryRepository: SprintHistoryRepository | null = null;
  private _burndownRepository: BurndownRepository | null = null;

  // Service instances (cached for singleton behavior)
  private _userService: ReturnType<typeof userService> | null = null;
  private _fieldService: ReturnType<typeof fieldService> | null = null;
  private _fieldTypeService: typeof fieldTypeService | null = null;
  private _ticketTypeService: ReturnType<typeof ticketTypeService> | null =
    null;
  private _statusService: ReturnType<typeof statusService> | null = null;
  private _workflowService: ReturnType<typeof workflowService> | null = null;
  private _projectService: ProjectService | null = null;
  private _issueService: IssueService | null = null;
  private _commentService: CommentService | null = null;
  private _notificationService: NotificationService | null = null;
  private _permissionService: PermissionService | null = null;
  private _sprintService: SprintService | null = null;
  // New services for expanded DI
  private _componentService: ComponentService | null = null;
  private _issueLinkService: IssueLinkService | null = null;
  private _labelService: LabelService | null = null;
  private _versionService: VersionService | null = null;
  private _groupService: GroupService | null = null;
  // Phase 0: Additional services
  private _auditService: AuditService | null = null;
  private _webhookService: WebhookService | null = null;
  private _filterService: FilterService | null = null;
  private _worklogService: WorklogService | null = null;
  private _screenService: ScreenService | null = null;
  private _boardService: BoardService | null = null;
  private _automationService: AutomationService | null = null;
  private _securityService: SecurityService | null = null;

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  constructor(database: DrizzleClient = db) {
    this._db = database;
  }

  // ===========================================================================
  // REPOSITORY ACCESSORS (Private - used internally for DI)
  // ===========================================================================

  private get issueRepository(): IssueRepository {
    this._issueRepository ??= new IssueRepository();
    return this._issueRepository;
  }

  private get projectRepository(): ProjectRepository {
    this._projectRepository ??= new ProjectRepository(this._db);
    return this._projectRepository;
  }

  private get commentRepository(): CommentRepository {
    this._commentRepository ??= new CommentRepository();
    return this._commentRepository;
  }

  private get attachmentRepository(): AttachmentRepository {
    this._attachmentRepository ??= new AttachmentRepository();
    return this._attachmentRepository;
  }

  private get watcherRepository(): WatcherRepository {
    this._watcherRepository ??= new WatcherRepository();
    return this._watcherRepository;
  }

  private get notificationRepository(): NotificationRepository {
    this._notificationRepository ??= new NotificationRepository();
    return this._notificationRepository;
  }

  private get notificationPreferencesRepository(): NotificationPreferencesRepository {
    this._notificationPreferencesRepository ??=
      new NotificationPreferencesRepository();
    return this._notificationPreferencesRepository;
  }

  private get digestSettingsRepository(): DigestSettingsRepository {
    this._digestSettingsRepository ??= new DigestSettingsRepository();
    return this._digestSettingsRepository;
  }

  private get roleRepository(): RoleRepository {
    this._roleRepository ??= new RoleRepository();
    return this._roleRepository;
  }

  private get rolePermissionRepository(): RolePermissionRepository {
    this._rolePermissionRepository ??= new RolePermissionRepository();
    return this._rolePermissionRepository;
  }

  private get roleMemberRepository(): RoleMemberRepository {
    this._roleMemberRepository ??= new RoleMemberRepository();
    return this._roleMemberRepository;
  }

  private get permissionSchemeRepository(): PermissionSchemeRepository {
    this._permissionSchemeRepository ??= new PermissionSchemeRepository();
    return this._permissionSchemeRepository;
  }

  private get componentRepository(): ComponentRepository {
    this._componentRepository ??= new ComponentRepository(this._db);
    return this._componentRepository;
  }

  private get issueLinkRepository(): IssueLinkRepository {
    this._issueLinkRepository ??= new IssueLinkRepository();
    return this._issueLinkRepository;
  }

  private get labelRepository(): LabelRepository {
    this._labelRepository ??= new LabelRepository(this._db);
    return this._labelRepository;
  }

  private get versionRepository(): VersionRepository {
    this._versionRepository ??= new VersionRepository(this._db);
    return this._versionRepository;
  }

  // Phase 0: Additional repository accessors
  private get ticketTypeRepository(): TicketTypeRepository {
    this._ticketTypeRepository ??= new TicketTypeRepository(this._db);
    return this._ticketTypeRepository;
  }

  private get workflowRepository(): WorkflowRepository {
    this._workflowRepository ??= new WorkflowRepository(this._db);
    return this._workflowRepository;
  }

  private get statusRepository(): StatusRepository {
    this._statusRepository ??= new StatusRepository(this._db);
    return this._statusRepository;
  }

  private get fieldRepository(): FieldRepository {
    this._fieldRepository ??= new FieldRepository(this._db);
    return this._fieldRepository;
  }

  private get sprintRepository(): SprintRepository {
    this._sprintRepository ??= new SprintRepository();
    return this._sprintRepository;
  }

  private get sprintIssueRepository(): SprintIssueRepository {
    this._sprintIssueRepository ??= new SprintIssueRepository();
    return this._sprintIssueRepository;
  }

  private get sprintHistoryRepository(): SprintHistoryRepository {
    this._sprintHistoryRepository ??= new SprintHistoryRepository();
    return this._sprintHistoryRepository;
  }

  private get burndownRepository(): BurndownRepository {
    this._burndownRepository ??= new BurndownRepository();
    return this._burndownRepository;
  }

  // ===========================================================================
  // PUBLIC ACCESSORS
  // ===========================================================================

  get db(): DrizzleClient {
    return this._db;
  }

  // ===========================================================================
  // FACTORY-BASED SERVICES
  // These services use factory functions and receive db as parameter
  // ===========================================================================

  get user() {
    this._userService ??= userService(this._db);
    return this._userService;
  }

  get field() {
    this._fieldService ??= fieldService(this._db);
    return this._fieldService;
  }

  get fieldType() {
    this._fieldTypeService ??= fieldTypeService;
    return this._fieldTypeService;
  }

  get ticketType() {
    this._ticketTypeService ??= ticketTypeService(this._db);
    return this._ticketTypeService;
  }

  get status() {
    this._statusService ??= statusService(this._db);
    return this._statusService;
  }

  get workflow() {
    this._workflowService ??= workflowService(this._db);
    return this._workflowService;
  }

  get project(): ProjectService {
    this._projectService ??= new ProjectService(this._db);
    return this._projectService;
  }

  // ===========================================================================
  // CLASS-BASED SERVICES
  // These services use class constructors with dependency injection
  // Dependencies are resolved from container (not created inline)
  // ===========================================================================

  /**
   * Issue Service
   * Dependencies: IssueRepository, ProjectRepository, NotificationService,
   *               TicketTypeRepository, WorkflowRepository, StatusRepository,
   *               FieldRepository, SprintIssueRepository
   */
  get issue(): IssueService {
    this._issueService ??= new IssueService(
      this.issueRepository,
      this.projectRepository,
      this.notification, // ✅ Injected from container
      this.ticketTypeRepository,
      this.workflowRepository,
      this.statusRepository,
      this.fieldRepository,
      this.sprintIssueRepository,
    );
    return this._issueService;
  }

  /**
   * Comment Service
   * Dependencies: CommentRepository, AttachmentRepository, IssueRepository, NotificationService
   */
  get comment(): CommentService {
    this._commentService ??= new CommentService(
      this.commentRepository,
      this.attachmentRepository,
      this.issueRepository,
      this.notification,
    );
    return this._commentService;
  }

  /**
   * Notification Service
   * Dependencies: NotificationRepository, WatcherRepository,
   *               NotificationPreferencesRepository, DigestSettingsRepository
   */
  get notification(): NotificationService {
    this._notificationService ??= new NotificationService(
      this.notificationRepository,
      this.watcherRepository,
      this.notificationPreferencesRepository,
      this.digestSettingsRepository,
    );
    return this._notificationService;
  }

  /**
   * Permission Service
   * Dependencies: RoleRepository, RolePermissionRepository,
   *               RoleMemberRepository, PermissionSchemeRepository
   */
  get permission(): PermissionService {
    this._permissionService ??= new PermissionService(
      this.roleRepository,
      this.rolePermissionRepository,
      this.roleMemberRepository,
      this.permissionSchemeRepository,
    );
    return this._permissionService;
  }

  /**
   * Sprint Service
   * Dependencies: SprintRepository, SprintIssueRepository, 
   *               SprintHistoryRepository, BurndownRepository
   */
  get sprint(): SprintService {
    this._sprintService ??= new SprintService(
      this.sprintRepository,
      this.sprintIssueRepository,
      this.sprintHistoryRepository,
      this.burndownRepository,
    );
    return this._sprintService;
  }

  /**
   * Component Service
   * Dependencies: ComponentRepository, ProjectRepository
   */
  get component(): ComponentService {
    this._componentService ??= new ComponentService(
      this.componentRepository,
      this.projectRepository,
    );
    return this._componentService;
  }

  /**
   * Issue Link Service
   * Dependencies: IssueLinkRepository, IssueRepository
   */
  get issueLink(): IssueLinkService {
    this._issueLinkService ??= new IssueLinkService(
      this.issueLinkRepository,
      this.issueRepository,
    );
    return this._issueLinkService;
  }

  /**
   * Label Service
   * Dependencies: LabelRepository, ProjectRepository
   */
  get label(): LabelService {
    this._labelService ??= new LabelService(
      this.labelRepository,
      this.projectRepository,
    );
    return this._labelService;
  }

  /**
   * Version Service
   * Dependencies: VersionRepository, ProjectRepository
   */
  get version(): VersionService {
    this._versionService ??= new VersionService(
      this.versionRepository,
      this.projectRepository,
    );
    return this._versionService;
  }

  /**
   * Group Service
   * No repository dependencies (uses static imports)
   */
  get group(): GroupService {
    this._groupService ??= new GroupService();
    return this._groupService;
  }

  // ===========================================================================
  // PHASE 0: ADDITIONAL SERVICES
  // ===========================================================================

  /**
   * Audit Service
   * For audit logging and compliance tracking
   */
  get audit(): AuditService {
    this._auditService ??= new AuditService();
    return this._auditService;
  }

  /**
   * Webhook Service
   * For webhook management and delivery
   */
  get webhook(): WebhookService {
    this._webhookService ??= new WebhookService();
    return this._webhookService;
  }

  /**
   * Filter Service
   * For saved JQL filters
   */
  get filter(): FilterService {
    this._filterService ??= new FilterService();
    return this._filterService;
  }

  /**
   * Worklog Service
   * For time tracking
   */
  get worklog(): WorklogService {
    this._worklogService ??= new WorklogService();
    return this._worklogService;
  }

  /**
   * Screen Service
   * For screen and field configuration management
   */
  get screen(): ScreenService {
    this._screenService ??= new ScreenService();
    return this._screenService;
  }

  /**
   * Board Service
   * For Kanban/Scrum boards
   */
  get board(): BoardService {
    this._boardService ??= new BoardService();
    return this._boardService;
  }

  /**
   * Automation Service
   * For automation rules
   */
  get automation(): AutomationService {
    this._automationService ??= new AutomationService();
    return this._automationService;
  }

  /**
   * Security Service
   * For issue security schemes and levels
   */
  get security(): SecurityService {
    this._securityService ??= new SecurityService();
    return this._securityService;
  }

  // ===========================================================================
  // TRANSACTION & UNIT OF WORK
  // ===========================================================================

  /**
   * Execute operations within a transaction using Unit of Work pattern
   * All repository operations share the same transaction context
   *
   * @example
   * ```typescript
   * const result = await container.executeInTransaction(async (uow) => {
   *   const issue = await uow.issues.create({ ... });
   *   await uow.comments.create({ issueId: issue.id, ... });
   *   return issue;
   * });
   * ```
   */
  async executeInTransaction<T>(
    callback: (uow: import('./unit-of-work').UnitOfWork) => Promise<T>,
  ): Promise<T> {
    const { UnitOfWork } = await import('./unit-of-work');
    return UnitOfWork.execute(callback);
  }

  /**
   * Execute operations within a serializable transaction
   * Use for operations requiring highest isolation level
   */
  async executeSerializable<T>(
    callback: (uow: import('./unit-of-work').UnitOfWork) => Promise<T>,
  ): Promise<T> {
    const { UnitOfWork } = await import('./unit-of-work');
    return UnitOfWork.executeSerializable(callback);
  }

  // ===========================================================================
  // FACTORY & UTILITY METHODS
  // ===========================================================================

  /**
   * Create a new container instance
   * Useful for testing with mock database
   */
  static create(database?: DrizzleClient): Container {
    return new Container(database);
  }

  /**
   * Reset all cached instances
   * Useful for testing to ensure clean state between tests
   */
  reset(): void {
    // Reset repositories
    this._issueRepository = null;
    this._projectRepository = null;
    this._commentRepository = null;
    this._attachmentRepository = null;
    this._watcherRepository = null;
    this._notificationRepository = null;
    this._notificationPreferencesRepository = null;
    this._digestSettingsRepository = null;
    this._roleRepository = null;
    this._rolePermissionRepository = null;
    this._roleMemberRepository = null;
    this._permissionSchemeRepository = null;
    this._componentRepository = null;
    this._issueLinkRepository = null;
    this._labelRepository = null;
    this._versionRepository = null;
    // Phase 0: Additional repositories
    this._ticketTypeRepository = null;
    this._workflowRepository = null;
    this._statusRepository = null;
    this._fieldRepository = null;
    this._sprintRepository = null;
    this._sprintIssueRepository = null;

    // Reset services
    this._userService = null;
    this._fieldService = null;
    this._fieldTypeService = null;
    this._ticketTypeService = null;
    this._statusService = null;
    this._workflowService = null;
    this._projectService = null;
    this._issueService = null;
    this._commentService = null;
    this._notificationService = null;
    this._permissionService = null;
    this._sprintService = null;
    this._componentService = null;
    this._issueLinkService = null;
    this._labelService = null;
    this._versionService = null;
    this._groupService = null;
    // Phase 0: Additional services
    this._auditService = null;
    this._webhookService = null;
    this._filterService = null;
    this._worklogService = null;
    this._screenService = null;
    this._boardService = null;
    this._automationService = null;
    this._securityService = null;
  }
}

export const container = new Container();

export { Container };
