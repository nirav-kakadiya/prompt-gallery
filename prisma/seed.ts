/**
 * Database Seed Script - Development Only
 * 
 * This script seeds the database with sample data for local development.
 * NOT intended for production use.
 * 
 * Note: In production, users are created via Supabase Auth which 
 * automatically creates profiles via database triggers.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sample prompts data
const samplePrompts = [
  {
    title: "Cyberpunk City at Night",
    promptText: "A futuristic cyberpunk city at night with neon lights reflecting off wet streets, towering skyscrapers with holographic advertisements, flying cars in the distance, cinematic lighting, ultra detailed, 8k resolution",
    type: "text-to-image",
    tags: ["cyberpunk", "city", "neon", "futuristic", "night"],
    category: "digital-art",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=450&fit=crop",
    copyCount: 1234,
    likeCount: 567,
    viewCount: 5678,
  },
  {
    title: "Mystical Forest Spirit",
    promptText: "An ethereal forest spirit with glowing eyes emerging from an ancient tree, bioluminescent mushrooms, magical particles floating in the air, volumetric fog, fantasy art style, highly detailed",
    type: "text-to-image",
    tags: ["fantasy", "forest", "spirit", "magical", "nature"],
    category: "fantasy",
    style: "fantasy-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=600&h=450&fit=crop",
    copyCount: 892,
    likeCount: 445,
    viewCount: 3421,
  },
  {
    title: "Anime Girl Portrait",
    promptText: "Beautiful anime girl with long flowing silver hair, cherry blossom petals falling around her, soft pink lighting, detailed eyes with reflections, studio ghibli style, high quality illustration",
    type: "text-to-image",
    tags: ["anime", "portrait", "girl", "cherry-blossom", "illustration"],
    category: "anime",
    style: "anime",
    thumbnailUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&h=450&fit=crop",
    copyCount: 2156,
    likeCount: 1023,
    viewCount: 8934,
  },
  {
    title: "Sci-Fi Space Station",
    promptText: "Massive space station orbiting a ringed planet, multiple docking bays with spacecraft, solar panels reflecting sunlight, nebula in the background, hard science fiction style, cinematic composition",
    type: "text-to-image",
    tags: ["sci-fi", "space", "station", "planet", "spacecraft"],
    category: "sci-fi",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=450&fit=crop",
    copyCount: 756,
    likeCount: 389,
    viewCount: 2567,
  },
  {
    title: "Cozy Coffee Shop Interior",
    promptText: "Warm and cozy coffee shop interior with exposed brick walls, vintage furniture, soft morning light streaming through large windows, plants hanging from ceiling, hygge aesthetic, architectural photography",
    type: "text-to-image",
    tags: ["interior", "cozy", "coffee-shop", "warm", "architecture"],
    category: "architecture",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=450&fit=crop",
    copyCount: 543,
    likeCount: 276,
    viewCount: 1890,
  },
  {
    title: "Epic Dragon Battle",
    promptText: "Massive dragon breathing fire during an epic battle with a knight in shining armor, stormy sky with lightning, dramatic lighting, dark fantasy style, highly detailed scales and armor, action pose",
    type: "text-to-image",
    tags: ["dragon", "fantasy", "battle", "knight", "epic"],
    category: "fantasy",
    style: "fantasy-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1577493340887-b7bfff550145?w=600&h=450&fit=crop",
    copyCount: 1567,
    likeCount: 823,
    viewCount: 6234,
  },
  {
    title: "Underwater Coral Kingdom",
    promptText: "Magnificent underwater kingdom built within a massive coral reef, bioluminescent sea creatures, ancient ruins with mysterious glowing symbols, rays of sunlight penetrating the deep blue water, fantasy underwater world",
    type: "text-to-image",
    tags: ["underwater", "coral", "fantasy", "ocean", "kingdom"],
    category: "fantasy",
    style: "fantasy-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=600&h=450&fit=crop",
    copyCount: 678,
    likeCount: 345,
    viewCount: 2345,
  },
  {
    title: "Steampunk Airship",
    promptText: "Ornate steampunk airship with brass gears and copper pipes, floating above Victorian London, hot air balloons in the background, sunset lighting with orange and purple hues, detailed mechanical parts",
    type: "text-to-image",
    tags: ["steampunk", "airship", "victorian", "mechanical", "fantasy"],
    category: "steampunk",
    style: "steampunk",
    thumbnailUrl: "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?w=600&h=450&fit=crop",
    copyCount: 923,
    likeCount: 456,
    viewCount: 3456,
  },
];

// Sample tags
const sampleTags = [
  { name: "cyberpunk", slug: "cyberpunk", category: "style" },
  { name: "fantasy", slug: "fantasy", category: "genre" },
  { name: "anime", slug: "anime", category: "style" },
  { name: "portrait", slug: "portrait", category: "subject" },
  { name: "landscape", slug: "landscape", category: "subject" },
  { name: "sci-fi", slug: "sci-fi", category: "genre" },
  { name: "photorealistic", slug: "photorealistic", category: "style" },
  { name: "abstract", slug: "abstract", category: "style" },
  { name: "nature", slug: "nature", category: "subject" },
  { name: "architecture", slug: "architecture", category: "subject" },
];

// Sample categories
const sampleCategories = [
  { name: "Digital Art", slug: "digital-art", description: "Digital illustrations and artwork", icon: "palette" },
  { name: "Fantasy", slug: "fantasy", description: "Magical and fantastical imagery", icon: "sparkles" },
  { name: "Sci-Fi", slug: "sci-fi", description: "Science fiction and futuristic concepts", icon: "rocket" },
  { name: "Anime", slug: "anime", description: "Anime and manga style art", icon: "star" },
  { name: "Photography", slug: "photography", description: "Photorealistic and photography styles", icon: "camera" },
  { name: "Architecture", slug: "architecture", description: "Buildings and interior design", icon: "building" },
  { name: "Nature", slug: "nature", description: "Landscapes and natural scenes", icon: "leaf" },
  { name: "Portrait", slug: "portrait", description: "Character and face focused art", icon: "user" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  // Check if we're in development
  if (process.env.NODE_ENV === "production") {
    console.log("⚠️  Seed script is for development only. Skipping in production.");
    return;
  }

  console.log("🌱 Starting database seed (Development Mode)...\n");

  // Clear existing data (be careful - this deletes all data!)
  console.log("🗑️  Clearing existing data...");
  try {
    await prisma.collectionPrompt.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.like.deleteMany();
    await prisma.promptTag.deleteMany();
    await prisma.prompt.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.apiKey.deleteMany();
    // Note: We don't delete profiles as they're managed by Supabase Auth
  } catch (error) {
    console.log("⚠️  Some tables may not exist yet, continuing...");
  }

  // Create tags
  console.log("🏷️  Creating tags...");
  for (const tag of sampleTags) {
    await prisma.tag.create({ data: tag });
  }

  // Create categories
  console.log("📁 Creating categories...");
  for (const category of sampleCategories) {
    await prisma.category.create({ data: category });
  }

  // Create prompts (without author - anonymous prompts for demo)
  console.log("✨ Creating prompts...");
  for (const promptData of samplePrompts) {
    const slug = generateSlug(promptData.title);
    const { tags, ...rest } = promptData;
    
    // Create the prompt
    const prompt = await prisma.prompt.create({
      data: {
        ...rest,
        slug,
        imageUrl: promptData.thumbnailUrl,
        status: "published",
        publishedAt: new Date(),
        metadata: {
          model: "Midjourney v6",
          modelVersion: "6.0",
        },
      },
    });

    // Create prompt-tag relationships
    for (const tagName of tags) {
      const tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (tag) {
        await prisma.promptTag.create({
          data: {
            promptId: prompt.id,
            tagId: tag.id,
          },
        }).catch(() => {
          // Tag might not exist, skip
        });
      }
    }
  }

  console.log("\n✅ Database seeded successfully!");
  console.log(`   - ${sampleTags.length} tags created`);
  console.log(`   - ${sampleCategories.length} categories created`);
  console.log(`   - ${samplePrompts.length} prompts created`);
  console.log("\n📝 Note: No users created - use Supabase Auth to create users.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
