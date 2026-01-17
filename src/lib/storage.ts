import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const R2_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const R2_SECRET_KEY = process.env.S3_SECRET_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_BASE_URL = process.env.R2_BASE_URL!;
const R2_FOLDER_NAME = process.env.R2_FOLDER_NAME || "prompt-gallery";

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export type MediaType = "image" | "video";

interface UploadResult {
  url: string;
  key: string;
  contentType: string;
}

/**
 * Get the content type for converted media
 */
function getConvertedContentType(mediaType: MediaType): string {
  return mediaType === "image" ? "image/webp" : "video/webm";
}

/**
 * Get the file extension for converted media
 */
function getConvertedExtension(mediaType: MediaType): string {
  return mediaType === "image" ? "webp" : "webm";
}

/**
 * Upload a file buffer to R2
 */
export async function uploadToR2(
  buffer: Buffer,
  mediaType: MediaType,
  originalFilename?: string
): Promise<UploadResult> {
  const extension = getConvertedExtension(mediaType);
  const contentType = getConvertedContentType(mediaType);
  const uniqueId = uuidv4();
  const timestamp = Date.now();
  const key = `${R2_FOLDER_NAME}/${mediaType}s/${timestamp}-${uniqueId}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        originalFilename: originalFilename || "unknown",
      },
    })
  );

  const url = `${R2_BASE_URL}${key}`;

  return {
    url,
    key,
    contentType,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Extract key from R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url.startsWith(R2_BASE_URL)) {
    return null;
  }
  return url.replace(R2_BASE_URL, "");
}
