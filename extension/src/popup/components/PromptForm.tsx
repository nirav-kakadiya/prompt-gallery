import React, { useState, useEffect } from 'react';
import { createPrompt, generateTitle } from '../../lib/api';
import { parsePrompt } from '../../lib/parser';
import { ImagePreview } from './ImagePreview';
import { TagInput } from './TagInput';
import { TypeSelector } from './TypeSelector';
import type { PendingPrompt, PromptType, CreatePromptRequest } from '../../types';

interface PromptFormProps {
  pendingPrompt: PendingPrompt;
  onSaved: () => void;
  onClear: () => void;
}

export function PromptForm({ pendingPrompt, onSaved, onClear }: PromptFormProps) {
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [type, setType] = useState<PromptType>('image-to-image'); // Default to image-to-image
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [style, setStyle] = useState<string | undefined>(undefined);
  const [llmMetadata, setLlmMetadata] = useState<Record<string, string | undefined> | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasImageOnly, setHasImageOnly] = useState(false); // Track if we only have image (no text)

  useEffect(() => {
    // Parse the pending prompt
    const parsed = parsePrompt(pendingPrompt.text);

    // Set initial values IMMEDIATELY (don't wait for title generation)
    const finalPromptText = parsed.cleanText || pendingPrompt.text;
    setPromptText(finalPromptText);
    
    // Check if we have image but no text (image-only scenario)
    const hasImage = !!(pendingPrompt.imageUrls && pendingPrompt.imageUrls.length > 0);
    const hasNoText = !finalPromptText || finalPromptText.trim().length === 0;
    setHasImageOnly(hasImage && hasNoText);
    
    // Default to image-to-image (user's primary workflow)
    // Only use parsed type if it's a video type, otherwise always use image-to-image
    if (parsed.type === 'text-to-video' || parsed.type === 'image-to-video') {
      setType(parsed.type); // Keep video types as detected
    } else {
      setType('image-to-image'); // Default to image-to-image for all other cases
    }
    
    // Store parsed tags for later merging with LLM-generated tags
    const initialTags = parsed.tags || [];
    setTags(initialTags);

    // Set temporary title from first few words (fallback) or empty if no text
    if (finalPromptText && finalPromptText.trim().length > 0) {
      const words = finalPromptText.split(' ').slice(0, 6);
      const tempTitle = words.join(' ') + (words.length >= 6 ? '...' : '');
      setTitle(tempTitle);
    } else {
      setTitle(''); // Empty title when no text
    }

    // Set first image if available
    if (pendingPrompt.imageUrls && pendingPrompt.imageUrls.length > 0) {
      setSelectedImage(pendingPrompt.imageUrls[0]);
    }

    // Auto-generate title and tags ONLY if we have text (not image-only)
    // For image-only, user will manually trigger generation after entering prompt
    if (finalPromptText && finalPromptText.length >= 10 && !hasImageOnly) {
      // Use requestAnimationFrame to ensure UI renders first, then start generation
      requestAnimationFrame(() => {
        setIsGeneratingTitle(true);
        
        // Generate title and tags asynchronously without blocking
        generateTitle(finalPromptText)
          .then((result) => {
            if (result.success && result.data) {
              // Set generated title
              if (result.data.title) {
                setTitle(result.data.title);
              }

              // Set generated tags (merge with existing parsed tags, avoiding duplicates)
              if (result.data?.tags && result.data.tags.length > 0) {
                // Get current tags state and merge with new ones
                setTags((currentTags) => {
                  const existingTags = currentTags.length > 0 ? currentTags : initialTags;
                  const newTags = result.data!.tags!.filter(
                    (tag) => !existingTags.some((existing) => existing.toLowerCase() === tag.toLowerCase())
                  );
                  // Merge: existing tags first, then new generated tags
                  return [...existingTags, ...newTags];
                });
              }

              // Set LLM-generated category, style, and metadata
              if (result.data.category) {
                setCategory(result.data.category);
              }
              if (result.data.style) {
                setStyle(result.data.style);
              }
              if (result.data.metadata) {
                setLlmMetadata(result.data.metadata);
              }
            } else {
              // If generation fails, keep the temporary title (silently)
              console.warn('Title generation failed, using temporary title:', result.error);
            }
          })
          .catch((err) => {
            console.error('Failed to generate title:', err);
            // Keep the temporary title on error (silently fail)
          })
          .finally(() => {
            setIsGeneratingTitle(false);
          });
      });
    }
  }, [pendingPrompt]);

  const handleGenerateTitleAndTags = async () => {
    const textToGenerate = promptText.trim();
    if (!textToGenerate || textToGenerate.length < 10) {
      setError('Please enter at least 10 characters in the prompt field');
      return;
    }

    setIsGeneratingTitle(true);
    setError('');

    try {
      const result = await generateTitle(textToGenerate);

      if (result.success && result.data) {
        // Set generated title
        if (result.data.title) {
          setTitle(result.data.title);
        }

        // Set generated tags (merge with existing tags, avoiding duplicates)
        if (result.data?.tags && result.data.tags.length > 0) {
          setTags((currentTags) => {
            const newTags = result.data!.tags!.filter(
              (tag) => !currentTags.some((existing) => existing.toLowerCase() === tag.toLowerCase())
            );
            return [...currentTags, ...newTags];
          });
        }

        // Set LLM-generated category, style, and metadata
        if (result.data.category) {
          setCategory(result.data.category);
        }
        if (result.data.style) {
          setStyle(result.data.style);
        }
        if (result.data.metadata) {
          setLlmMetadata(result.data.metadata);
        }
      } else {
        setError('Failed to generate title and tags. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate title and tags:', err);
      setError('Failed to generate title and tags. Please try again.');
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const request: CreatePromptRequest = {
        title: title.trim(),
        promptText: promptText.trim(),
        type,
        tags,
        category,
        style,
        sourceUrl: pendingPrompt.sourceUrl,
        sourceType: pendingPrompt.sourceType,
        imageUrl: selectedImage || undefined,
        metadata: {
          ...pendingPrompt.metadata,
          ...llmMetadata,
          extractedAt: new Date().toISOString(),
        },
      };

      const result = await createPrompt(request);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSaved();
        }, 1500);
      } else {
        setError(result.error?.message || 'Failed to save prompt');
      }
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Prompt Saved!</h3>
        <p className="text-sm text-muted-foreground">
          Your prompt has been added to the gallery
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Image Preview */}
      {pendingPrompt.imageUrls && pendingPrompt.imageUrls.length > 0 && (
        <ImagePreview
          images={pendingPrompt.imageUrls}
          selectedImage={selectedImage}
          onSelect={setSelectedImage}
        />
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Title</label>
        <div className="relative">
          <input
            type="text"
            value={isGeneratingTitle ? 'Generating title...' : title}
            onChange={(e) => {
              if (!isGeneratingTitle) {
                setTitle(e.target.value);
              }
            }}
            placeholder="Enter a title for your prompt"
            required
            disabled={isGeneratingTitle}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isGeneratingTitle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Prompt Text */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Prompt</label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder={hasImageOnly ? "Enter a prompt describing this image..." : "Enter your prompt"}
          rows={4}
          required
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {/* Generate button - only show for image-only scenarios (manual entry), not for posts that already auto-generate */}
        {hasImageOnly && promptText.trim().length >= 10 && !isGeneratingTitle && (
          <button
            type="button"
            onClick={handleGenerateTitleAndTags}
            className="mt-2 w-full py-2 px-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
            Generate Title & Tags
          </button>
        )}
        {/* Hint for image-only case */}
        {hasImageOnly && promptText.trim().length < 10 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            💡 Enter at least 10 characters to enable AI title & tags generation
          </p>
        )}
      </div>

      {/* Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Type</label>
        <TypeSelector value={type} onChange={setType} />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Tags</label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Source Info */}
      {pendingPrompt.sourceUrl && (
        <div className="text-xs text-muted-foreground truncate">
          Source: {new URL(pendingPrompt.sourceUrl).hostname}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClear}
          className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !promptText.trim()}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Prompt
            </>
          )}
        </button>
      </div>
    </form>
  );
}
