/**
 * Status Categories
 * 
 * Status categories are used for:
 * 1. Reporting: Filter issues by category (e.g., "All done issues")
 * 2. Board columns: Auto-mapping statuses to board sections
 * 3. Resolution: Only 'done' category statuses can have resolution
 * 4. JQL: category = "Done" type queries
 */

export const STATUS_CATEGORIES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;

export type StatusCategory = typeof STATUS_CATEGORIES[keyof typeof STATUS_CATEGORIES];

export const STATUS_CATEGORY_INFO = {
  [STATUS_CATEGORIES.TODO]: {
    name: 'Yapılacak',
    description: 'İş henüz başlamadı',
    color: '#6B7280', // Gray
  },
  [STATUS_CATEGORIES.IN_PROGRESS]: {
    name: 'Devam Ediyor',
    description: 'İş üzerinde çalışılıyor',
    color: '#3B82F6', // Blue
  },
  [STATUS_CATEGORIES.DONE]: {
    name: 'Tamamlandı',
    description: 'İş tamamlandı',
    color: '#10B981', // Green
  },
} as const;

/**
 * Issue Type Hierarchy Levels
 * 
 * Defines the parent-child relationships between issue types:
 * - Epic (0): Container for related issues
 * - Standard (1): Main work items (Task, Bug, Story)
 * - Subtask (2): Smaller pieces of work within a parent
 */
export const ISSUE_TYPE_HIERARCHY = {
  EPIC: 0,
  STANDARD: 1,
  SUBTASK: 2,
} as const;

export type IssueTypeHierarchyLevel = typeof ISSUE_TYPE_HIERARCHY[keyof typeof ISSUE_TYPE_HIERARCHY];

export const HIERARCHY_LEVEL_INFO = {
  [ISSUE_TYPE_HIERARCHY.EPIC]: {
    name: 'Epic',
    description: 'Diğer issue\'ları içerebilir',
    canHaveParent: false,
    canHaveChildren: true,
  },
  [ISSUE_TYPE_HIERARCHY.STANDARD]: {
    name: 'Standart',
    description: 'Task, Bug, Story gibi ana iş öğeleri',
    canHaveParent: true, // Can belong to an Epic
    canHaveChildren: true, // Can have subtasks
  },
  [ISSUE_TYPE_HIERARCHY.SUBTASK]: {
    name: 'Alt Görev',
    description: 'Bir issue\'ın parçası olan küçük görevler',
    canHaveParent: true, // Must have a parent
    canHaveChildren: false,
  },
} as const;

/**
 * Default Statuses
 * Seed data for initial system statuses
 */
export const DEFAULT_STATUSES = [
  {
    name: 'Açık',
    description: 'Issue yeni oluşturuldu',
    category: STATUS_CATEGORIES.TODO,
    color: '#6B7280',
    icon: 'circle',
    isSystem: true,
  },
  {
    name: 'Devam Ediyor',
    description: 'Issue üzerinde çalışılıyor',
    category: STATUS_CATEGORIES.IN_PROGRESS,
    color: '#3B82F6',
    icon: 'loader',
    isSystem: true,
  },
  {
    name: 'İncelemede',
    description: 'Issue inceleme bekliyor',
    category: STATUS_CATEGORIES.IN_PROGRESS,
    color: '#8B5CF6',
    icon: 'eye',
    isSystem: true,
  },
  {
    name: 'Tamamlandı',
    description: 'Issue başarıyla tamamlandı',
    category: STATUS_CATEGORIES.DONE,
    color: '#10B981',
    icon: 'circle-check',
    isSystem: true,
  },
  {
    name: 'İptal Edildi',
    description: 'Issue iptal edildi',
    category: STATUS_CATEGORIES.DONE,
    color: '#EF4444',
    icon: 'circle-x',
    isSystem: true,
  },
] as const;

/**
 * Default Resolutions
 * Seed data for initial system resolutions
 */
export const DEFAULT_RESOLUTIONS = [
  {
    name: 'Tamamlandı',
    description: 'İş başarıyla tamamlandı',
    isDefault: true,
    isSystem: true,
  },
  {
    name: 'Yapılmayacak',
    description: 'Bu iş yapılmayacak',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Tekrar',
    description: 'Başka bir issue\'ın tekrarı',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Tekrarlanamıyor',
    description: 'Bug tekrar oluşturulamadı',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Eksik Bilgi',
    description: 'Yeterli bilgi sağlanmadı',
    isDefault: false,
    isSystem: true,
  },
] as const;

/**
 * Default Issue Types
 * Seed data for initial system issue types
 */
export const DEFAULT_ISSUE_TYPES = [
  {
    name: 'Epic',
    description: 'Büyük özellik veya iş paketi',
    icon: 'zap',
    hierarchyLevel: ISSUE_TYPE_HIERARCHY.EPIC,
  },
  {
    name: 'Görev',
    description: 'Yapılması gereken iş',
    icon: 'square-check',
    hierarchyLevel: ISSUE_TYPE_HIERARCHY.STANDARD,
  },
  {
    name: 'Bug',
    description: 'Hata bildirimi',
    icon: 'bug',
    hierarchyLevel: ISSUE_TYPE_HIERARCHY.STANDARD,
  },
  {
    name: 'Hikaye',
    description: 'Kullanıcı hikayesi',
    icon: 'book-open',
    hierarchyLevel: ISSUE_TYPE_HIERARCHY.STANDARD,
  },
  {
    name: 'Alt Görev',
    description: 'Bir issue\'ın alt görevi',
    icon: 'list-check',
    hierarchyLevel: ISSUE_TYPE_HIERARCHY.SUBTASK,
  },
] as const;
