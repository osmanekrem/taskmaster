/**
 * Field Type Definitions
 * 
 * Her field type için:
 * - component: Frontend'de render edilecek component adı
 * - icon: Varsayılan icon
 * - configSchema: Bu field type'ın desteklediği config seçenekleri
 * - defaultConfig: Varsayılan config değerleri
 */

// Config value types
export type FieldConfigValueType = 'boolean' | 'string' | 'number' | 'select';

export interface FieldConfigOption {
  key: string;
  name: string;
  type: FieldConfigValueType;
  options?: string[]; // select tipi için
  default: boolean | string | number | null;
}

export interface FieldTypeDefinition {
  id: string;
  name: string;
  component: string;
  icon: string;
  configSchema: FieldConfigOption[];
  supportsOptions: boolean; // Select gibi tipler için
}

// Ortak config seçenekleri
const COMMON_CONFIG: FieldConfigOption[] = [
  { key: 'isRequired', name: 'Zorunlu Alan', type: 'boolean', default: false },
  { key: 'description', name: 'Açıklama', type: 'string', default: '' },
];

// Field Type tanımları
export const FIELD_TYPES: Record<string, FieldTypeDefinition> = {
  'text-input': {
    id: 'text-input',
    name: 'Tek Satır Metin',
    component: 'text-input',
    icon: 'type',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: '' },
      { key: 'minLength', name: 'Min Karakter', type: 'number', default: null },
      { key: 'maxLength', name: 'Max Karakter', type: 'number', default: null },
    ],
    supportsOptions: false,
  },

  'text-area': {
    id: 'text-area',
    name: 'Çok Satırlı Metin',
    component: 'text-area',
    icon: 'align-left',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: '' },
      { key: 'minLength', name: 'Min Karakter', type: 'number', default: null },
      { key: 'maxLength', name: 'Max Karakter', type: 'number', default: null },
      { key: 'rows', name: 'Satır Sayısı', type: 'number', default: 3 },
    ],
    supportsOptions: false,
  },

  'number-input': {
    id: 'number-input',
    name: 'Sayı',
    component: 'number-input',
    icon: 'hash',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: '' },
      { key: 'min', name: 'Min Değer', type: 'number', default: null },
      { key: 'max', name: 'Max Değer', type: 'number', default: null },
      { key: 'step', name: 'Artış Miktarı', type: 'number', default: 1 },
    ],
    supportsOptions: false,
  },

  'single-select': {
    id: 'single-select',
    name: 'Tekli Seçim',
    component: 'single-select',
    icon: 'circle-dot',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Seçiniz...' },
      { key: 'defaultOptionId', name: 'Varsayılan Seçenek', type: 'select', default: null },
    ],
    supportsOptions: true,
  },

  'multi-select': {
    id: 'multi-select',
    name: 'Çoklu Seçim',
    component: 'multi-select',
    icon: 'list-checks',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Seçiniz...' },
      { key: 'minSelections', name: 'Min Seçim', type: 'number', default: null },
      { key: 'maxSelections', name: 'Max Seçim', type: 'number', default: null },
    ],
    supportsOptions: true,
  },

  'checkbox': {
    id: 'checkbox',
    name: 'Onay Kutusu',
    component: 'checkbox',
    icon: 'square-check',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'defaultChecked', name: 'Varsayılan Değer', type: 'boolean', default: false },
    ],
    supportsOptions: false,
  },

  'date-picker': {
    id: 'date-picker',
    name: 'Tarih',
    component: 'date-picker',
    icon: 'calendar',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Tarih seçin...' },
      { 
        key: 'granularity', 
        name: 'Hassasiyet', 
        type: 'select', 
        options: ['day', 'hour', 'minute'],
        default: 'day' 
      },
    ],
    supportsOptions: false,
  },

  'user-picker': {
    id: 'user-picker',
    name: 'Kullanıcı Seçici',
    component: 'user-picker',
    icon: 'user',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Kullanıcı seçin...' },
      { key: 'allowMultiple', name: 'Çoklu Seçim', type: 'boolean', default: false },
    ],
    supportsOptions: false,
  },

  'url-input': {
    id: 'url-input',
    name: 'URL',
    component: 'url-input',
    icon: 'link',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'https://...' },
    ],
    supportsOptions: false,
  },

  'email-input': {
    id: 'email-input',
    name: 'E-posta',
    component: 'email-input',
    icon: 'mail',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'email@example.com' },
    ],
    supportsOptions: false,
  },

  'cascading-select': {
    id: 'cascading-select',
    name: 'Bağımlı Seçim',
    component: 'cascading-select',
    icon: 'git-branch',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Seçiniz...' },
      { key: 'levels', name: 'Seviye Sayısı', type: 'number', default: 2 },
    ],
    supportsOptions: true, // Nested options structure
  },

  'user-multi-picker': {
    id: 'user-multi-picker',
    name: 'Çoklu Kullanıcı Seçici',
    component: 'user-multi-picker',
    icon: 'users',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Kullanıcıları seçin...' },
      { key: 'maxUsers', name: 'Max Kullanıcı', type: 'number', default: null },
      { key: 'projectMembersOnly', name: 'Sadece Proje Üyeleri', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'version-picker': {
    id: 'version-picker',
    name: 'Versiyon Seçici',
    component: 'version-picker',
    icon: 'tag',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Versiyon seçin...' },
      { key: 'allowMultiple', name: 'Çoklu Seçim', type: 'boolean', default: false },
      { key: 'showOnlyUnreleased', name: 'Sadece Yayınlanmamış', type: 'boolean', default: false },
    ],
    supportsOptions: false,
  },

  'component-picker': {
    id: 'component-picker',
    name: 'Bileşen Seçici',
    component: 'component-picker',
    icon: 'puzzle',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Bileşen seçin...' },
      { key: 'allowMultiple', name: 'Çoklu Seçim', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'label-picker': {
    id: 'label-picker',
    name: 'Etiket Seçici',
    component: 'label-picker',
    icon: 'tags',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Etiket seçin...' },
      { key: 'allowCreate', name: 'Yeni Etiket Oluştur', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'sprint-picker': {
    id: 'sprint-picker',
    name: 'Sprint Seçici',
    component: 'sprint-picker',
    icon: 'zap',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Sprint seçin...' },
      { key: 'showOnlyActive', name: 'Sadece Aktif Sprintler', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'issue-picker': {
    id: 'issue-picker',
    name: 'Issue Seçici',
    component: 'issue-picker',
    icon: 'ticket',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'Issue seçin...' },
      { key: 'allowMultiple', name: 'Çoklu Seçim', type: 'boolean', default: false },
      { key: 'sameProjectOnly', name: 'Sadece Aynı Proje', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'rating': {
    id: 'rating',
    name: 'Derecelendirme',
    component: 'rating',
    icon: 'star',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'maxRating', name: 'Max Değer', type: 'number', default: 5 },
      { key: 'allowHalf', name: 'Yarım Değer', type: 'boolean', default: false },
    ],
    supportsOptions: false,
  },

  'color-picker': {
    id: 'color-picker',
    name: 'Renk Seçici',
    component: 'color-picker',
    icon: 'palette',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'presetColors', name: 'Hazır Renkler', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'time-tracking': {
    id: 'time-tracking',
    name: 'Zaman Takibi',
    component: 'time-tracking',
    icon: 'clock',
    configSchema: [
      ...COMMON_CONFIG,
      { 
        key: 'format', 
        name: 'Format', 
        type: 'select', 
        options: ['hours', 'days', 'story_points'],
        default: 'hours' 
      },
    ],
    supportsOptions: false,
  },

  'rich-text': {
    id: 'rich-text',
    name: 'Zengin Metin',
    component: 'rich-text',
    icon: 'file-text',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'placeholder', name: 'Placeholder', type: 'string', default: 'İçerik yazın...' },
      { key: 'enableImages', name: 'Resim Ekle', type: 'boolean', default: true },
      { key: 'enableTables', name: 'Tablo Ekle', type: 'boolean', default: true },
    ],
    supportsOptions: false,
  },

  'attachment': {
    id: 'attachment',
    name: 'Dosya Eki',
    component: 'attachment',
    icon: 'paperclip',
    configSchema: [
      ...COMMON_CONFIG,
      { key: 'maxFiles', name: 'Max Dosya', type: 'number', default: 10 },
      { key: 'maxFileSize', name: 'Max Boyut (MB)', type: 'number', default: 10 },
      { key: 'allowedTypes', name: 'İzin Verilen Tipler', type: 'string', default: '*' },
    ],
    supportsOptions: false,
  },
} as const;

// Field type ID listesi
export const FIELD_TYPE_IDS = Object.keys(FIELD_TYPES) as (keyof typeof FIELD_TYPES)[];

// Yardımcı fonksiyonlar
export function getFieldType(fieldTypeId: string): FieldTypeDefinition | undefined {
  return FIELD_TYPES[fieldTypeId];
}

export function getDefaultConfig(fieldTypeId: string): Record<string, unknown> {
  const fieldType = FIELD_TYPES[fieldTypeId];
  if (!fieldType) return {};

  const config: Record<string, unknown> = {};
  for (const option of fieldType.configSchema) {
    config[option.key] = option.default;
  }
  return config;
}

export function getFieldTypeList(): FieldTypeDefinition[] {
  return Object.values(FIELD_TYPES);
}
