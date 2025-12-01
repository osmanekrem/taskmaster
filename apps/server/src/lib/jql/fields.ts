/**
 * JQL Field Mappings
 *
 * Maps JQL field names to database columns and provides field metadata.
 */

import type { JQLFieldMapping } from './ast';

// =============================================================================
// SYSTEM FIELDS
// =============================================================================

export const SYSTEM_FIELDS: Record<string, JQLFieldMapping> = {
  // Issue identification
  key: {
    jqlName: 'key',
    aliases: ['issueKey', 'issue'],
    dbColumn: 'key',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  id: {
    jqlName: 'id',
    aliases: ['issueId'],
    dbColumn: 'id',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  summary: {
    jqlName: 'summary',
    aliases: ['title'],
    dbColumn: 'summary',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: true,
    supportsHistory: true,
  },
  description: {
    jqlName: 'description',
    aliases: ['desc'],
    dbColumn: 'description',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: true,
    supportsHistory: true,
  },

  // Status & Resolution
  status: {
    jqlName: 'status',
    aliases: ['statusId'],
    dbColumn: 'status_id',
    isCustomField: false,
    valueType: 'status',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  resolution: {
    jqlName: 'resolution',
    aliases: ['resolutionId'],
    dbColumn: 'resolution_id',
    isCustomField: false,
    valueType: 'resolution',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Priority
  priority: {
    jqlName: 'priority',
    aliases: [],
    dbColumn: 'priority',
    isCustomField: false,
    valueType: 'priority',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Type & Project
  issueType: {
    jqlName: 'issueType',
    aliases: ['type', 'issuetype'],
    dbColumn: 'issue_type_id',
    isCustomField: false,
    valueType: 'issueType',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  project: {
    jqlName: 'project',
    aliases: ['projectId'],
    dbColumn: 'project_id',
    isCustomField: false,
    valueType: 'project',
    supportsTextSearch: false,
    supportsHistory: false,
  },

  // People
  assignee: {
    jqlName: 'assignee',
    aliases: ['assigned', 'assignedTo'],
    dbColumn: 'assignee_id',
    isCustomField: false,
    valueType: 'user',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  reporter: {
    jqlName: 'reporter',
    aliases: ['reportedBy', 'creator'],
    dbColumn: 'reporter_id',
    isCustomField: false,
    valueType: 'user',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  creator: {
    jqlName: 'creator',
    aliases: [],
    dbColumn: 'reporter_id',
    isCustomField: false,
    valueType: 'user',
    supportsTextSearch: false,
    supportsHistory: false,
  },

  // Dates
  created: {
    jqlName: 'created',
    aliases: ['createdDate'],
    dbColumn: 'created_at',
    isCustomField: false,
    valueType: 'date',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  updated: {
    jqlName: 'updated',
    aliases: ['updatedDate', 'lastUpdated'],
    dbColumn: 'updated_at',
    isCustomField: false,
    valueType: 'date',
    supportsTextSearch: false,
    supportsHistory: false,
  },
  dueDate: {
    jqlName: 'dueDate',
    aliases: ['due', 'duedate'],
    dbColumn: 'due_date',
    isCustomField: false,
    valueType: 'date',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  resolved: {
    jqlName: 'resolved',
    aliases: ['resolvedDate', 'resolutionDate'],
    dbColumn: 'resolved_at',
    isCustomField: false,
    valueType: 'date',
    supportsTextSearch: false,
    supportsHistory: false,
  },

  // Hierarchy
  parent: {
    jqlName: 'parent',
    aliases: ['parentId', 'parentIssue'],
    dbColumn: 'parent_id',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  epic: {
    jqlName: 'epic',
    aliases: ['epicLink', 'epicId'],
    dbColumn: 'epic_id',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Sprint
  sprint: {
    jqlName: 'sprint',
    aliases: ['sprintId'],
    dbColumn: 'sprint_id',
    tableAlias: 'sprint_issues',
    isCustomField: false,
    valueType: 'sprint',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Components & Versions
  component: {
    jqlName: 'component',
    aliases: ['components'],
    dbColumn: 'component_id',
    tableAlias: 'issue_components',
    isCustomField: false,
    valueType: 'component',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  fixVersion: {
    jqlName: 'fixVersion',
    aliases: ['fixVersions'],
    dbColumn: 'version_id',
    tableAlias: 'issue_fix_versions',
    isCustomField: false,
    valueType: 'version',
    supportsTextSearch: false,
    supportsHistory: true,
  },
  affectedVersion: {
    jqlName: 'affectedVersion',
    aliases: ['affectedVersions', 'affectsVersion'],
    dbColumn: 'version_id',
    tableAlias: 'issue_affected_versions',
    isCustomField: false,
    valueType: 'version',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Labels
  labels: {
    jqlName: 'labels',
    aliases: ['label'],
    dbColumn: 'label_id',
    tableAlias: 'issue_labels',
    isCustomField: false,
    valueType: 'label',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Estimate
  storyPoints: {
    jqlName: 'storyPoints',
    aliases: ['story_points', 'points', 'estimate'],
    dbColumn: 'story_points',
    isCustomField: false,
    valueType: 'number',
    supportsTextSearch: false,
    supportsHistory: true,
  },

  // Text search
  text: {
    jqlName: 'text',
    aliases: [],
    dbColumn: '_text_search',
    isCustomField: false,
    valueType: 'string',
    supportsTextSearch: true,
    supportsHistory: false,
  },
};

// =============================================================================
// FIELD LOOKUP
// =============================================================================

/**
 * Get field mapping by name (case-insensitive)
 */
export function getFieldMapping(fieldName: string): JQLFieldMapping | null {
  const lowerName = fieldName.toLowerCase();

  // Check system fields
  for (const [, mapping] of Object.entries(SYSTEM_FIELDS)) {
    if (
      mapping.jqlName.toLowerCase() === lowerName ||
      mapping.aliases.some((alias) => alias.toLowerCase() === lowerName)
    ) {
      return mapping;
    }
  }

  return null;
}

/**
 * Get all supported field names
 */
export function getSupportedFields(): string[] {
  const fields: string[] = [];

  for (const [, mapping] of Object.entries(SYSTEM_FIELDS)) {
    fields.push(mapping.jqlName);
    fields.push(...mapping.aliases);
  }

  return fields;
}

/**
 * Check if a field supports a given operator
 */
export function fieldSupportsOperator(
  fieldName: string,
  operator: string,
): boolean {
  const mapping = getFieldMapping(fieldName);
  if (!mapping) return false;

  // Text search operators
  if (operator === '~' || operator === '!~') {
    return mapping.supportsTextSearch;
  }

  // Historical operators
  if (operator === 'WAS' || operator === 'CHANGED') {
    return mapping.supportsHistory;
  }

  // All fields support basic operators
  return true;
}
