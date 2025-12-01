// =============================================================================
// ISSUE LINK CONSTANTS
// =============================================================================

/**
 * Default link types for issue relationships
 */
export const DEFAULT_LINK_TYPES = [
  {
    name: 'Blocks',
    inwardName: 'is blocked by',
    outwardName: 'blocks',
    description: 'Issue blocks another issue from progressing',
    isSystem: true,
  },
  {
    name: 'Clones',
    inwardName: 'is cloned by',
    outwardName: 'clones',
    description: 'Issue is a clone of another issue',
    isSystem: true,
  },
  {
    name: 'Duplicates',
    inwardName: 'is duplicated by',
    outwardName: 'duplicates',
    description: 'Issue is a duplicate of another issue',
    isSystem: true,
  },
  {
    name: 'Relates',
    inwardName: 'relates to',
    outwardName: 'relates to',
    description: 'Issue is related to another issue',
    isSystem: true,
  },
  {
    name: 'Causes',
    inwardName: 'is caused by',
    outwardName: 'causes',
    description: 'Issue causes another issue',
    isSystem: true,
  },
  {
    name: 'Parent-Child',
    inwardName: 'is child of',
    outwardName: 'is parent of',
    description: 'Parent-child relationship between issues',
    isSystem: true,
  },
] as const;

export type DefaultLinkType = (typeof DEFAULT_LINK_TYPES)[number];
