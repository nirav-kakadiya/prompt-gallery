import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { generateSlug, hashPromptText } from "@/lib/utils";
import { generateImage } from "@/lib/vertex-ai";
import { uploadToR2 } from "@/lib/storage";
import { convertImageToWebp, createThumbnail } from "@/lib/media-converter";

export const runtime = "nodejs";

// CORS headers for extension requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/extension/prompts - Create prompt from extension
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please log in to save prompts" } },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const {
      title,
      promptText,
      type = "text-to-image",
      tags = [],
      category,
      style,
      sourceUrl,
      sourceType,
      imageUrl,
      metadata = {},
    } = body;

    // Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!promptText?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Prompt text is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate type
    const validTypes = ["text-to-image", "image-to-image", "text-to-video", "image-to-video"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid prompt type" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let slugExists = await prisma.prompt.findUnique({ where: { slug } });
    let attempts = 0;
    while (slugExists && attempts < 10) {
      slug = generateSlug(title) + "-" + Math.random().toString(36).substring(2, 6);
      slugExists = await prisma.prompt.findUnique({ where: { slug } });
      attempts++;
    }

    const shouldGenerateImage = !imageUrl && !!promptText?.trim();
    const initialStatus = shouldGenerateImage ? "pending_image" : "published";
    const publishedAt = shouldGenerateImage ? null : new Date();

    // Compute hash for duplicate detection
    const promptTextHash = hashPromptText(promptText.trim());

    // Create prompt
    let prompt;
    try {
      prompt = await prisma.prompt.create({
        data: {
          title: title.trim(),
          slug,
          promptText: promptText.trim(),
          promptTextHash,
          type,
          status: initialStatus,
          category: category || null,
          style: style || null,
          sourceUrl: sourceUrl || null,
          sourceType: sourceType || null,
          imageUrl: imageUrl || null,
          thumbnailUrl: imageUrl || null, // Use same image for thumbnail
          authorId: user.id,
          metadata: {
            ...metadata,
            importedVia: "extension",
            importedAt: new Date().toISOString(),
          },
          publishedAt,
        },
        select: {
          id: true,
          slug: true,
          title: true,
        },
      });
    } catch (error) {
      // Handle duplicate prompt error
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("prompt_text_hash")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_PROMPT",
              message: "This prompt already exists in your gallery",
            },
          },
          { status: 409, headers: corsHeaders }
        );
      }
      throw error;
    }

    // Create tags via junction table
    const tagNames = Array.isArray(tags) ? tags : [];
    for (const tagName of tagNames) {
      if (!tagName?.trim()) continue;
      const tag = await prisma.tag.upsert({
        where: { name: tagName.trim() },
        create: {
          name: tagName.trim(),
          slug: tagName.trim().toLowerCase().replace(/\s+/g, '-'),
        },
        update: {},
      });
      await prisma.promptTag.create({
        data: {
          promptId: prompt.id,
          tagId: tag.id,
        },
      }).catch(() => {
        // Ignore duplicate
      });
    }

    // Update user prompt count (profile tracks this in Supabase)
    await prisma.profile.update({
      where: { id: user.id },
      data: { promptCount: { increment: 1 } },
    }).catch(() => {
      // Profile update may fail if triggers handle it
    });

    // Fire-and-forget image generation for text-only prompts
    if (shouldGenerateImage) {
      void generateAndAttachImage({
        promptId: prompt.id,
        promptText: promptText.trim(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: prompt.id,
          slug: prompt.slug,
          url: `/prompts/${prompt.slug}`,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error creating prompt from extension:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save prompt" } },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function generateAndAttachImage({
  promptId,
  promptText,
}: {
  promptId: string;
  promptText: string;
}) {
  try {
    const result = await generateImage(promptText);
    if (!result.success || !result.imageData) {
      console.error("[GenAI] Image generation failed for prompt:", promptId, result.error);
      return;
    }

    const imageBuffer = Buffer.from(result.imageData, "base64");
    const [webpBuffer, thumbnailBuffer] = await Promise.all([
      convertImageToWebp(imageBuffer, {
        quality: 90,
        maxWidth: 1920,
        maxHeight: 1920,
      }),
      createThumbnail(imageBuffer, {
        width: 400,
        height: 400,
        quality: 80,
      }),
    ]);

    const [mainResult, thumbnailResult] = await Promise.all([
      uploadToR2(webpBuffer, "image", `generated_${Date.now()}.webp`),
      uploadToR2(thumbnailBuffer, "image", `generated_thumb_${Date.now()}.webp`),
    ]);

    await prisma.prompt.update({
      where: { id: promptId },
      data: {
        imageUrl: mainResult.url,
        thumbnailUrl: thumbnailResult.url,
        status: "published",
        publishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[GenAI] Failed to attach generated image:", error);
  }
}

// GET /api/extension/prompts - Get user's recent prompts (for extension)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please log in" } },
        { status: 401, headers: corsHeaders }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    const prompts = await prisma.prompt.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        thumbnailUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: prompts },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching prompts for extension:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch prompts" } },
      { status: 500, headers: corsHeaders }
    );
  }
}
