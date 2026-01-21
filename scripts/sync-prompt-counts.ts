/**
 * Script to sync profile promptCount with actual prompt counts
 * Run with: npx tsx scripts/sync-prompt-counts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncPromptCounts() {
  console.log('Syncing profile prompt counts...\n');

  // Get all profiles
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      promptCount: true,
    },
  });

  for (const profile of profiles) {
    // Count actual published prompts for this user
    const actualCount = await prisma.prompt.count({
      where: {
        authorId: profile.id,
        status: 'published',
      },
    });

    if (profile.promptCount !== actualCount) {
      console.log(`${profile.username || profile.email}:`);
      console.log(`  Current count: ${profile.promptCount}`);
      console.log(`  Actual count:  ${actualCount}`);
      console.log(`  Updating...`);

      await prisma.profile.update({
        where: { id: profile.id },
        data: { promptCount: actualCount },
      });

      console.log(`  Done!\n`);
    } else {
      console.log(`${profile.username || profile.email}: OK (${actualCount} prompts)`);
    }
  }

  console.log('\nSync complete!');
}

syncPromptCounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
