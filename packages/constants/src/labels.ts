// =============================================================================
// LABEL CONSTANTS
// =============================================================================

/**
 * Default label colors (Tailwind CSS colors)
 */
export const LABEL_COLORS = {
  RED: '#EF4444',
  ORANGE: '#F97316',
  AMBER: '#F59E0B',
  YELLOW: '#EAB308',
  LIME: '#84CC16',
  GREEN: '#22C55E',
  EMERALD: '#10B981',
  TEAL: '#14B8A6',
  CYAN: '#06B6D4',
  SKY: '#0EA5E9',
  BLUE: '#3B82F6',
  INDIGO: '#6366F1',
  VIOLET: '#8B5CF6',
  PURPLE: '#A855F7',
  FUCHSIA: '#D946EF',
  PINK: '#EC4899',
  ROSE: '#F43F5E',
  GRAY: '#6B7280',
} as const;

export type LabelColor = (typeof LABEL_COLORS)[keyof typeof LABEL_COLORS];

/**
 * Default labels that can be created for new projects
 */
export const DEFAULT_LABELS = [
  {
    name: 'bug',
    color: LABEL_COLORS.RED,
    description: "Something isn't working",
  },
  {
    name: 'enhancement',
    color: LABEL_COLORS.BLUE,
    description: 'New feature or request',
  },
  {
    name: 'documentation',
    color: LABEL_COLORS.PURPLE,
    description: 'Improvements or additions to documentation',
  },
  {
    name: 'duplicate',
    color: LABEL_COLORS.GRAY,
    description: 'This issue already exists',
  },
  {
    name: 'good first issue',
    color: LABEL_COLORS.GREEN,
    description: 'Good for newcomers',
  },
  {
    name: 'help wanted',
    color: LABEL_COLORS.YELLOW,
    description: 'Extra attention is needed',
  },
  {
    name: 'invalid',
    color: LABEL_COLORS.GRAY,
    description: "This doesn't seem right",
  },
  {
    name: 'question',
    color: LABEL_COLORS.CYAN,
    description: 'Further information is requested',
  },
  {
    name: 'wontfix',
    color: LABEL_COLORS.GRAY,
    description: 'This will not be worked on',
  },
  {
    name: 'priority: high',
    color: LABEL_COLORS.RED,
    description: 'High priority issue',
  },
  {
    name: 'priority: medium',
    color: LABEL_COLORS.ORANGE,
    description: 'Medium priority issue',
  },
  {
    name: 'priority: low',
    color: LABEL_COLORS.TEAL,
    description: 'Low priority issue',
  },
] as const;

export type DefaultLabel = (typeof DEFAULT_LABELS)[number];
