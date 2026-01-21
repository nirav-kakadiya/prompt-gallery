/**
 * Prompt Analyzer
 *
 * Intelligently extracts metadata from any prompt format:
 * - Plain text prompts
 * - Structured JSON prompts
 * - Various JSON schemas
 *
 * Uses pattern matching and heuristics to extract useful information.
 */

export interface ExtractedMetadata {
  style?: string;
  category?: string;
  camera?: string;
  lens?: string;
  lighting?: string;
  aspectRatio?: string;
  mood?: string;
  environment?: string;
  negativePrompt?: string;
  model?: string;
  parameters?: Record<string, unknown>;
}

export interface AnalysisResult {
  /** The main prompt text to use for generation */
  mainPrompt: string;
  /** Extracted metadata */
  metadata: ExtractedMetadata;
  /** Detected prompt format */
  format: "plain_text" | "json_structured" | "json_simple" | "unknown";
  /** Suggested category based on content */
  suggestedCategory?: string;
  /** Suggested style based on content */
  suggestedStyle?: string;
  /** Suggested tags */
  suggestedTags: string[];
}

// Common style keywords to detect
const STYLE_KEYWORDS = [
  "cinematic", "photorealistic", "anime", "cartoon", "3d render",
  "oil painting", "watercolor", "sketch", "digital art", "pixel art",
  "cyberpunk", "steampunk", "fantasy", "sci-fi", "minimalist",
  "vintage", "retro", "modern", "abstract", "surreal", "kawaii",
  "editorial", "fashion", "portrait", "landscape", "macro",
  "studio", "natural light", "dramatic", "soft", "ethereal"
];

// Category detection patterns
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  portrait: [
    /\b(portrait|face|headshot|person|woman|man|girl|boy|model)\b/i,
    /\b(eyes|skin|hair|expression|pose)\b/i,
  ],
  landscape: [
    /\b(landscape|mountain|ocean|forest|sky|sunset|sunrise|nature)\b/i,
    /\b(scenery|vista|panorama|outdoor)\b/i,
  ],
  architecture: [
    /\b(building|architecture|interior|room|house|city|urban)\b/i,
    /\b(structure|design|modern|classical)\b/i,
  ],
  product: [
    /\b(product|item|object|merchandise|commercial)\b/i,
    /\b(packaging|brand|advertisement)\b/i,
  ],
  fantasy: [
    /\b(fantasy|magic|dragon|wizard|mythical|creature)\b/i,
    /\b(medieval|sword|castle|enchanted)\b/i,
  ],
  "sci-fi": [
    /\b(sci-fi|futuristic|space|robot|cyberpunk|alien)\b/i,
    /\b(technology|neon|hologram|spaceship)\b/i,
  ],
  animal: [
    /\b(animal|dog|cat|bird|wildlife|pet)\b/i,
    /\b(creature|species|mammal)\b/i,
  ],
  food: [
    /\b(food|dish|meal|cuisine|restaurant|cooking)\b/i,
    /\b(delicious|tasty|gourmet|ingredient)\b/i,
  ],
  fashion: [
    /\b(fashion|clothing|outfit|dress|style|wear)\b/i,
    /\b(model|runway|editorial|vogue)\b/i,
  ],
  abstract: [
    /\b(abstract|pattern|geometric|shapes|colors)\b/i,
    /\b(texture|gradient|minimalist)\b/i,
  ],
};

/**
 * Analyze a prompt and extract metadata
 */
export function analyzePrompt(promptText: string): AnalysisResult {
  const result: AnalysisResult = {
    mainPrompt: promptText,
    metadata: {},
    format: "plain_text",
    suggestedTags: [],
  };

  // Try to parse as JSON
  const jsonData = tryParseJSON(promptText);

  if (jsonData) {
    result.format = typeof jsonData === "object" && jsonData !== null
      ? (Object.keys(jsonData).length > 3 ? "json_structured" : "json_simple")
      : "unknown";

    // Extract from JSON structure
    extractFromJSON(jsonData, result);
  }

  // Always run text analysis on the main prompt
  analyzeText(result.mainPrompt, result);

  // Deduplicate tags
  result.suggestedTags = [...new Set(result.suggestedTags)].slice(0, 10);

  return result;
}

/**
 * Try to parse text as JSON
 */
