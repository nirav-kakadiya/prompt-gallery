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

    // Generate title and tags using Gemini (lowest cost model)
    const result = await generatePromptTitle(promptText.trim());

    if (result.success && result.title) {
      return NextResponse.json(
        {
          success: true,
          data: {
            title: result.title,
            tags: result.tags || [], // Include tags if generated
          },
        },
        { headers: corsHeaders }
      );
    }

    // If generation fails, return success with empty title (graceful degradation)
    // The extension will use the temporary title instead
    console.warn("Title generation failed, returning empty title for graceful fallback:", result.error);
    return NextResponse.json(
      {
        success: true, // Return success so extension doesn't show error
        data: {
          title: "", // Empty title - extension will use temporary title
          tags: [], // Empty tags array
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
