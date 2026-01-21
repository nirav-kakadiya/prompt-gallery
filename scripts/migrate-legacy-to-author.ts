/**
 * Script to migrate legacy_author_email to proper authorId relationships
 * Then legacy columns can be removed from the schema
 *
 * Run with: npx tsx scripts/migrate-legacy-to-author.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateLegacyToAuthor() {
  console.log('Migrating legacy_author_email to authorId...\n');

  // Find all prompts that have legacy_author_email but no authorId
  const promptsWithLegacyEmail = await prisma.prompt.findMany({
    where: {
      legacyAuthorEmail: { not: null },
    },
    select: {
      id: true,
      title: true,
      authorId: true,
      legacyAuthorEmail: true,
    },
  });

  console.log(`Found ${promptsWithLegacyEmail.length} prompts with legacy_author_email\n`);

  // Group by email to minimize profile lookups
  const emailToPrompts = new Map<string, typeof promptsWithLegacyEmail>();
  for (const prompt of promptsWithLegacyEmail) {
    const email = prompt.legacyAuthorEmail!;
    if (!emailToPrompts.has(email)) {
      emailToPrompts.set(email, []);
    }
    emailToPrompts.get(email)!.push(prompt);
  }

  console.log(`Unique legacy emails: ${emailToPrompts.size}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const [email, prompts] of emailToPrompts) {
    // Find profile by email
    const profile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true, username: true, name: true },
    });

    if (!profile) {
      console.log(`⚠ No profile found for email: ${email} (${prompts.length} prompts)`);
      notFoundCount += prompts.length;
      continue;
    }

    console.log(`\nProcessing ${email} -> @${profile.username || profile.name} (${profile.id})`);
    console.log(`  ${prompts.length} prompts to update`);

    // Update all prompts: set authorId and clear legacy fields
    const result = await prisma.prompt.updateMany({
      where: {
        id: { in: prompts.map(p => p.id) },
      },
      data: {
        authorId: profile.id,
        legacyAuthorEmail: null,
        legacyPromptId: null,
      },
    });

    updatedCount += result.count;
    console.log(`  ✓ Updated ${result.count} prompts (cleared legacy fields)`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Migration complete!');
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Already correct: ${skippedCount}`);
  console.log(`  No profile found: ${notFoundCount}`);
  console.log('='.repeat(50));

  // Show remaining prompts with legacy fields (if any)
  const remaining = await prisma.prompt.count({
    where: {
      OR: [
        { legacyAuthorEmail: { not: null } },
        { legacyPromptId: { not: null } },
      ],
    },
  });

  if (remaining > 0) {
    console.log(`\n⚠ ${remaining} prompts still have legacy fields (no matching profile)`);
  } else {
    console.log('\n✓ All legacy fields have been cleared!');
    console.log('You can now safely remove legacy columns from the schema.');
  }
}

migrateLegacyToAuthor()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
