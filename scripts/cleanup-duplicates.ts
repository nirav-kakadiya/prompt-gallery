/**
 * Cleanup duplicate prompts in Supabase
 *
 * Finds prompts with the same legacyPromptId and keeps only the oldest one.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding duplicate prompts...\n");

  // Get all prompts with legacyPromptId
  const prompts = await prisma.prompt.findMany({
    where: { legacyPromptId: { not: null } },
    select: { id: true, legacyPromptId: true, title: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total prompts with legacyPromptId: ${prompts.length}`);

  // Group by legacyPromptId
  const byLegacyId = new Map<string, typeof prompts>();
  for (const p of prompts) {
    const key = p.legacyPromptId!;
    if (!byLegacyId.has(key)) {
      byLegacyId.set(key, []);
    }
    byLegacyId.get(key)!.push(p);
  }

  // Find duplicates
  const duplicateGroups = [...byLegacyId.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`Groups with duplicates: ${duplicateGroups.length}`);

  if (duplicateGroups.length === 0) {
    console.log("\n✅ No duplicates found!");
    await prisma.$disconnect();
    return;
  }

  // Collect IDs to delete (keep the first/oldest one in each group)
  const idsToDelete: string[] = [];
  for (const [legacyId, group] of duplicateGroups) {
    // Keep first (oldest by createdAt due to orderBy), delete rest
    const toDelete = group.slice(1);
    console.log(`\nLegacy ID ${legacyId}: keeping 1, deleting ${toDelete.length}`);
    console.log(`  Keep: ${group[0].id} - ${group[0].title.substring(0, 40)}`);
    toDelete.forEach(p => {
      console.log(`  Delete: ${p.id}`);
      idsToDelete.push(p.id);
    });
  }

  console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate prompts...`);

  // Delete in batches
  const batchSize = 50;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);

    // Delete related records first
    await prisma.promptTag.deleteMany({
      where: { promptId: { in: batch } },
    });

    await prisma.collectionPrompt.deleteMany({
      where: { promptId: { in: batch } },
    });

    await prisma.like.deleteMany({
      where: { promptId: { in: batch } },
    });

    // Delete prompts
    await prisma.prompt.deleteMany({
      where: { id: { in: batch } },
    });

    console.log(`  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(idsToDelete.length / batchSize)}`);
  }

  console.log("\n✅ Cleanup complete!");

  // Verify
  const remaining = await prisma.prompt.count({
    where: { legacyPromptId: { not: null } },
  });
  console.log(`Remaining prompts with legacyPromptId: ${remaining}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
