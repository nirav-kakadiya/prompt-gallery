import sharp from "sharp";

/**
 * Convert an image buffer to WebP format
 * WebP provides better compression and quality for web use
 */
export async function convertImageToWebp(
  buffer: Buffer,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<Buffer> {
  const { quality = 85, maxWidth = 1920, maxHeight = 1920 } = options;

  let image = sharp(buffer);

  // Get image metadata
  const metadata = await image.metadata();

  // Resize if larger than max dimensions while maintaining aspect ratio
  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > maxWidth || metadata.height > maxHeight)
  ) {
    image = image.resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to WebP
  return image.webp({ quality }).toBuffer();
}

/**
 * Create a thumbnail from an image buffer
 */
export async function createThumbnail(
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): Promise<Buffer> {
  const { width = 400, height = 400, quality = 80 } = options;

  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality })
    .toBuffer();
}

/**
 * Validate if a buffer is a valid image
 */
export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean;
  format?: string;
  width?: number;
  height?: number;
  error?: string;
}> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.format) {
      return { valid: false, error: "Unknown image format" };
    }

    const allowedFormats = ["jpeg", "jpg", "png", "gif", "webp", "avif", "tiff"];
    if (!allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        error: `Unsupported format: ${metadata.format}. Allowed: ${allowedFormats.join(", ")}`,
      };
    }

    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid image",
    };
  }
}

/**
 * Validate if a buffer appears to be a video file
 * Note: For full video validation, you'd need ffprobe or similar
 */
export function validateVideoHeader(buffer: Buffer): {
  valid: boolean;
  format?: string;
  error?: string;
} {
  // Check for common video file signatures
  const signatures: Record<string, number[][]> = {
    mp4: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4
      [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    webm: [[0x1a, 0x45, 0xdf, 0xa3]], // EBML header
    mov: [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74]],
  };

  // Check for ftyp box (common in MP4/MOV)
  const ftypIndex = buffer.indexOf(Buffer.from("ftyp"));
  if (ftypIndex >= 0 && ftypIndex <= 8) {
    return { valid: true, format: "mp4" };
  }

  // Check for WebM signature
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, format: "webm" };
  }

  // Check for AVI
  if (buffer.length >= 12) {
    const riff = buffer.slice(0, 4).toString("ascii");
    const avi = buffer.slice(8, 12).toString("ascii");
    if (riff === "RIFF" && avi === "AVI ") {
      return { valid: true, format: "avi" };
    }
  }

  return {
    valid: false,
    error: "Unrecognized video format. Supported: MP4, WebM, MOV, AVI",
  };
}

/**
 * Get file type from buffer
 */
export async function getFileType(buffer: Buffer): Promise<{
  type: "image" | "video" | "unknown";
  format?: string;
}> {
  // Try image first
  const imageValidation = await validateImage(buffer);
  if (imageValidation.valid) {
    return { type: "image", format: imageValidation.format };
  }

  // Try video
  const videoValidation = validateVideoHeader(buffer);
  if (videoValidation.valid) {
    return { type: "video", format: videoValidation.format };
  }

  return { type: "unknown" };
}
