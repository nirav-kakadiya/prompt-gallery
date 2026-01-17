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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Parse the pending prompt
    const parsed = parsePrompt(pendingPrompt.text);

    // Set initial values IMMEDIATELY (don't wait for title generation)
    const finalPromptText = parsed.cleanText || pendingPrompt.text;
    setPromptText(finalPromptText);
    
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

    // Set temporary title from first few words (fallback)
    const words = finalPromptText.split(' ').slice(0, 6);
    const tempTitle = words.join(' ') + (words.length >= 6 ? '...' : '');
    setTitle(tempTitle);

    // Set first image if available
    if (pendingPrompt.imageUrls && pendingPrompt.imageUrls.length > 0) {
      setSelectedImage(pendingPrompt.imageUrls[0]);
    }

    // Generate title and tags using LLM in background (non-blocking)
    // Start generation immediately but don't block UI rendering
    if (finalPromptText && finalPromptText.length >= 10) {
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
        sourceUrl: pendingPrompt.sourceUrl,
        sourceType: pendingPrompt.sourceType,
        imageUrl: selectedImage || undefined,
        metadata: {
          ...pendingPrompt.metadata,
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
          placeholder="Enter your prompt"
          rows={4}
          required
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
