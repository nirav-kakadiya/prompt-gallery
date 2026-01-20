import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dbFeatureFlags } from "@/lib/db/feature-flag";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Check if SQLite/Prisma is available (not on serverless)
 */
const isSqliteAvailable = !(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Lazy-load Prisma only when SQLite is available
 */
async function getPrisma() {
  if (!isSqliteAvailable) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// GET /api/collections - List user's collections
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      const { data: collections, error } = await supabase
        .from('collections')
        .select(`
          id, name, description, is_public, cover_image_url, prompt_count, created_at, updated_at
        `)
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // Get preview prompts for each collection
      const collectionsWithPreviews = await Promise.all(
        (collections || []).map(async (collection: any) => {
          const { data: collectionPrompts } = await supabase
            .from('collection_prompts')
            .select(`
              prompt:prompts(id, title, image_url)
            `)
            .eq('collection_id', collection.id)
            .limit(4);
          
          return {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            isPublic: collection.is_public,
            coverImageUrl: collection.cover_image_url,
            promptCount: collection.prompt_count || 0,
            createdAt: collection.created_at,
            updatedAt: collection.updated_at,
            _count: { prompts: collection.prompt_count || 0 },
            prompts: (collectionPrompts || []).map((cp: any) => ({
              prompt: cp.prompt ? {
                id: cp.prompt.id,
                title: cp.prompt.title,
                imageUrl: cp.prompt.image_url,
              } : null
            })).filter((p: any) => p.prompt),
          };
        })
      );
      
      return NextResponse.json(collectionsWithPreviews);
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json([]);
    }

    const collections = await prisma.collection.findMany({
      where: { ownerId: user.id },
      include: {
        _count: { select: { prompts: true } },
        prompts: {
          take: 4,
          include: {
            prompt: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic = false } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      const { data: collection, error } = await supabase
        .from('collections')
        .insert({
          name,
          description,
          is_public: isPublic,
          owner_id: user.id,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      
      return NextResponse.json({
        id: (collection as any).id,
        name: (collection as any).name,
        description: (collection as any).description,
        isPublic: (collection as any).is_public,
        ownerId: (collection as any).owner_id,
        createdAt: (collection as any).created_at,
        updatedAt: (collection as any).updated_at,
      }, { status: 201 });
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        description,
        isPublic,
        ownerId: user.id,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Failed to create collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
