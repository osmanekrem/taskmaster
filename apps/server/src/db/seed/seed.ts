import { db } from '@/db';
import { fields } from '@/db/schema/field';
import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { statuses, resolutions } from '@/db/schema/statuses';
import { workflows, workflowStatuses, workflowTransitions } from '@/db/schema/workflows';
import { projects } from '@/db/schema/projects';
import { projectIssueTypes } from '@/db/schema/issue-type-junctions';
import { getDefaultConfig, DEFAULT_STATUSES, DEFAULT_RESOLUTIONS, ISSUE_TYPE_HIERARCHY } from '@taskmaster/constants';

async function seed() {
  console.log('🌱 Starting seed...');

  // Clear existing data (order matters due to foreign keys)
  await db.delete(projectIssueTypes);
  await db.delete(projects);
  await db.delete(workflowTransitions);
  await db.delete(workflowStatuses);
  await db.delete(workflows);
  await db.delete(issueTypeFields);
  await db.delete(fields);
  await db.delete(issueTypes);
  await db.delete(resolutions);
  await db.delete(statuses);

  // ========================================
  // STATUSES
  // ========================================
  console.log('📦 Creating statuses...');

  const createdStatuses = await db
    .insert(statuses)
    .values(
      DEFAULT_STATUSES.map((s) => ({
        name: s.name,
        description: s.description,
        category: s.category,
        color: s.color,
        icon: s.icon,
        isSystem: s.isSystem,
      })),
    )
    .returning();

  console.log(`✅ Created ${createdStatuses.length} statuses`);

  // Map status names to IDs
  const statusMap = Object.fromEntries(
    createdStatuses.map((s) => [s.name, s.id]),
  );

  // ========================================
  // RESOLUTIONS
  // ========================================
  console.log('📦 Creating resolutions...');

  const createdResolutions = await db
    .insert(resolutions)
    .values(
      DEFAULT_RESOLUTIONS.map((r) => ({
        name: r.name,
        description: r.description,
        isDefault: r.isDefault,
        isSystem: r.isSystem,
      })),
    )
    .returning();

  console.log(`✅ Created ${createdResolutions.length} resolutions`);

  // ========================================
  // WORKFLOWS
  // ========================================
  console.log('📦 Creating default workflow...');

  const [defaultWorkflow] = await db
    .insert(workflows)
    .values({
      name: 'Varsayılan Workflow',
      description: 'Temel issue workflow\'u - Open, In Progress, Done',
      isDefault: true,
    })
    .returning();

  console.log(`✅ Created workflow: ${defaultWorkflow.name}`);

  // Add statuses to workflow
  console.log('📦 Adding statuses to workflow...');

  await db.insert(workflowStatuses).values([
    { workflowId: defaultWorkflow.id, statusId: statusMap['Açık'], isInitial: true, sortOrder: 0 },
    { workflowId: defaultWorkflow.id, statusId: statusMap['Devam Ediyor'], isInitial: false, sortOrder: 1 },
    { workflowId: defaultWorkflow.id, statusId: statusMap['İncelemede'], isInitial: false, sortOrder: 2 },
    { workflowId: defaultWorkflow.id, statusId: statusMap['Tamamlandı'], isInitial: false, sortOrder: 3 },
    { workflowId: defaultWorkflow.id, statusId: statusMap['İptal Edildi'], isInitial: false, sortOrder: 4 },
  ]);

  console.log('✅ Added statuses to workflow');

  // Add transitions
  console.log('📦 Creating workflow transitions...');

  await db.insert(workflowTransitions).values([
    // From Open
    {
      workflowId: defaultWorkflow.id,
      name: 'Başlat',
      description: 'Issue üzerinde çalışmaya başla',
      fromStatusId: statusMap['Açık'],
      toStatusId: statusMap['Devam Ediyor'],
      sortOrder: 0,
    },
    // From In Progress
    {
      workflowId: defaultWorkflow.id,
      name: 'İncelemeye Gönder',
      description: 'İnceleme için hazır',
      fromStatusId: statusMap['Devam Ediyor'],
      toStatusId: statusMap['İncelemede'],
      sortOrder: 1,
    },
    {
      workflowId: defaultWorkflow.id,
      name: 'Tamamla',
      description: 'İşi bitir',
      fromStatusId: statusMap['Devam Ediyor'],
      toStatusId: statusMap['Tamamlandı'],
      sortOrder: 2,
    },
    // From In Review
    {
      workflowId: defaultWorkflow.id,
      name: 'Değişiklik İste',
      description: 'Düzeltme gerekiyor',
      fromStatusId: statusMap['İncelemede'],
      toStatusId: statusMap['Devam Ediyor'],
      sortOrder: 3,
    },
    {
      workflowId: defaultWorkflow.id,
      name: 'Onayla',
      description: 'İnceleme tamamlandı',
      fromStatusId: statusMap['İncelemede'],
      toStatusId: statusMap['Tamamlandı'],
      sortOrder: 4,
    },
    // From Done
    {
      workflowId: defaultWorkflow.id,
      name: 'İptal Et',
      description: 'Issue\'yu iptal et',
      fromStatusId: statusMap['Tamamlandı'],
      toStatusId: statusMap['İptal Edildi'],
      sortOrder: 5,
    },
    {
      workflowId: defaultWorkflow.id,
      name: 'Yeniden Aç',
      description: 'İşi tekrar aç',
      fromStatusId: statusMap['Tamamlandı'],
      toStatusId: statusMap['Açık'],
      sortOrder: 6,
    },
    // Global transitions (from any status)
    {
      workflowId: defaultWorkflow.id,
      name: 'Hızlı İptal',
      description: 'Issue\'yu herhangi bir yerden iptal et',
      fromStatusId: null, // Global transition
      toStatusId: statusMap['İptal Edildi'],
      sortOrder: 7,
    },
  ]);

  console.log('✅ Created workflow transitions');

  // ========================================
  // FIELDS
  // ========================================
  console.log('📦 Creating fields...');

  // Create sample fields
  const createdFields = await db
    .insert(fields)
    .values([
      {
        name: 'Başlık',
        slug: 'summary', // Critical: used for cache sync
        fieldType: 'text-input',
        icon: 'type',
        config: {
          ...getDefaultConfig('text-input'),
          isRequired: true,
          placeholder: 'Kısa bir başlık girin',
          maxLength: 200,
        },
        options: [],
      },
      {
        name: 'Açıklama',
        slug: 'description',
        fieldType: 'text-area',
        icon: 'align-left',
        config: {
          ...getDefaultConfig('text-area'),
          placeholder: 'Detaylı açıklama yazın',
          minLength: 10,
          maxLength: 5000,
        },
        options: [],
      },
      {
        name: 'Öncelik',
        slug: 'priority', // Critical: used for cache sync
        fieldType: 'single-select',
        icon: 'circle-alert',
        config: {
          ...getDefaultConfig('single-select'),
          isRequired: true,
        },
        options: [
          { id: 'priority-low', name: 'Düşük', icon: 'arrow-down', order: 0 },
          { id: 'priority-medium', name: 'Orta', icon: 'minus', order: 1 },
          { id: 'priority-high', name: 'Yüksek', icon: 'arrow-up', order: 2 },
          { id: 'priority-critical', name: 'Kritik', icon: 'triangle-alert', order: 3 },
        ],
      },
      {
        name: 'Durum',
        slug: 'status_field',
        fieldType: 'single-select',
        icon: 'circle-check',
        config: {
          ...getDefaultConfig('single-select'),
          isRequired: true,
        },
        options: [
          { id: 'status-todo', name: 'Yapılacak', icon: 'circle', order: 0 },
          { id: 'status-inprogress', name: 'Devam Ediyor', icon: 'clock', order: 1 },
          { id: 'status-review', name: 'İnceleme', icon: 'eye', order: 2 },
          { id: 'status-done', name: 'Tamamlandı', icon: 'circle-check', order: 3 },
        ],
      },
      {
        name: 'Etiketler',
        slug: 'labels',
        fieldType: 'multi-select',
        icon: 'tags',
        config: {
          ...getDefaultConfig('multi-select'),
        },
        options: [
          { id: 'tag-bug', name: 'Bug', icon: 'bug', order: 0 },
          { id: 'tag-feature', name: 'Özellik', icon: 'sparkles', order: 1 },
          { id: 'tag-improvement', name: 'İyileştirme', icon: 'trending-up', order: 2 },
          { id: 'tag-docs', name: 'Dokümantasyon', icon: 'book-open', order: 3 },
        ],
      },
      {
        name: 'Atanan Kişi',
        slug: 'assignee',
        fieldType: 'user-picker',
        icon: 'user',
        config: {
          ...getDefaultConfig('user-picker'),
        },
        options: [],
      },
      {
        name: 'Tahmini Süre (saat)',
        slug: 'estimated_hours',
        fieldType: 'number-input',
        icon: 'clock',
        config: {
          ...getDefaultConfig('number-input'),
          min: 0,
          max: 1000,
          step: 0.5,
        },
        options: [],
      },
      {
        name: 'Story Points',
        slug: 'story_points', // Critical: used for sprint analytics
        fieldType: 'number-input',
        icon: 'target',
        config: {
          ...getDefaultConfig('number-input'),
          min: 0,
          max: 100,
          step: 1,
        },
        options: [],
      },
      {
        name: 'Bitiş Tarihi',
        slug: 'due_date',
        fieldType: 'date-picker',
        icon: 'calendar',
        config: {
          ...getDefaultConfig('date-picker'),
        },
        options: [],
      },
      {
        name: 'Aktif Mi?',
        slug: 'is_active',
        fieldType: 'checkbox',
        icon: 'square-check',
        config: {
          ...getDefaultConfig('checkbox'),
        },
        options: [],
      },
      {
        name: 'Referans URL',
        slug: 'reference_url',
        fieldType: 'url-input',
        icon: 'link',
        config: {
          ...getDefaultConfig('url-input'),
          placeholder: 'https://...',
        },
        options: [],
      },
    ])
    .returning();

  console.log(`✅ Created ${createdFields.length} fields`);

  // Create sample ticket types
  console.log('📦 Creating ticket types...');

  const createdTicketTypes = await db
    .insert(issueTypes)
    .values([
      {
        name: 'Epic',
        description: 'Büyük özellik veya proje',
        icon: 'zap',
        hierarchyLevel: ISSUE_TYPE_HIERARCHY.EPIC,
      },
      {
        name: 'Görev',
        description: 'Standart görev türü',
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
        name: 'Story',
        description: 'Kullanıcı hikayesi',
        icon: 'book-open',
        hierarchyLevel: ISSUE_TYPE_HIERARCHY.STANDARD,
      },
      {
        name: 'Alt Görev',
        description: 'Bir görevin alt parçası',
        icon: 'list-checks',
        hierarchyLevel: ISSUE_TYPE_HIERARCHY.SUBTASK,
      },
    ])
    .returning();

  console.log(`✅ Created ${createdTicketTypes.length} ticket types`);

  // Map field names to their IDs
  const fieldMap = Object.fromEntries(
    createdFields.map((f) => [f.name, f.id]),
  );

  // Assign fields to ticket types
  console.log('📦 Assigning fields to ticket types...');

  const epicType = createdTicketTypes.find((t) => t.name === 'Epic')!;
  const gorevType = createdTicketTypes.find((t) => t.name === 'Görev')!;
  const bugType = createdTicketTypes.find((t) => t.name === 'Bug')!;
  const storyType = createdTicketTypes.find((t) => t.name === 'Story')!;
  const subtaskType = createdTicketTypes.find((t) => t.name === 'Alt Görev')!;

  // Epic type fields
  await db.insert(issueTypeFields).values([
    { issueTypeId: epicType.id, fieldId: fieldMap['Başlık'], order: 0 },
    { issueTypeId: epicType.id, fieldId: fieldMap['Açıklama'], order: 1 },
    { issueTypeId: epicType.id, fieldId: fieldMap['Öncelik'], order: 2 },
    { issueTypeId: epicType.id, fieldId: fieldMap['Atanan Kişi'], order: 3 },
    { issueTypeId: epicType.id, fieldId: fieldMap['Bitiş Tarihi'], order: 4 },
  ]);

  // Görev type fields
  await db.insert(issueTypeFields).values([
    { issueTypeId: gorevType.id, fieldId: fieldMap['Başlık'], order: 0 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Açıklama'], order: 1 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Öncelik'], order: 2 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Atanan Kişi'], order: 3 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Tahmini Süre (saat)'], order: 4 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Bitiş Tarihi'], order: 5 },
  ]);

  // Bug type fields (with override for priority)
  await db.insert(issueTypeFields).values([
    { issueTypeId: bugType.id, fieldId: fieldMap['Başlık'], order: 0 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Açıklama'], order: 1 },
    {
      issueTypeId: bugType.id,
      fieldId: fieldMap['Öncelik'],
      order: 2,
      // Override: Bugs get a different priority list
      optionsOverride: [
        { id: 'bug-low', name: 'Düşük Öncelik', icon: 'arrow-down', order: 0 },
        { id: 'bug-medium', name: 'Orta Öncelik', icon: 'minus', order: 1 },
        { id: 'bug-high', name: 'Yüksek Öncelik', icon: 'arrow-up', order: 2 },
        { id: 'bug-blocker', name: 'Blocker', icon: 'ban', order: 3 },
      ],
    },
    { issueTypeId: bugType.id, fieldId: fieldMap['Atanan Kişi'], order: 3 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Etiketler'], order: 4 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Referans URL'], order: 5 },
  ]);

  // Story type fields
  await db.insert(issueTypeFields).values([
    {
      issueTypeId: storyType.id,
      fieldId: fieldMap['Başlık'],
      order: 0,
      configOverride: {
        placeholder: 'Kullanıcı olarak, ... istiyorum',
      },
    },
    {
      issueTypeId: storyType.id,
      fieldId: fieldMap['Açıklama'],
      order: 1,
      configOverride: {
        isRequired: true,
        placeholder: 'Kabul kriterleri ve detaylar',
      },
    },
    { issueTypeId: storyType.id, fieldId: fieldMap['Öncelik'], order: 2 },
    { issueTypeId: storyType.id, fieldId: fieldMap['Atanan Kişi'], order: 3 },
    { issueTypeId: storyType.id, fieldId: fieldMap['Tahmini Süre (saat)'], order: 4 },
  ]);

  // Subtask type fields (minimal)
  await db.insert(issueTypeFields).values([
    { issueTypeId: subtaskType.id, fieldId: fieldMap['Başlık'], order: 0 },
    { issueTypeId: subtaskType.id, fieldId: fieldMap['Açıklama'], order: 1 },
    { issueTypeId: subtaskType.id, fieldId: fieldMap['Atanan Kişi'], order: 2 },
    { issueTypeId: subtaskType.id, fieldId: fieldMap['Tahmini Süre (saat)'], order: 3 },
  ]);

  console.log('✅ Assigned fields to ticket types');

  // ========================================
  // PROJECTS
  // ========================================
  console.log('📦 Creating sample project...');

  const [demoProject] = await db
    .insert(projects)
    .values({
      name: 'Demo Proje',
      key: 'DEMO',
      description: 'Örnek proje - tüm issue türlerini içerir',
      defaultWorkflowId: defaultWorkflow.id,
      settings: {
        issueKeyPrefix: 'DEMO',
        nextIssueNumber: 1,
        enableSprints: true,
        enableTimeTracking: true,
        defaultAssigneeRule: 'unassigned',
      },
    })
    .returning();

  console.log(`✅ Created project: ${demoProject.name} (${demoProject.key})`);

  // Add issue types to project
  console.log('📦 Adding issue types to project...');

  await db.insert(projectIssueTypes).values([
    { projectId: demoProject.id, issueTypeId: epicType.id, workflowId: null }, // Uses project default
    { projectId: demoProject.id, issueTypeId: gorevType.id, workflowId: null },
    { projectId: demoProject.id, issueTypeId: bugType.id, workflowId: null },
    { projectId: demoProject.id, issueTypeId: storyType.id, workflowId: null },
    { projectId: demoProject.id, issueTypeId: subtaskType.id, workflowId: null },
  ]);

  console.log('✅ Added issue types to project');

  console.log('🎉 Seed completed successfully!');
}

seed()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
