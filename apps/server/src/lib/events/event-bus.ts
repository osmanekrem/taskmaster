import { EventEmitter } from 'events';

// =============================================================================
// EVENT TYPES
// =============================================================================

export type IssueEventType = 
  | 'issue:created'
  | 'issue:updated'
  | 'issue:deleted'
  | 'issue:transitioned'
  | 'issue:assigned'
  | 'issue:unassigned'
  | 'issue:commented'
  | 'issue:attachment_added'
  | 'issue:attachment_removed'
  | 'issue:linked'
  | 'issue:unlinked'
  | 'issue:moved'
  | 'issue:cloned';

export type SprintEventType =
  | 'sprint:created'
  | 'sprint:updated'
  | 'sprint:started'
  | 'sprint:completed'
  | 'sprint:cancelled'
  | 'sprint:deleted'
  | 'sprint:issue_added'
  | 'sprint:issue_removed'
  | 'sprint:issue_moved';

export type ProjectEventType =
  | 'project:created'
  | 'project:updated'
  | 'project:archived'
  | 'project:unarchived'
  | 'project:deleted'
  | 'project:member_added'
  | 'project:member_removed';

export type CommentEventType =
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'comment:reaction_added'
  | 'comment:reaction_removed';

export type WorkflowEventType =
  | 'workflow:created'
  | 'workflow:updated'
  | 'workflow:deleted'
  | 'workflow:status_added'
  | 'workflow:status_removed'
  | 'workflow:transition_added'
  | 'workflow:transition_removed';

export type UserEventType =
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'user:role_assigned'
  | 'user:role_removed';

export type EventType = 
  | IssueEventType 
  | SprintEventType 
  | ProjectEventType 
  | CommentEventType
  | WorkflowEventType
  | UserEventType;

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

export interface BaseEventPayload {
  timestamp: Date;
  actorId: string | null; // User who triggered the event, null for system events
}

export interface IssueEventPayload extends BaseEventPayload {
  issueId: string;
  issueKey: string;
  projectId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  transitionId?: string;
  statusId?: string;
  commentId?: string;
  attachmentId?: string;
  linkedIssueId?: string;
  linkType?: string;
}

