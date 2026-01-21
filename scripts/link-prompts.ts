/**
 * Link migrated prompts to a Supabase user
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEGACY_EMAIL = "nirav@infinitycorp.tech";
const NEW_USER_ID = "28821446-21d5-4228-b268-42cc47bb1172";

async function main() {
  console.log("🔗 Linking prompts to user...\n");
  console.log(`Legacy Email: ${LEGACY_EMAIL}`);
  console.log(`New User ID: ${NEW_USER_ID}\n`);

  // Check if profile exists
  let profile = await prisma.profile.findUnique({
    where: { id: NEW_USER_ID },
    select: { id: true, email: true, username: true, name: true }
  });

  if (!profile) {
    console.log("Creating profile...");
    profile = await prisma.profile.create({
      data: {
        id: NEW_USER_ID,
        email: LEGACY_EMAIL,
      },
      select: { id: true, email: true, username: true, name: true }
    });
    console.log("✅ Profile created\n");
  } else {
    console.log("✅ Profile exists:", profile.username || profile.email, "\n");
  }

  // Find prompts with legacy email (both with and without author)
  const orphanedPrompts = await prisma.prompt.findMany({
    where: {
      legacyAuthorEmail: { equals: LEGACY_EMAIL, mode: "insensitive" }
    },
    select: { id: true, title: true, authorId: true }
  });

  console.log(`Found ${orphanedPrompts.length} prompts with legacy email`);

  const unlinked = orphanedPrompts.filter(p => !p.authorId);
  const alreadyLinked = orphanedPrompts.filter(p => p.authorId);

  console.log(`  - Unlinked: ${unlinked.length}`);
  console.log(`  - Already linked: ${alreadyLinked.length}\n`);

  if (unlinked.length > 0) {
    // Update prompts to link to new user
    const result = await prisma.prompt.updateMany({
      where: {
        legacyAuthorEmail: { equals: LEGACY_EMAIL, mode: "insensitive" },
        authorId: null
      },
      data: {
        authorId: NEW_USER_ID
      }
    });

    console.log(`✅ Linked ${result.count} prompts to user`);
  }

  // Also update collections with legacy email
  const collectionsResult = await prisma.collection.updateMany({
    where: {
      legacyOwnerEmail: { equals: LEGACY_EMAIL, mode: "insensitive" },
      ownerId: null
    },
    data: {
      ownerId: NEW_USER_ID
    }
  });

  if (collectionsResult.count > 0) {
    console.log(`✅ Linked ${collectionsResult.count} collections to user`);
  }

  // Update profile prompt count
  const totalPrompts = await prisma.prompt.count({
    where: { authorId: NEW_USER_ID }
  });

  await prisma.profile.update({
    where: { id: NEW_USER_ID },
    data: { promptCount: totalPrompts }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   User now has ${totalPrompts} prompts`);

  await prisma.$disconnect();
  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
