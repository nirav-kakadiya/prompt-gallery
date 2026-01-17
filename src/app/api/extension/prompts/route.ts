import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";

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

    // Create prompt
    const prompt = await prisma.prompt.create({
      data: {
        title: title.trim(),
        slug,
        promptText: promptText.trim(),
        type,
        status: "published",
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        category: category || null,
        style: style || null,
        sourceUrl: sourceUrl || null,
        sourceType: sourceType || null,
        imageUrl: imageUrl || null,
        thumbnailUrl: imageUrl || null, // Use same image for thumbnail
        authorId: user.id,
        metadata: JSON.stringify({
          ...metadata,
          importedVia: "extension",
          importedAt: new Date().toISOString(),
        }),
        publishedAt: new Date(),
      },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    // Update user prompt count
    await prisma.user.update({
      where: { id: user.id },
      data: { promptCount: { increment: 1 } },
    });

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
