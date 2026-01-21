import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePromptTitle } from "@/lib/vertex-ai";

// CORS headers for extension requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/extension/generate-title - Generate title for a prompt using LLM
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please log in" } },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { promptText } = body;

    if (!promptText || typeof promptText !== "string" || !promptText.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Prompt text is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate title, tags, category, style, and metadata using Gemini (one call)
    const result = await generatePromptTitle(promptText.trim());

    if (result.success && result.title) {
      return NextResponse.json(
        {
          success: true,
          data: {
            title: result.title,
            tags: result.tags || [],
            category: result.category || null,
            style: result.style || null,
            metadata: result.metadata || {},
          },
        },
        { headers: corsHeaders }
      );
    }

    // If generation fails, return success with empty values (graceful degradation)
    console.warn("Analysis failed, returning empty values for graceful fallback:", result.error);
    return NextResponse.json(
      {
        success: true,
        data: {
          title: "",
          tags: [],
          category: null,
          style: null,
          metadata: {},
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate title",
        },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
