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
import { projectService } from '@/services/project-service';
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

  // Service instances (cached for singleton behavior)
  private _userService: ReturnType<typeof userService> | null = null;
  private _fieldService: ReturnType<typeof fieldService> | null = null;
  private _fieldTypeService: typeof fieldTypeService | null = null;
  private _ticketTypeService: ReturnType<typeof ticketTypeService> | null =
    null;
  private _statusService: ReturnType<typeof statusService> | null = null;
  private _workflowService: ReturnType<typeof workflowService> | null = null;
  private _projectService: ReturnType<typeof projectService> | null = null;
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

  get project() {
    this._projectService ??= projectService(this._db);
    return this._projectService;
  }

  // ===========================================================================
  // CLASS-BASED SERVICES
  // These services use class constructors with dependency injection
  // Dependencies are resolved from container (not created inline)
  // ===========================================================================

  /**
   * Issue Service
   * Dependencies: IssueRepository, ProjectRepository, NotificationService
   */
  get issue(): IssueService {
    this._issueService ??= new IssueService(
      this.issueRepository,
      this.projectRepository,
      this.notification, // ✅ Injected from container
    );
    return this._issueService;
  }

  /**
   * Comment Service
   * Dependencies: CommentRepository, AttachmentRepository, IssueRepository
   */
  get comment(): CommentService {
    this._commentService ??= new CommentService(
      this.commentRepository,
      this.attachmentRepository,
      this.issueRepository,
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
   * No dependencies (uses db directly internally)
   */
  get sprint(): SprintService {
    this._sprintService ??= new SprintService();
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
  }
}

export const container = new Container();

export { Container };
