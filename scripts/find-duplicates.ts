/**
 * Find and remove duplicate prompts based on title + promptText
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🔍 Finding duplicate prompts by title + promptText...\n");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No data will be deleted\n");
  }

  // Get all prompts
  const prompts = await prisma.prompt.findMany({
    select: {
      id: true,
      title: true,
      promptText: true,
      createdAt: true,
      authorId: true,
      legacyPromptId: true
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total prompts: ${prompts.length}\n`);

  // Group by title + promptText hash
  const groups = new Map<string, typeof prompts>();

  for (const p of prompts) {
    // Create a key from title + first 500 chars of promptText
    const key = `${p.title}|||${p.promptText.substring(0, 500)}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }

  // Find duplicates
  const duplicateGroups = [...groups.entries()].filter(([, arr]) => arr.length > 1);

  console.log(`Unique prompts: ${groups.size}`);
  console.log(`Groups with duplicates: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log("✅ No duplicates found!");
    await prisma.$disconnect();
    return;
  }

  // Show duplicates and collect IDs to delete
  const idsToDelete: string[] = [];

  for (const [key, group] of duplicateGroups) {
    const title = key.split("|||")[0];
    console.log(`\n📄 "${title.substring(0, 50)}..." (${group.length} copies)`);

    // Keep the one with authorId set, or the oldest one
    const sorted = group.sort((a, b) => {
      // Prefer ones with authorId
      if (a.authorId && !b.authorId) return -1;
      if (!a.authorId && b.authorId) return 1;
      // Then by createdAt (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const keep = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(`   ✓ Keep: ${keep.id} (authorId: ${keep.authorId ? 'yes' : 'no'}, created: ${keep.createdAt.toISOString().split('T')[0]})`);

    for (const p of toDelete) {
      console.log(`   ✗ Delete: ${p.id} (authorId: ${p.authorId ? 'yes' : 'no'}, created: ${p.createdAt.toISOString().split('T')[0]})`);
      idsToDelete.push(p.id);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Total duplicates to delete: ${idsToDelete.length}`);
  console.log(`${"=".repeat(50)}\n`);

  if (isDryRun) {
    console.log("⚠️  DRY RUN - No changes made. Run without --dry-run to delete.");
    await prisma.$disconnect();
    return;
  }

  // Delete duplicates
  console.log("🗑️  Deleting duplicates...");

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

    console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(idsToDelete.length / batchSize)}`);
  }

  // Verify
  const remaining = await prisma.prompt.count();
  console.log(`\n✅ Done! Remaining prompts: ${remaining}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
