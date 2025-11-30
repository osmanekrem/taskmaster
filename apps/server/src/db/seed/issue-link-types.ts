// =============================================================================
// ISSUE LINK TYPES SEED
// =============================================================================

import { db } from '../index';
import { issueLinkTypes, DEFAULT_LINK_TYPES } from '../schema/issue-links';
import { eq } from 'drizzle-orm';

export async function seedIssueLinkTypes() {
  console.log('🔗 Seeding issue link types...');

  for (const linkType of DEFAULT_LINK_TYPES) {
    // Check if link type already exists
    const existing = await db
      .select()
      .from(issueLinkTypes)
      .where(eq(issueLinkTypes.name, linkType.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(issueLinkTypes).values(linkType);
      console.log(`  ✓ Created link type: ${linkType.name}`);
    } else {
      console.log(`  ⊘ Link type already exists: ${linkType.name}`);
    }
  }

  console.log('✅ Issue link types seeded successfully\n');
}

// Run if called directly
if (import.meta.main) {
  seedIssueLinkTypes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to seed issue link types:', error);
      process.exit(1);
    });
}
