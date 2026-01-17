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
 * Generate a title and tags for a prompt using Gemini (lowest cost text model)
 * This is optimized for cost efficiency while maintaining quality
 */
export async function generatePromptTitle(promptText: string): Promise<{
  success: boolean;
  title?: string;
  tags?: string[];
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

    const prompt = `Analyze this AI art prompt and generate:
1. A very short and simple title
2. Relevant tags in a structured format

SYSTEM INSTRUCTIONS:
- Understand the prompt content, style, subject, and artistic elements
- Generate appropriate tags based on the prompt's content, style, subject matter, and artistic characteristics
- Tags should be relevant, descriptive, and help categorize the prompt

TITLE REQUIREMENTS:
- Maximum 6 words (preferably 3-5 words)
- Simple and direct
- Focus on the main subject only
- No extra words or descriptions
- Just the essential concept

TAGS REQUIREMENTS:
- Generate 3-8 relevant tags based on the prompt content
- Tags should cover: subject matter, style, artistic elements, mood, technique
- Use lowercase, single words or short phrases (max 2 words per tag)
- Avoid generic tags like "ai", "art", "prompt"
- Focus on specific, descriptive tags that help categorize the prompt
- Examples: "portrait", "photorealistic", "cinematic", "nature", "fantasy", "anime", "cyberpunk", "vibrant", "minimalist"

OUTPUT FORMAT (JSON only, no other text):
{
  "title": "Short Title Here",
  "tags": ["tag1", "tag2", "tag3"]
}

Example output:
{
  "title": "Futuristic Cityscape",
  "tags": ["futuristic", "cityscape", "cyberpunk", "neon", "night", "urban"]
}

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
            maxOutputTokens: 150, // Increased for JSON with title and tags
            temperature: 0.5, // Lower temperature for more focused output
          },
        });

        // Extract text from response
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              const partData = part as { text?: string };
              if (partData.text) {
                let responseText = partData.text.trim();
                
                // Try to parse as JSON first
                try {
                  // Extract JSON from response (handle markdown code blocks)
                  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    
                    // Clean and validate title
                    let title = (parsed.title || '').trim();
                    title = title
                      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                      .replace(/^[-•]\s*/, '') // Remove leading dashes/bullets
                      .replace(/\s+/g, ' ') // Normalize whitespace
                      .trim();
                    
                    // Ensure title is short (max 8 words)
                    const words = title.split(/\s+/);
                    const cleanTitle = words.length > 8 
                      ? words.slice(0, 8).join(' ')
                      : title;
                    
                    // Clean and validate tags
                    let tags: string[] = [];
                    if (Array.isArray(parsed.tags)) {
                      tags = parsed.tags
                        .map((tag: any) => String(tag).toLowerCase().trim())
                        .filter((tag: string) => tag.length > 0 && tag.length <= 30) // Max 30 chars per tag
                        .slice(0, 8); // Max 8 tags
                    }
                    
                    if (cleanTitle) {
                      console.log(`[GenAI] Title and tags generated successfully with ${MODEL_NAME}:`, { title: cleanTitle, tags });
                      return {
                        success: true,
                        title: cleanTitle,
                        tags: tags.length > 0 ? tags : undefined,
                      };
                    }
                  }
                } catch (jsonError) {
                  // If JSON parsing fails, try to extract title from plain text
                  console.warn(`[GenAI] Failed to parse JSON, trying plain text extraction:`, jsonError);
                }
                
                // Fallback: Extract title from plain text response
                let title = responseText
                  .replace(/^(Title|title|TITLE):\s*/i, '') // Remove "Title:" prefix
                  .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                  .replace(/^[-•]\s*/, '') // Remove leading dashes/bullets
                  .split('\n')[0] // Get first line only
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .trim();
                
                // Ensure title is short (max 8 words)
                const words = title.split(/\s+/);
                const cleanTitle = words.length > 8 
                  ? words.slice(0, 8).join(' ')
                  : title;
                
                if (cleanTitle) {
                  console.log(`[GenAI] Title generated successfully with ${MODEL_NAME} (plain text fallback):`, cleanTitle);
                  return {
                    success: true,
                    title: cleanTitle,
                  };
                }
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
