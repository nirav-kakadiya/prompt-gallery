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
  {
    title: "Minimalist Product Shot",
    promptText: "Clean minimalist product photography of a luxury perfume bottle on white marble surface, soft studio lighting, subtle shadows, professional advertising quality, 4k, sharp focus",
    type: "text-to-image",
    tags: ["product", "minimalist", "photography", "luxury", "commercial"],
    category: "product",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=450&fit=crop",
    copyCount: 432,
    likeCount: 189,
    viewCount: 1567,
  },
  {
    title: "Abstract Fluid Art",
    promptText: "Mesmerizing abstract fluid art with swirling colors of deep purple, electric blue, and molten gold, high contrast, smooth gradients, ink in water effect, 4k wallpaper quality",
    type: "text-to-image",
    tags: ["abstract", "fluid", "colorful", "wallpaper", "art"],
    category: "abstract",
    style: "abstract",
    thumbnailUrl: "https://images.unsplash.com/photo-1541356665065-22676f35dd40?w=600&h=450&fit=crop",
    copyCount: 867,
    likeCount: 423,
    viewCount: 3234,
  },
  {
    title: "Cinematic Mountain Landscape",
    promptText: "Breathtaking mountain landscape at golden hour, snow-capped peaks reflecting in a crystal clear alpine lake, dramatic clouds, National Geographic quality, wide angle lens, epic scale",
    type: "text-to-image",
    tags: ["landscape", "mountain", "nature", "cinematic", "golden-hour"],
    category: "nature",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=450&fit=crop",
    copyCount: 1456,
    likeCount: 789,
    viewCount: 5678,
  },
  {
    title: "Vintage Film Noir Portrait",
    promptText: "Classic film noir style portrait of a mysterious woman in a 1940s detective office, dramatic shadows from venetian blinds, black and white, high contrast, cigarette smoke curling in the light",
    type: "text-to-image",
    tags: ["noir", "vintage", "portrait", "black-and-white", "cinematic"],
    category: "portrait",
    style: "cinematic",
    thumbnailUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=450&fit=crop",
    copyCount: 345,
    likeCount: 178,
    viewCount: 1234,
  },
  {
    title: "Futuristic Robot Character",
    promptText: "Sleek humanoid robot with glowing blue circuitry patterns, chrome and matte black surfaces, standing in a high-tech laboratory, dramatic rim lighting, concept art for AAA game",
    type: "text-to-image",
    tags: ["robot", "sci-fi", "character", "futuristic", "concept-art"],
    category: "character-design",
    style: "concept-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=450&fit=crop",
    copyCount: 1089,
    likeCount: 567,
    viewCount: 4567,
  },
  {
    title: "Magical Potion Bottle",
    promptText: "Ornate glass potion bottle filled with swirling purple and pink magical liquid, floating sparkles inside, placed on an ancient wooden table with scattered herbs and old books, fantasy RPG item art",
    type: "text-to-image",
    tags: ["potion", "magic", "fantasy", "rpg", "item"],
    category: "game-art",
    style: "fantasy-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=600&h=450&fit=crop",
    copyCount: 623,
    likeCount: 312,
    viewCount: 2345,
  },
  {
    title: "Tropical Paradise Beach",
    promptText: "Pristine tropical beach with crystal clear turquoise water, white sand, palm trees swaying in the breeze, hammock between palms, perfect vacation destination, travel photography style",
    type: "text-to-image",
    tags: ["beach", "tropical", "paradise", "travel", "vacation"],
    category: "travel",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop",
    copyCount: 978,
    likeCount: 534,
    viewCount: 4123,
  },
  {
    title: "Dreamy Waterfall Animation",
    promptText: "Serene animated loop of a magical waterfall in an enchanted forest, fireflies dancing in the mist, soft moonlight filtering through ancient trees, looping seamlessly, cinemagraph style",
    type: "text-to-video",
    tags: ["waterfall", "animation", "loop", "magical", "forest"],
    category: "animation",
    style: "fantasy-art",
    thumbnailUrl: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&h=450&fit=crop",
    copyCount: 234,
    likeCount: 123,
    viewCount: 987,
  },
  {
    title: "Photo to Oil Painting",
    promptText: "Transform photo into classic oil painting style, visible brushstrokes, rich color palette, baroque lighting, canvas texture, museum quality masterpiece, Rembrandt inspired",
    type: "image-to-image",
    tags: ["oil-painting", "transform", "classic", "artistic", "style-transfer"],
    category: "style-transfer",
    style: "oil-painting",
    thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=450&fit=crop",
    copyCount: 567,
    likeCount: 289,
    viewCount: 2134,
  },
  {
    title: "Neon Glow Effect",
    promptText: "Add vibrant neon glow effect to portrait, cyberpunk color scheme with pink and cyan, lens flare, light trails, futuristic club lighting, dramatic transformation",
    type: "image-to-image",
    tags: ["neon", "glow", "cyberpunk", "effect", "portrait"],
    category: "effects",
    style: "cyberpunk",
    thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=450&fit=crop",
    copyCount: 789,
    likeCount: 423,
    viewCount: 3456,
  },
  {
    title: "Photo to Anime",
    promptText: "Convert real photo to high quality anime style illustration, Studio Ghibli aesthetic, soft cel shading, detailed eyes, dreamy background, maintain likeness",
    type: "image-to-image",
    tags: ["anime", "conversion", "illustration", "ghibli", "style-transfer"],
    category: "style-transfer",
    style: "anime",
    thumbnailUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&h=450&fit=crop",
    copyCount: 1456,
    likeCount: 834,
    viewCount: 6789,
  },
  {
    title: "Living Photograph",
    promptText: "Animate still photograph with subtle movement, hair flowing in breeze, clouds drifting slowly, leaves rustling, birds flying in distance, peaceful cinemagraph loop",
    type: "image-to-video",
    tags: ["animation", "cinemagraph", "living-photo", "loop", "subtle"],
    category: "animation",
    style: "photorealistic",
    thumbnailUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=450&fit=crop",
    copyCount: 345,
    likeCount: 178,
    viewCount: 1234,
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
  { name: "character", slug: "character", category: "subject" },
  { name: "cinematic", slug: "cinematic", category: "style" },
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
  console.log("🌱 Starting database seed...\n");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.collectionPrompt.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.like.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  console.log("👤 Creating test users...");
  const testUser = await prisma.user.create({
    data: {
      email: "demo@promptgallery.com",
      name: "Demo User",
      username: "demo",
      bio: "A demo user for testing the Prompt Gallery",
      role: "user",
    },
  });

  const creatorUser = await prisma.user.create({
    data: {
      email: "creator@promptgallery.com",
      name: "AI Art Creator",
      username: "aicreator",
      bio: "Professional AI art prompt creator",
      role: "creator",
    },
  });

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

  // Create prompts with all fields
  console.log("✨ Creating prompts...");
  const createdPrompts = [];
  for (let i = 0; i < samplePrompts.length; i++) {
    const prompt = samplePrompts[i];
    const slug = generateSlug(prompt.title);
    
    // Assign author - alternate between users
    const authorId = i % 2 === 0 ? testUser.id : creatorUser.id;
    
    // Create metadata based on prompt type
    const metadata: any = {
      model: prompt.type.includes("video") ? "Runway Gen-2" : "Midjourney v6",
      modelVersion: prompt.type.includes("video") ? "2.0" : "6.0",
      submissionSource: i < 3 ? "extension" : i < 6 ? "web" : "api",
    };
    
    // Add parameters for some prompts
    if (i % 3 === 0) {
      metadata.parameters = {
        steps: 50,
        cfgScale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
        sampler: "DPM++ 2M Karras",
        width: 1024,
        height: 1024,
      };
    }
    
    // Add negative prompt for some
    if (i % 4 === 0) {
      metadata.negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy";
    }
    
    // Set sourceUrl and sourceType for extension-sourced prompts
    const sourceUrl = i < 3 ? `https://twitter.com/user/status/${1234567890 + i}` : null;
    const sourceType = i < 3 ? "twitter" : i < 6 ? "reddit" : null;
    
    // Set imageUrl (use thumbnailUrl as fallback)
    const imageUrl = prompt.thumbnailUrl;
    
    // Set videoUrl for video types
    const videoUrl = prompt.type.includes("video") 
      ? `https://example.com/videos/${slug}.mp4` 
      : null;
    
    const createdPrompt = await prisma.prompt.create({
      data: {
        title: prompt.title,
        slug,
        promptText: prompt.promptText,
        type: prompt.type,
        tags: JSON.stringify(prompt.tags),
        category: prompt.category,
        style: prompt.style,
        thumbnailUrl: prompt.thumbnailUrl,
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        blurhash: null, // Can be added later if needed
        sourceUrl: sourceUrl,
        sourceType: sourceType,
        authorId: authorId,
        metadata: JSON.stringify(metadata),
        status: "published",
        publishedAt: new Date(),
        copyCount: prompt.copyCount,
        likeCount: prompt.likeCount,
        viewCount: prompt.viewCount,
      },
    });
    
    createdPrompts.push(createdPrompt);
  }

  // Update user prompt counts
  console.log("📊 Updating user stats...");
  await prisma.user.update({
    where: { id: testUser.id },
    data: { promptCount: Math.ceil(samplePrompts.length / 2) },
  });
  await prisma.user.update({
    where: { id: creatorUser.id },
    data: { promptCount: Math.floor(samplePrompts.length / 2) },
  });

  // Create some likes
  console.log("❤️  Creating likes...");
  for (let i = 0; i < Math.min(10, createdPrompts.length); i++) {
    await prisma.like.create({
      data: {
        userId: i % 2 === 0 ? testUser.id : creatorUser.id,
        promptId: createdPrompts[i].id,
      },
    });
  }

  // Create a sample collection
  console.log("📚 Creating collections...");
  const collection = await prisma.collection.create({
    data: {
      name: "My Favorite Prompts",
      description: "A collection of my favorite AI art prompts",
      isPublic: true,
      ownerId: testUser.id,
      promptCount: 5,
    },
  });

  // Add some prompts to collection
  for (let i = 0; i < 5; i++) {
    await prisma.collectionPrompt.create({
      data: {
        collectionId: collection.id,
        promptId: createdPrompts[i].id,
        displayOrder: i,
      },
    });
  }

  console.log("\n✅ Database seeded successfully!");
  console.log(`   - 2 users created`);
  console.log(`   - ${sampleTags.length} tags created`);
  console.log(`   - ${sampleCategories.length} categories created`);
  console.log(`   - ${samplePrompts.length} prompts created`);
  console.log(`   - 10 likes created`);
  console.log(`   - 1 collection created with 5 prompts`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
