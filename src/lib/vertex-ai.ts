import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION || "us-east4";
const MODEL_NAME = process.env.IMAGE_GEN_MODEL || "gemini-2.5-flash-image";

// Initialize client with Vertex AI backend
let client: GoogleGenAI | null = null;
let credentialsFilePath: string | null = null;

/**
 * Write service account credentials to a temp file and set GOOGLE_APPLICATION_CREDENTIALS
 * This is required because the @google/genai SDK uses ADC (Application Default Credentials)
 */
function setupCredentials(): void {
  if (credentialsFilePath && fs.existsSync(credentialsFilePath)) {
    return; // Already set up
  }

  const credentials = {
    type: "service_account",
    project_id: PROJECT_ID,
    private_key_id: "auto-generated",
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    client_id: "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "")}`,
  };

  // Write credentials to a temp file
  const tempDir = os.tmpdir();
  credentialsFilePath = path.join(tempDir, `gcp-credentials-${Date.now()}.json`);
  fs.writeFileSync(credentialsFilePath, JSON.stringify(credentials, null, 2));

  // Set the environment variable for ADC
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;

  console.log(`[GenAI] Credentials written to: ${credentialsFilePath}`);
}

function getClient(): GoogleGenAI {
  if (!client) {
    // Set up credentials file first
    setupCredentials();

    client = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    });
  }
  return client;
}

export interface ImageGenerationResult {
  success: boolean;
  imageData?: string; // Base64 encoded image
  error?: string;
}

/**
 * Generate an image using Gemini 2.5 Flash Image model
 * Uses the @google/genai SDK with Vertex AI backend
 */
export async function generateImage(prompt: string): Promise<ImageGenerationResult> {
  try {
    const ai = getClient();

    console.log(`[GenAI] Generating image with model: ${MODEL_NAME}, location: ${LOCATION}`);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          const partData = part as { inlineData?: { data: string; mimeType: string } };
          if (partData.inlineData?.data) {
            console.log("[GenAI] Image generated successfully");
            return {
              success: true,
              imageData: partData.inlineData.data,
            };
          }
        }
      }
    }

    console.log("[GenAI] No image in response");
    return {
      success: false,
      error: "No image was generated. The model may not support this prompt.",
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

/**
 * Alternative: Use Imagen 3 model for image generation
 * This is the dedicated image generation model from Google
 */
export async function generateImageWithImagen(prompt: string): Promise<ImageGenerationResult> {
  try {
    // Set up credentials first
    setupCredentials();

    const { GoogleAuth } = await import("google-auth-library");

    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error("Failed to get access token");
    }

    const response = await fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenResponse.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_some",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      if (prediction.bytesBase64Encoded) {
        return {
          success: true,
          imageData: prediction.bytesBase64Encoded,
        };
      }
    }

    return {
      success: false,
      error: "No image was generated",
    };
  } catch (error) {
    console.error("Imagen generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
