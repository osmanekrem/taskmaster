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
import { CommentRepository, AttachmentRepository } from '@/repositories/comment-repository';
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
import type { DrizzleClient } from '@/lib/types/db';

class Container {
  private readonly _db: DrizzleClient;
  private _userService: ReturnType<typeof userService> | null = null;
  private _fieldService: ReturnType<typeof fieldService> | null = null;
  private _fieldTypeService: ReturnType<typeof fieldTypeService> | null = null;
  private _ticketTypeService: ReturnType<typeof ticketTypeService> | null = null;
  private _statusService: ReturnType<typeof statusService> | null = null;
  private _workflowService: ReturnType<typeof workflowService> | null = null;
  private _projectService: ReturnType<typeof projectService> | null = null;
  private _issueService: IssueService | null = null;
  private _commentService: CommentService | null = null;
  private _notificationService: NotificationService | null = null;
  private _permissionService: PermissionService | null = null;
  private _sprintService: SprintService | null = null;

  constructor(database: DrizzleClient = db) {
    this._db = database;
  }

  get db(): DrizzleClient {
    return this._db;
  }

  get user() {
    this._userService ??= userService(this._db);
    return this._userService;
  }

  get field() {
    this._fieldService ??= fieldService(this._db);
    return this._fieldService;
  }

  get fieldType() {
    this._fieldTypeService ??= fieldTypeService(this._db);
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

  get issue() {
    if (!this._issueService) {
      const issueRepository = new IssueRepository();
      const projectRepository = new ProjectRepository();
      this._issueService = new IssueService(issueRepository, projectRepository);
    }
    return this._issueService;
  }

  get comment() {
    if (!this._commentService) {
      const commentRepository = new CommentRepository();
      const attachmentRepository = new AttachmentRepository();
      const issueRepository = new IssueRepository();
      this._commentService = new CommentService(commentRepository, attachmentRepository, issueRepository);
    }
    return this._commentService;
  }

  get notification() {
    if (!this._notificationService) {
      const notificationRepo = new NotificationRepository();
      const watcherRepo = new WatcherRepository();
      const preferencesRepo = new NotificationPreferencesRepository();
      const digestRepo = new DigestSettingsRepository();
      this._notificationService = new NotificationService(
        notificationRepo,
        watcherRepo,
        preferencesRepo,
        digestRepo,
      );
    }
    return this._notificationService;
  }

  get permission() {
    if (!this._permissionService) {
      const roleRepo = new RoleRepository();
      const permissionRepo = new RolePermissionRepository();
      const memberRepo = new RoleMemberRepository();
      const schemeRepo = new PermissionSchemeRepository();
      this._permissionService = new PermissionService(
        roleRepo,
        permissionRepo,
        memberRepo,
        schemeRepo,
      );
    }
    return this._permissionService;
  }

  get sprint() {
    if (!this._sprintService) {
      this._sprintService = new SprintService();
    }
    return this._sprintService;
  }

  static create(database?: DrizzleClient): Container {
    return new Container(database);
  }
}

export const container = new Container();

export { Container };
