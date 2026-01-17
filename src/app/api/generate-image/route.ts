import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/vertex-ai";
import { uploadToR2 } from "@/lib/storage";
import { convertImageToWebp, createThumbnail } from "@/lib/media-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for image generation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PROMPT", message: "Prompt is required" },
        },
        { status: 400 }
      );
    }

    if (prompt.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROMPT_TOO_SHORT",
            message: "Prompt must be at least 3 characters",
          },
        },
        { status: 400 }
      );
    }

    // Generate image using Gemini 2.5 Flash (nano banana)
    const result = await generateImage(prompt);

    if (!result.success || !result.imageData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GENERATION_FAILED",
            message: result.error || "Failed to generate image",
          },
        },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(result.imageData, "base64");

    // Convert to WebP and create thumbnail
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

    // Upload to R2
    const [mainResult, thumbnailResult] = await Promise.all([
      uploadToR2(webpBuffer, "image", `generated_${Date.now()}.webp`),
      uploadToR2(thumbnailBuffer, "image", `generated_thumb_${Date.now()}.webp`),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: mainResult.url,
        thumbnailUrl: thumbnailResult.url,
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GENERATION_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate image",
        },
      },
      { status: 500 }
    );
  }
}
