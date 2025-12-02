export * from './event-bus';
export { 
  DomainEventService,
  domainEventService,
  publishDomainEvent,
  EventTypes,
  OutboxDestinations,
  EventMetadata,
  IssueCreatedPayload,
  IssueUpdatedPayload,
  IssueStatusChangedPayload,
  IssueCommentedPayload,
  type OutboxDestination,
  type EventMetadataType,
} from './domain-event-service';
