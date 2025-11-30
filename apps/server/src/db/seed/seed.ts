import { db } from '@/db';
import { fields } from '@/db/schema/field';
import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { getDefaultConfig } from '@taskmaster/constants';

async function seed() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await db.delete(issueTypeFields);
  await db.delete(fields);
  await db.delete(issueTypes);

  console.log('📦 Creating fields...');

  // Create sample fields
  const createdFields = await db
    .insert(fields)
    .values([
      {
        name: 'Başlık',
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
        fieldType: 'user-picker',
        icon: 'user',
        config: {
          ...getDefaultConfig('user-picker'),
        },
        options: [],
      },
      {
        name: 'Tahmini Süre (saat)',
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
        name: 'Bitiş Tarihi',
        fieldType: 'date-picker',
        icon: 'calendar',
        config: {
          ...getDefaultConfig('date-picker'),
        },
        options: [],
      },
      {
        name: 'Aktif Mi?',
        fieldType: 'checkbox',
        icon: 'square-check',
        config: {
          ...getDefaultConfig('checkbox'),
        },
        options: [],
      },
      {
        name: 'Referans URL',
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
        name: 'Görev',
        description: 'Standart görev türü',
        icon: 'square-check',
      },
      {
        name: 'Bug',
        description: 'Hata bildirimi',
        icon: 'bug',
      },
      {
        name: 'Özellik İsteği',
        description: 'Yeni özellik talebi',
        icon: 'lightbulb',
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

  const gorevType = createdTicketTypes.find((t) => t.name === 'Görev')!;
  const bugType = createdTicketTypes.find((t) => t.name === 'Bug')!;
  const featureType = createdTicketTypes.find((t) => t.name === 'Özellik İsteği')!;

  // Görev type fields
  await db.insert(issueTypeFields).values([
    { issueTypeId: gorevType.id, fieldId: fieldMap['Başlık'], order: 0 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Açıklama'], order: 1 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Öncelik'], order: 2 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Durum'], order: 3 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Atanan Kişi'], order: 4 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Tahmini Süre (saat)'], order: 5 },
    { issueTypeId: gorevType.id, fieldId: fieldMap['Bitiş Tarihi'], order: 6 },
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
    { issueTypeId: bugType.id, fieldId: fieldMap['Durum'], order: 3 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Atanan Kişi'], order: 4 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Etiketler'], order: 5 },
    { issueTypeId: bugType.id, fieldId: fieldMap['Referans URL'], order: 6 },
  ]);

  // Feature Request type fields
  await db.insert(issueTypeFields).values([
    {
      issueTypeId: featureType.id,
      fieldId: fieldMap['Başlık'],
      order: 0,
      // Override: Feature requests need longer titles
      configOverride: {
        maxLength: 500,
        placeholder: 'Özellik isteğinizi kısaca özetleyin',
      },
    },
    {
      issueTypeId: featureType.id,
      fieldId: fieldMap['Açıklama'],
      order: 1,
      configOverride: {
        isRequired: true, // Override: Description is required for features
        placeholder: 'Özelliğin ne yapması gerektiğini detaylı açıklayın',
      },
    },
    { issueTypeId: featureType.id, fieldId: fieldMap['Öncelik'], order: 2 },
    { issueTypeId: featureType.id, fieldId: fieldMap['Durum'], order: 3 },
    { issueTypeId: featureType.id, fieldId: fieldMap['Etiketler'], order: 4 },
    { issueTypeId: featureType.id, fieldId: fieldMap['Tahmini Süre (saat)'], order: 5 },
    { issueTypeId: featureType.id, fieldId: fieldMap['Aktif Mi?'], order: 6 },
  ]);

  console.log('✅ Assigned fields to ticket types');

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