export interface SprintEventPayload extends BaseEventPayload {
  sprintId: string;
  projectId: string;
  issueId?: string;
  issueIds?: string[];
  fromSprintId?: string;
  toSprintId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface ProjectEventPayload extends BaseEventPayload {
  projectId: string;
  projectKey: string;
  userId?: string;
  roleId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface CommentEventPayload extends BaseEventPayload {
  commentId: string;
  issueId: string;
  issueKey: string;
  projectId: string;
  parentCommentId?: string;
  emoji?: string;
}

export interface WorkflowEventPayload extends BaseEventPayload {
  workflowId: string;
  statusId?: string;
  transitionId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export interface UserEventPayload extends BaseEventPayload {
  userId: string;
  targetUserId?: string;
  roleId?: string;
  projectId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

export type EventPayload = 
  | IssueEventPayload 
  | SprintEventPayload 
  | ProjectEventPayload 
  | CommentEventPayload
  | WorkflowEventPayload
  | UserEventPayload;

// =============================================================================
// EVENT HANDLER TYPE
// =============================================================================

export type EventHandler<T extends EventPayload = EventPayload> = (payload: T) => void | Promise<void>;

// =============================================================================
// EVENT BUS CLASS
// =============================================================================

class EventBus {
  private emitter: EventEmitter;
  private handlers: Map<EventType, Set<EventHandler>>;

  constructor() {
    this.emitter = new EventEmitter();
    this.handlers = new Map();
    
    // Increase max listeners for scalability
    this.emitter.setMaxListeners(100);
  }

  /**
   * Emit an event with payload
   */
  emit<T extends EventPayload>(eventType: EventType, payload: T): void {
    // Add timestamp if not present
    const eventPayload = {
      ...payload,
      timestamp: payload.timestamp || new Date(),
    };

    // Log event for debugging (can be removed in production)
    console.log(`[EventBus] Emitting: ${eventType}`, { 
      ...eventPayload, 
      timestamp: eventPayload.timestamp.toISOString() 
    });

    this.emitter.emit(eventType, eventPayload);
    
    // Also emit wildcard event for global listeners
    this.emitter.emit('*', { type: eventType, payload: eventPayload });
  }

  /**
   * Subscribe to an event
   * Returns unsubscribe function
   */
  on<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): () => void {
    // Track handler for management
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Subscribe to emitter
    this.emitter.on(eventType, handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Subscribe to an event for one-time execution
   */
  once<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): void {
    this.emitter.once(eventType, handler as EventHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): void {
    this.emitter.off(eventType, handler as EventHandler);
    
    // Clean up tracking
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(handler: (event: { type: EventType; payload: EventPayload }) => void | Promise<void>): () => void {
    this.emitter.on('*', handler);
    return () => {
      this.emitter.off('*', handler);
    };
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
      this.handlers.delete(eventType);
    } else {
      this.emitter.removeAllListeners();
      this.handlers.clear();
    }
  }

  /**
   * Get listener count for an event type
   */
  listenerCount(eventType: EventType): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const eventBus = new EventBus();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

// Issue events
export const emitIssueCreated = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:created', { ...payload, timestamp: new Date() });

export const emitIssueUpdated = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:updated', { ...payload, timestamp: new Date() });

export const emitIssueTransitioned = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:transitioned', { ...payload, timestamp: new Date() });

export const emitIssueAssigned = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:assigned', { ...payload, timestamp: new Date() });

export const emitIssueCommented = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:commented', { ...payload, timestamp: new Date() });

export const emitIssueDeleted = (payload: Omit<IssueEventPayload, 'timestamp'>) => 
  eventBus.emit('issue:deleted', { ...payload, timestamp: new Date() });

// Sprint events
export const emitSprintCreated = (payload: Omit<SprintEventPayload, 'timestamp'>) => 
  eventBus.emit('sprint:created', { ...payload, timestamp: new Date() });

export const emitSprintStarted = (payload: Omit<SprintEventPayload, 'timestamp'>) => 
  eventBus.emit('sprint:started', { ...payload, timestamp: new Date() });

export const emitSprintCompleted = (payload: Omit<SprintEventPayload, 'timestamp'>) => 
  eventBus.emit('sprint:completed', { ...payload, timestamp: new Date() });

export const emitSprintIssueAdded = (payload: Omit<SprintEventPayload, 'timestamp'>) => 
  eventBus.emit('sprint:issue_added', { ...payload, timestamp: new Date() });

export const emitSprintIssueRemoved = (payload: Omit<SprintEventPayload, 'timestamp'>) => 
  eventBus.emit('sprint:issue_removed', { ...payload, timestamp: new Date() });

// Comment events
export const emitCommentCreated = (payload: Omit<CommentEventPayload, 'timestamp'>) => 
  eventBus.emit('comment:created', { ...payload, timestamp: new Date() });

export const emitCommentUpdated = (payload: Omit<CommentEventPayload, 'timestamp'>) => 
  eventBus.emit('comment:updated', { ...payload, timestamp: new Date() });

export const emitCommentDeleted = (payload: Omit<CommentEventPayload, 'timestamp'>) => 
  eventBus.emit('comment:deleted', { ...payload, timestamp: new Date() });

// Project events
export const emitProjectCreated = (payload: Omit<ProjectEventPayload, 'timestamp'>) => 
  eventBus.emit('project:created', { ...payload, timestamp: new Date() });

export const emitProjectUpdated = (payload: Omit<ProjectEventPayload, 'timestamp'>) => 
  eventBus.emit('project:updated', { ...payload, timestamp: new Date() });

export const emitProjectArchived = (payload: Omit<ProjectEventPayload, 'timestamp'>) => 
  eventBus.emit('project:archived', { ...payload, timestamp: new Date() });