function tryParseJSON(text: string): Record<string, unknown> | null {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

/**
 * Extract metadata from JSON structure
 */
function extractFromJSON(data: Record<string, unknown>, result: AnalysisResult): void {
  // Common field names for main prompt
  const promptFields = [
    "full_prompt", "prompt", "main_prompt", "text", "description",
    "positive_prompt", "positive", "content"
  ];

  // Find main prompt
  for (const field of promptFields) {
    if (typeof data[field] === "string" && data[field]) {
      result.mainPrompt = data[field] as string;
      break;
    }
  }

  // Extract style
  result.metadata.style = findStringValue(data, [
    "style", "art_style", "artistic_style", "visual_style"
  ]);
  if (result.metadata.style) {
    result.suggestedStyle = result.metadata.style;
  }

  // Extract camera info
  const camera = data.camera as Record<string, unknown> | undefined;
  if (camera && typeof camera === "object") {
    result.metadata.camera = findStringValue(camera, ["body", "camera", "model"]);
    result.metadata.lens = findStringValue(camera, ["lens", "focal_length"]);
  } else {
    result.metadata.camera = findStringValue(data, ["camera", "camera_body"]);
    result.metadata.lens = findStringValue(data, ["lens", "focal_length"]);
  }

  // Extract lighting
  const lighting = data.lighting as Record<string, unknown> | undefined;
  if (lighting && typeof lighting === "object") {
    result.metadata.lighting = findStringValue(lighting, ["type", "style", "description"]);
  } else {
    result.metadata.lighting = findStringValue(data, ["lighting", "light", "illumination"]);
  }

  // Extract other fields
  result.metadata.aspectRatio = findStringValue(data, [
    "aspect_ratio", "aspectRatio", "ratio", "format"
  ]);
  result.metadata.mood = findStringValue(data, ["mood", "atmosphere", "feeling", "tone"]);
  result.metadata.environment = findStringValue(data, [
    "environment", "setting", "background", "scene", "location"
  ]);
  result.metadata.negativePrompt = findStringValue(data, [
    "negative_prompt", "negativePrompt", "negative", "exclude"
  ]);
  result.metadata.model = findStringValue(data, [
    "model", "ai_model", "generator", "engine"
  ]);

  // Extract any parameters
  const params = data.parameters as Record<string, unknown> | undefined;
  if (params && typeof params === "object") {
    result.metadata.parameters = params;
  }

  // Add style-based tags
  if (result.metadata.style) {
    result.suggestedTags.push(...extractKeywords(result.metadata.style));
  }
  if (result.metadata.mood) {
    result.suggestedTags.push(...extractKeywords(result.metadata.mood));
  }
}

/**
 * Find a string value from multiple possible field names
 */
function findStringValue(
  obj: Record<string, unknown>,
  fields: string[]
): string | undefined {
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Analyze plain text for metadata
 */
function analyzeText(text: string, result: AnalysisResult): void {
  const lowerText = text.toLowerCase();

  // Detect category
  if (!result.suggestedCategory) {
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      const matchCount = patterns.filter(p => p.test(text)).length;
      if (matchCount >= 1) {
        result.suggestedCategory = category;
        break;
      }
    }
  }

  // Detect style keywords
  if (!result.suggestedStyle) {
    for (const style of STYLE_KEYWORDS) {
      if (lowerText.includes(style.toLowerCase())) {
        result.suggestedStyle = style;
        result.suggestedTags.push(style);
        break;
      }
    }
  }

  // Extract potential tags from text
  const tagKeywords = extractKeywords(text);
  result.suggestedTags.push(...tagKeywords);

  // Detect aspect ratio from text
  if (!result.metadata.aspectRatio) {
    const ratioMatch = text.match(/\b(\d+:\d+)\b/);
    if (ratioMatch) {
      result.metadata.aspectRatio = ratioMatch[1];
    }
  }

  // Detect camera from text
  if (!result.metadata.camera) {
    const cameraMatch = text.match(/\b(Canon|Nikon|Sony|ARRI|RED|Fuji|Leica|Hasselblad)\s*[\w\d\s-]+/i);
    if (cameraMatch) {
      result.metadata.camera = cameraMatch[0].trim();
    }
  }

  // Detect lens from text
  if (!result.metadata.lens) {
    const lensMatch = text.match(/\b(\d+mm|\d+-\d+mm)\b/i);
    if (lensMatch) {
      result.metadata.lens = lensMatch[0];
    }
  }
}

/**
 * Extract keywords that could be tags
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for style keywords
  for (const style of STYLE_KEYWORDS) {
    if (lowerText.includes(style.toLowerCase())) {
      keywords.push(style);
    }
  }

  return keywords;
}

/**
 * Clean metadata by removing undefined/null values
 */
export function cleanMetadata(metadata: ExtractedMetadata): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Generate a simplified prompt summary for display
 */
export function generatePromptSummary(promptText: string, maxLength = 200): string {
  const analysis = analyzePrompt(promptText);
  let summary = analysis.mainPrompt;

  // Remove JSON formatting if present
  if (summary.startsWith("{")) {
    const jsonData = tryParseJSON(summary);
    if (jsonData) {
      summary = findStringValue(jsonData as Record<string, unknown>, [
        "full_prompt", "prompt", "description", "text"
      ]) || summary;
    }
  }

  // Truncate if needed
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + "...";
  }

  return summary;
}

export default analyzePrompt;
