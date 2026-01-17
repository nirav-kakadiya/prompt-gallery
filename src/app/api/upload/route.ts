import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/storage";
import {
  convertImageToWebp,
  createThumbnail,
  validateImage,
  validateVideoHeader,
} from "@/lib/media-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mediaType = formData.get("mediaType") as "image" | "video" | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_FILE", message: "No file provided" },
        },
        { status: 400 }
      );
    }

    if (!mediaType || !["image", "video"].includes(mediaType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MEDIA_TYPE",
            message: "Media type must be 'image' or 'video'",
          },
        },
        { status: 400 }
      );
    }

    // Check file size
    const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `File too large. Max size: ${maxSize / (1024 * 1024)}MB`,
          },
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (mediaType === "image") {
      // Validate image
      const validation = await validateImage(buffer);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_IMAGE", message: validation.error },
          },
          { status: 400 }
        );
      }

      // Convert to WebP
      const webpBuffer = await convertImageToWebp(buffer, {
        quality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      // Create thumbnail
      const thumbnailBuffer = await createThumbnail(buffer, {
        width: 400,
        height: 400,
        quality: 80,
      });

      // Upload both to R2
      const [mainResult, thumbnailResult] = await Promise.all([
        uploadToR2(webpBuffer, "image", file.name),
        uploadToR2(thumbnailBuffer, "image", `thumb_${file.name}`),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          imageUrl: mainResult.url,
          thumbnailUrl: thumbnailResult.url,
          contentType: mainResult.contentType,
        },
      });
    } else {
      // Validate video header
      const validation = validateVideoHeader(buffer);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_VIDEO", message: validation.error },
          },
          { status: 400 }
        );
      }

      // For video, we upload as-is for now
      // Full WebM conversion would require ffmpeg which needs server-side setup
      // The client can provide a video URL or upload directly
      const result = await uploadToR2(buffer, "video", file.name);

      return NextResponse.json({
        success: true,
        data: {
          videoUrl: result.url,
          contentType: result.contentType,
        },
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Upload failed",
        },
      },
      { status: 500 }
    );
  }
}
