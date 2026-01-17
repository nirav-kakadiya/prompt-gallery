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

/**
 * Generate a title for a prompt using Gemini 1.5 Flash (lowest cost text model)
 * This is optimized for cost efficiency while maintaining quality
 */
export async function generatePromptTitle(promptText: string): Promise<{
  success: boolean;
  title?: string;
  error?: string;
}> {
  try {
    const ai = getClient();
    
    // Use Gemini 2.5 models - these are the current stable models
    // Since gemini-2.5-flash-image works, text models should also work
    // Try in order: flash-lite (lowest cost) -> flash -> pro
    const modelNames = [
      process.env.TITLE_GEN_MODEL, // User-defined model (highest priority)
      "gemini-2.5-flash-lite",     // Lowest cost text model (fastest, cheapest)
      "gemini-2.5-flash",          // Balanced cost/performance
      "gemini-2.5-pro",            // Higher quality (more expensive)
      "gemini-2.0-flash-001",      // Older version fallback
    ].filter(Boolean) as string[];
    
    // Truncate prompt if too long to save costs (keep first 2000 chars)
    const truncatedPrompt = promptText.length > 2000 
      ? promptText.substring(0, 2000) + "..."
      : promptText;

    const prompt = `Create a very short and simple title for this AI art prompt. 

Requirements:
- Maximum 6 words (preferably 3-5 words)
- Simple and direct
- Focus on the main subject only
- No extra words or descriptions
- Just the essential concept

Example good titles:
- "Futuristic Cityscape"
- "Portrait Photography"
- "Abstract Art"
- "Nature Landscape"

Return ONLY the title, nothing else. No quotes, no explanations.

AI art prompt:
${truncatedPrompt}`;

    // Try each model name until one works
    let lastError: Error | null = null;
    for (const MODEL_NAME of modelNames) {
      try {
        console.log(`[GenAI] Trying to generate title with model: ${MODEL_NAME}`);

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            maxOutputTokens: 20, // Very short output - just a few words
            temperature: 0.5, // Lower temperature for more focused, simple titles
          },
        });

        // Extract text from response
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              const partData = part as { text?: string };
              if (partData.text) {
                let title = partData.text.trim();
                // Clean up title (remove quotes, extra whitespace, "Title:" prefixes, etc.)
                title = title
                  .replace(/^(Title|title|TITLE):\s*/i, '') // Remove "Title:" prefix
                  .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                  .replace(/^[-•]\s*/, '') // Remove leading dashes/bullets
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .trim();
                
                // Ensure title is short (max 8 words, prefer first 6)
                const words = title.split(/\s+/);
                const cleanTitle = words.length > 8 
                  ? words.slice(0, 8).join(' ')
                  : title;
                
                console.log(`[GenAI] Title generated successfully with ${MODEL_NAME}:`, cleanTitle);
                return {
                  success: true,
                  title: cleanTitle,
                };
              }
            }
          }
        }

        console.log(`[GenAI] No title in response from ${MODEL_NAME}`);
        // Continue to next model
        continue;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[GenAI] Model ${MODEL_NAME} failed:`, lastError.message);
        // Try next model
        continue;
      }
    }

    // All models failed - try with global location as fallback
    console.warn("[GenAI] All regional models failed, trying global location...");
    try {
      // Create a new client with global location
      const globalClient = new GoogleGenAI({
        vertexai: true,
        project: PROJECT_ID,
        location: "global", // Some models require global location
      });

      // Try gemini-2.5-flash-lite with global location
      const response = await globalClient.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
          maxOutputTokens: 20,
          temperature: 0.5,
        },
      });

      // Extract text from response
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            const partData = part as { text?: string };
            if (partData.text) {
              let title = partData.text.trim();
              title = title
                .replace(/^(Title|title|TITLE):\s*/i, '')
                .replace(/^["']|["']$/g, '')
                .replace(/^[-•]\s*/, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              const words = title.split(/\s+/);
              const cleanTitle = words.length > 8 
                ? words.slice(0, 8).join(' ')
                : title;
              
              console.log("[GenAI] Title generated successfully with global location:", cleanTitle);
              return {
                success: true,
                title: cleanTitle,
              };
            }
          }
        }
      }
    } catch (globalError) {
      console.error("[GenAI] Global location also failed:", globalError);
    }

    // All attempts failed
    console.error("[GenAI] All model attempts failed (regional and global).");
    console.error("[GenAI] Last error:", lastError?.message);
    console.error("[GenAI] To fix: Enable Gemini API in Google Cloud Console or set TITLE_GEN_MODEL env variable");
    
    return {
      success: false,
      error: `No Gemini models available. Please enable Gemini API in Google Cloud Console for region ${LOCATION} or global, or set TITLE_GEN_MODEL environment variable with a valid model name.`,
    };
  } catch (error) {
    console.error("Title generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate title",
    };
  }
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
