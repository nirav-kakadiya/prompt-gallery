/**
 * Restore Prompts from SQLite to Supabase
 *
 * This script migrates prompts from the local SQLite database (prisma/dev.db)
 * to Supabase PostgreSQL. It reads prompts authored by a specific user and
 * inserts them into Supabase with legacyPromptId and legacyAuthorEmail for
 * later linking to the user's Supabase account.
 *
 * Usage:
 *   npx tsx scripts/restore-prompts.ts
 *   npx tsx scripts/restore-prompts.ts --dry-run
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

// Configuration
const SQLITE_USER_ID = "cmkghqsnn00001q12jtx8cejd";
const LEGACY_EMAIL = "nirav@infinitycorp.tech";
const SQLITE_DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

// Check for dry run mode
const isDryRun = process.argv.includes("--dry-run");

// Types for SQLite data
interface SQLitePrompt {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: string;
  status: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  blurhash: string | null;
  tags: string | null; // JSON string
  category: string | null;
  style: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  authorId: string | null;
  viewCount: number;
  copyCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface SQLiteCollection {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: number; // SQLite uses 0/1 for boolean
  ownerId: string | null;
  promptCount: number;
  saveCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SQLiteCollectionPrompt {
  collectionId: string;
  promptId: string;
  displayOrder: number;
  addedAt: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("🔄 Restore Prompts from SQLite to Supabase\n");
  console.log(`📂 SQLite Database: ${SQLITE_DB_PATH}`);
  console.log(`📧 Legacy Email: ${LEGACY_EMAIL}`);
  console.log(`👤 SQLite User ID: ${SQLITE_USER_ID}`);

  if (isDryRun) {
    console.log("\n⚠️  DRY RUN MODE - No data will be written\n");
  }

  // Connect to SQLite
  let sqlite: Database.Database;
  try {
    sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
    console.log("✅ Connected to SQLite database\n");
  } catch (error) {
    console.error("❌ Failed to connect to SQLite database:", error);
    console.error("   Make sure prisma/dev.db exists");
    process.exit(1);
  }

  // Connect to Supabase via Prisma
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("✅ Connected to Supabase\n");
  } catch (error) {
    console.error("❌ Failed to connect to Supabase:", error);
    console.error("   Check your DATABASE_URL environment variable");
    process.exit(1);
  }

  try {
    // Step 1: Read prompts from SQLite
    console.log("📖 Reading prompts from SQLite...");
    const prompts = sqlite.prepare(`
      SELECT * FROM Prompt WHERE authorId = ?
    `).all(SQLITE_USER_ID) as SQLitePrompt[];

    console.log(`   Found ${prompts.length} prompts\n`);

    if (prompts.length === 0) {
      console.log("⚠️  No prompts found for the specified user");
      return;
    }

    // Step 2: Check for existing prompts in Supabase (avoid duplicates)
    const existingLegacyIds = new Set(
      (await prisma.prompt.findMany({
        where: { legacyPromptId: { not: null } },
        select: { legacyPromptId: true }
      })).map(p => p.legacyPromptId)
    );

    const newPrompts = prompts.filter(p => !existingLegacyIds.has(p.id));
    console.log(`📊 ${newPrompts.length} new prompts to migrate (${prompts.length - newPrompts.length} already exist)\n`);

    if (newPrompts.length === 0) {
      console.log("✅ All prompts already migrated!");
      return;
    }

    // Step 3: Get or create tags
    console.log("🏷️  Processing tags...");
    const tagCache = new Map<string, string>(); // name -> id

    // Collect all unique tags from prompts
    const allTags = new Set<string>();
    for (const prompt of newPrompts) {
      if (prompt.tags) {
        try {
          const tags = JSON.parse(prompt.tags) as string[];
          tags.forEach(tag => allTags.add(tag.toLowerCase().trim()));
        } catch {
          // Skip invalid JSON
        }
      }
    }
    console.log(`   Found ${allTags.size} unique tags`);

    if (!isDryRun) {
      // Create or get existing tags
      for (const tagName of allTags) {
        const slug = generateSlug(tagName);

        // First try to find by name
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });

        // If not found by name, try to find by slug (handles case where different names produce same slug)
        if (!tag) {
          tag = await prisma.tag.findUnique({ where: { slug } });
        }

        // If still not found, create it
        if (!tag) {
          try {
            tag = await prisma.tag.create({
              data: { name: tagName, slug }
            });
          } catch (error: unknown) {
            // Handle race condition or unexpected slug collision
            const prismaError = error as { code?: string };
            if (prismaError.code === 'P2002') {
              tag = await prisma.tag.findUnique({ where: { slug } });
            }
            if (!tag) {
              console.warn(`   ⚠️  Could not create or find tag: ${tagName}`);
              continue;
            }
          }
        }

        tagCache.set(tagName, tag.id);
      }
      console.log(`   Created/verified ${tagCache.size} tags in Supabase\n`);
    }

    // Step 4: Migrate prompts
    console.log("📝 Migrating prompts...");
    let successCount = 0;
    let errorCount = 0;
    const promptIdMapping = new Map<string, string>(); // old SQLite ID -> new Supabase ID

    for (const prompt of newPrompts) {
      try {
        // Check for slug collision and make unique if needed
        let slug = prompt.slug;
        let slugSuffix = 1;

        if (!isDryRun) {
          while (await prisma.prompt.findUnique({ where: { slug } })) {
            slug = `${prompt.slug}-${slugSuffix}`;
            slugSuffix++;
          }
        }

        // Parse tags
        let parsedTags: string[] = [];
        if (prompt.tags) {
          try {
            parsedTags = JSON.parse(prompt.tags) as string[];
          } catch {
            // Skip invalid JSON
          }
        }

        if (!isDryRun) {
          // Create prompt in Supabase
          const newPrompt = await prisma.prompt.create({
            data: {
              title: prompt.title,
              slug,
              promptText: prompt.promptText,
              type: prompt.type,
              status: prompt.status,
              imageUrl: prompt.imageUrl,
              thumbnailUrl: prompt.thumbnailUrl,
              videoUrl: prompt.videoUrl,
              blurhash: prompt.blurhash,
              category: prompt.category,
              style: prompt.style,
              sourceUrl: prompt.sourceUrl,
              sourceType: prompt.sourceType,
              legacyPromptId: prompt.id,
              legacyAuthorEmail: LEGACY_EMAIL,
              viewCount: prompt.viewCount,
              copyCount: prompt.copyCount,
              likeCount: prompt.likeCount,
              createdAt: new Date(prompt.createdAt),
              publishedAt: prompt.publishedAt ? new Date(prompt.publishedAt) : null,
              metadata: {},
            },
          });

          promptIdMapping.set(prompt.id, newPrompt.id);

          // Create prompt-tag relationships
          for (const tagName of parsedTags) {
            const tagId = tagCache.get(tagName.toLowerCase().trim());
            if (tagId) {
              await prisma.promptTag.create({
                data: {
                  promptId: newPrompt.id,
                  tagId,
                },
              }).catch(() => {
                // Relationship might already exist
              });
            }
          }
        }

        successCount++;
        if (successCount % 20 === 0 || successCount === newPrompts.length) {
          console.log(`   Progress: ${successCount}/${newPrompts.length} prompts`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to migrate "${prompt.title}":`, error);
      }
    }

    console.log(`\n   ✅ Successfully migrated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount}`);
    }

    // Step 5: Migrate collections
    console.log("\n📁 Migrating collections...");
    const collections = sqlite.prepare(`
      SELECT * FROM Collection WHERE ownerId = ?
    `).all(SQLITE_USER_ID) as SQLiteCollection[];

    console.log(`   Found ${collections.length} collections`);

    if (collections.length > 0) {
      // Check for existing collections
      const existingCollectionIds = new Set(
        (await prisma.collection.findMany({
          where: { legacyCollectionId: { not: null } },
          select: { legacyCollectionId: true }
        })).map(c => c.legacyCollectionId)
      );

      const newCollections = collections.filter(c => !existingCollectionIds.has(c.id));
      console.log(`   ${newCollections.length} new collections to migrate`);

      let collectionSuccessCount = 0;
      const collectionIdMapping = new Map<string, string>();

      for (const collection of newCollections) {
        try {
          if (!isDryRun) {
            const newCollection = await prisma.collection.create({
              data: {
                name: collection.name,
                description: collection.description,
                coverImageUrl: collection.coverImageUrl,
                isPublic: collection.isPublic === 1,
                legacyCollectionId: collection.id,
                legacyOwnerEmail: LEGACY_EMAIL,
                promptCount: collection.promptCount,
                saveCount: collection.saveCount,
                createdAt: new Date(collection.createdAt),
              },
            });

            collectionIdMapping.set(collection.id, newCollection.id);
          }
          collectionSuccessCount++;
        } catch (error) {
          console.error(`   ❌ Failed to migrate collection "${collection.name}":`, error);
        }
      }

      console.log(`   ✅ Successfully migrated: ${collectionSuccessCount} collections`);

      // Migrate collection-prompt relationships
      if (!isDryRun && collectionIdMapping.size > 0) {
        console.log("\n🔗 Migrating collection-prompt relationships...");

        const collectionPrompts = sqlite.prepare(`
          SELECT * FROM CollectionPrompt
          WHERE collectionId IN (${Array.from(collectionIdMapping.keys()).map(() => '?').join(',')})
        `).all(...Array.from(collectionIdMapping.keys())) as SQLiteCollectionPrompt[];

        let relationCount = 0;
        for (const cp of collectionPrompts) {
          const newCollectionId = collectionIdMapping.get(cp.collectionId);
          const newPromptId = promptIdMapping.get(cp.promptId);

          if (newCollectionId && newPromptId) {
            try {
              await prisma.collectionPrompt.create({
                data: {
                  collectionId: newCollectionId,
                  promptId: newPromptId,
                  displayOrder: cp.displayOrder,
                  addedAt: new Date(cp.addedAt),
                },
              });
              relationCount++;
            } catch {
              // Relationship might already exist or prompt might not have been migrated
            }
          }
        }
        console.log(`   ✅ Created ${relationCount} collection-prompt relationships`);
      }
    }

    // Step 6: Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`Prompts migrated: ${successCount}`);
    console.log(`Tags processed: ${tagCache.size}`);
    console.log(`Collections migrated: ${collections.length}`);
    console.log(`Legacy email set: ${LEGACY_EMAIL}`);

    if (isDryRun) {
      console.log("\n⚠️  DRY RUN - No data was actually written");
    } else {
      console.log("\n✅ Migration complete!");
      console.log("\n📌 NEXT STEP: Link prompts to user");
      console.log("   After the user signs up in Supabase, run:");
      console.log(`   POST /api/admin/link-prompts`);
      console.log(`   Headers: x-admin-secret: [ADMIN_SECRET]`);
      console.log(`   Body: { "legacyEmail": "${LEGACY_EMAIL}", "newUserId": "[USER_UUID]" }`);
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
