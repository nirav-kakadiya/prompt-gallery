import type { ParsedPrompt, PromptType, PromptParameters } from '@/types';

// Extract Midjourney parameters from text
export function extractMidjourneyParams(text: string): Partial<PromptParameters> {
  const params: Partial<PromptParameters> = {};

  // Aspect ratio: --ar 16:9
  const arMatch = text.match(/--ar\s+(\d+:\d+)/i);
  if (arMatch) params.aspectRatio = arMatch[1];

  // Version: --v 6.0 or --version 6
  const vMatch = text.match(/--(?:v|version)\s+([\d.]+)/i);
  if (vMatch) params.version = vMatch[1];

  // Style: --style raw
  const styleMatch = text.match(/--style\s+(\w+)/i);
  if (styleMatch) params.style = styleMatch[1];

  // Quality: --q 2 or --quality 2
  const qMatch = text.match(/--(?:q|quality)\s+([\d.]+)/i);
  if (qMatch) params.cfgScale = parseFloat(qMatch[1]);

  // Seed: --seed 12345
  const seedMatch = text.match(/--seed\s+(\d+)/i);
  if (seedMatch) params.seed = parseInt(seedMatch[1], 10);

  // Chaos: --chaos 50
  const chaosMatch = text.match(/--chaos\s+(\d+)/i);
  if (chaosMatch) {
    params.cfgScale = params.cfgScale || parseInt(chaosMatch[1], 10);
  }

  return params;
}

// Extract Stable Diffusion parameters from text
export function extractSDParams(text: string): Partial<PromptParameters> {
  const params: Partial<PromptParameters> = {};

  // Steps: 30
  const stepsMatch = text.match(/Steps:\s*(\d+)/i);
  if (stepsMatch) params.steps = parseInt(stepsMatch[1], 10);

  // CFG Scale: 7 or CFG: 7
  const cfgMatch = text.match(/CFG(?:\s*Scale)?:\s*([\d.]+)/i);
  if (cfgMatch) params.cfgScale = parseFloat(cfgMatch[1]);

  // Seed: 12345
  const seedMatch = text.match(/Seed:\s*(\d+)/i);
  if (seedMatch) params.seed = parseInt(seedMatch[1], 10);

  // Sampler: DPM++ 2M Karras
  const samplerMatch = text.match(/Sampler:\s*([^,\n]+)/i);
  if (samplerMatch) params.sampler = samplerMatch[1].trim();

  // Model: sd_xl_base_1.0
  const modelMatch = text.match(/Model:\s*([^,\n]+)/i);
  if (modelMatch) params.model = modelMatch[1].trim();

  // Negative prompt (after | or labeled)
  const negMatch = text.match(/(?:Negative\s*prompt:|negative:|\|)\s*([^\n|]+)/i);
  if (negMatch) params.negativePrompt = negMatch[1].trim();

  return params;
}

// Remove hashtags from text
export function removeHashtags(text: string): string {
  return text.replace(/#\w+/g, '').trim();
}

// Remove @mentions from text
export function removeMentions(text: string): string {
  return text.replace(/@\w+/g, '').trim();
}

// Remove URLs from text
export function removeUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, '').trim();
}

// Extract hashtags as tags
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  if (!matches) return [];

  return matches
    .map((tag) => tag.slice(1).toLowerCase())
    .filter((tag) => !['aiart', 'ai', 'midjourney', 'stablediffusion', 'dalle', 'flux'].includes(tag));
}

// Detect prompt type based on content
export function detectPromptType(text: string): PromptType {
  const lowerText = text.toLowerCase();

  // Check for video-related keywords
  if (lowerText.includes('video') || lowerText.includes('animate') || lowerText.includes('motion')) {
    if (lowerText.includes('img2vid') || lowerText.includes('image to video')) {
      return 'image-to-video';
    }
    return 'text-to-video';
  }

  // Check for image-to-image
  if (lowerText.includes('img2img') || lowerText.includes('image to image') || lowerText.includes('inpaint')) {
    return 'image-to-image';
  }

  // Default to text-to-image
  return 'text-to-image';
}

// Detect the AI model/platform from text
export function detectModel(text: string): string | undefined {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('midjourney') || text.includes('--v') || text.includes('--ar')) {
    return 'Midjourney';
  }

  if (lowerText.includes('stable diffusion') || lowerText.includes('sdxl') || lowerText.includes('sd 1.5')) {
    return 'Stable Diffusion';
  }

  if (lowerText.includes('dall-e') || lowerText.includes('dalle')) {
    return 'DALL-E';
  }

  if (lowerText.includes('flux')) {
    return 'FLUX';
  }

  if (lowerText.includes('leonardo')) {
    return 'Leonardo AI';
  }

  if (lowerText.includes('firefly')) {
    return 'Adobe Firefly';
  }

  return undefined;
}

// Clean prompt text by removing social media noise and parameters
export function cleanPromptText(text: string): string {
  let cleaned = text;

  // Remove hashtags
  cleaned = removeHashtags(cleaned);

  // Remove mentions
  cleaned = removeMentions(cleaned);

  // Remove URLs
  cleaned = removeUrls(cleaned);

  // Remove Midjourney parameters (keep the prompt part)
  cleaned = cleaned.replace(/\s*--\w+\s+[\w:.]+/g, '');

  // Remove common prefixes
  cleaned = cleaned.replace(/^(?:prompt:|here'?s?\s+(?:the\s+)?prompt:?|my\s+prompt:?)/i, '');

  // Remove SD-style parameters
  cleaned = cleaned.replace(/\s*(?:Steps|CFG|Seed|Sampler|Model):\s*[^\n,]+/gi, '');

  // Remove negative prompt section
  cleaned = cleaned.replace(/\s*(?:Negative\s*prompt:|negative:)[^\n]+/gi, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// Generate a title from prompt text
export function generateTitle(text: string, maxLength: number = 60): string {
  const cleaned = cleanPromptText(text);

  // Get first sentence or meaningful chunk
  const firstPart = cleaned.split(/[.!?]/)[0].trim();

  if (firstPart.length <= maxLength) {
    return firstPart;
  }

  // Truncate at word boundary
  const truncated = firstPart.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > 20 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

// Main parser function
export function parsePrompt(rawText: string): ParsedPrompt {
  const cleanText = cleanPromptText(rawText);
  const type = detectPromptType(rawText);
  const tags = extractHashtags(rawText);

  // Merge parameters from different formats
  const mjParams = extractMidjourneyParams(rawText);
  const sdParams = extractSDParams(rawText);
  const model = detectModel(rawText);

  const parameters: PromptParameters = {
    ...sdParams,
    ...mjParams,
    model: model || sdParams.model || mjParams.model,
  };

  // Try to determine category from tags or content
  let category: string | undefined;
  const lowerText = rawText.toLowerCase();

  if (lowerText.includes('portrait') || lowerText.includes('person') || lowerText.includes('face')) {
    category = 'portraits';
  } else if (lowerText.includes('landscape') || lowerText.includes('nature') || lowerText.includes('scenery')) {
    category = 'landscapes';
  } else if (lowerText.includes('anime') || lowerText.includes('manga')) {
    category = 'anime';
  } else if (lowerText.includes('fantasy') || lowerText.includes('dragon') || lowerText.includes('magic')) {
    category = 'fantasy';
  } else if (lowerText.includes('scifi') || lowerText.includes('sci-fi') || lowerText.includes('futuristic')) {
    category = 'sci-fi';
  }

  return {
    cleanText,
    type,
    tags,
    parameters,
    category,
  };
}
