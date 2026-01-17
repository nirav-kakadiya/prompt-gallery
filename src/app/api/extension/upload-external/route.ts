import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

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

// Allowed image hosts for security
const ALLOWED_HOSTS = [
  "i.redd.it",
  "preview.redd.it",
  "external-preview.redd.it",
  "i.imgur.com",
  "imgur.com",
  "pbs.twimg.com",
  "abs.twimg.com",
];

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}

// POST /api/extension/upload-external - Download external image and store locally
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
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Image URL is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // Security check: only allow known image hosts
    if (!isAllowedHost(imageUrl)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_HOST", message: "Image host not allowed" } },
        { status: 400, headers: corsHeaders }
      );
    }

    // For now, we'll just return the original URL
    // In production, you would:
    // 1. Fetch the image from the external URL
    // 2. Validate it's actually an image (check content-type, magic bytes)
    // 3. Upload to your own storage (S3, Cloudflare R2, etc.)
    // 4. Return the new URL

    // This is a placeholder implementation that proxies the URL
    // In production, replace with actual upload logic

    try {
      // Verify the image is accessible
      const response = await fetch(imageUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PromptGallery/1.0)",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: { code: "FETCH_FAILED", message: "Could not access image" } },
          { status: 400, headers: corsHeaders }
        );
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_IMAGE", message: "URL does not point to an image" } },
          { status: 400, headers: corsHeaders }
        );
      }

      // For now, return the original URL
      // TODO: Implement actual image download and storage
      return NextResponse.json(
        {
          success: true,
          data: {
            uploadedUrl: imageUrl,
            originalUrl: imageUrl,
            // In production:
            // uploadedUrl: "https://your-storage.com/images/xxx.jpg",
          },
        },
        { headers: corsHeaders }
      );
    } catch (fetchError) {
      console.error("Error fetching external image:", fetchError);
      return NextResponse.json(
        { success: false, error: { code: "FETCH_FAILED", message: "Failed to fetch image" } },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Error processing external image:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to process image" } },
      { status: 500, headers: corsHeaders }
    );
  }
}
