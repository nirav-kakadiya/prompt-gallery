"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Image,
  Video,
  RefreshCw,
  Play,
  Upload,
  Wand2,
  Link as LinkIcon,
  X,
  AlertCircle,
  Check,
} from "lucide-react";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn, PROMPT_TYPES, type PromptType } from "@/lib/utils";

const typeIcons: Record<PromptType, React.ElementType> = {
  "text-to-image": Image,
  "text-to-video": Video,
  "image-to-image": RefreshCw,
  "image-to-video": Play,
};

// Determine media type based on prompt type
const getMediaType = (promptType: PromptType): "image" | "video" => {
  if (promptType === "text-to-video" || promptType === "image-to-video") {
    return "video";
  }
  return "image";
};

// Check if generation is available for prompt type
const canGenerate = (promptType: PromptType): boolean => {
  // Only text-to-image supports generation for now
  return promptType === "text-to-image";
};

const suggestedTags = [
  "portrait",
  "landscape",
  "abstract",
  "anime",
  "photorealistic",
  "fantasy",
  "sci-fi",
  "nature",
  "architecture",
  "character",
  "cinematic",
  "3D",
];

type MediaSource = "upload" | "generate" | "url";

export default function SubmitPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    title: "",
    promptText: "",
    type: "text-to-image" as PromptType,
    tags: [] as string[],
    category: "",
    imageUrl: "",
    thumbnailUrl: "",
    videoUrl: "",
  });
  const [tagInput, setTagInput] = React.useState("");
  const [mediaSource, setMediaSource] = React.useState<MediaSource>("upload");
  const [urlInput, setUrlInput] = React.useState("");
  const [dragActive, setDragActive] = React.useState(false);

  const mediaType = getMediaType(formData.type);
  const canGenerateForType = canGenerate(formData.type);

  // Wait for hydration
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect to login if not authenticated (only after hydration)
  React.useEffect(() => {
    if (isHydrated && !authLoading && !isAuthenticated) {
      toast.error("Please sign in to submit prompts");
      router.push("/login?redirect=/submit");
    }
  }, [isHydrated, authLoading, isAuthenticated, router]);

  // Reset media when type changes
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: "",
      thumbnailUrl: "",
      videoUrl: "",
    }));
    setUrlInput("");
    // If switching to video type, default to upload (no generation available)
    if (mediaType === "video" && mediaSource === "generate") {
      setMediaSource("upload");
    }
  }, [formData.type, mediaType, mediaSource]);

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (
      normalizedTag &&
      !formData.tags.includes(normalizedTag) &&
      formData.tags.length < 10
    ) {
      setFormData({ ...formData, tags: [...formData.tags, normalizedTag] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("mediaType", mediaType);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Upload failed");
      }

      if (mediaType === "image") {
        setFormData((prev) => ({
          ...prev,
          imageUrl: data.data.imageUrl,
          thumbnailUrl: data.data.thumbnailUrl,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          videoUrl: data.data.videoUrl,
        }));
      }

      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.promptText.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: formData.promptText }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Generation failed");
      }

      setFormData((prev) => ({
        ...prev,
        imageUrl: data.data.imageUrl,
        thumbnailUrl: data.data.thumbnailUrl,
      }));

      toast.success("Image generated successfully!");
    } catch (error) {
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    if (mediaType === "image") {
      setFormData((prev) => ({
        ...prev,
        imageUrl: urlInput.trim(),
        thumbnailUrl: urlInput.trim(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        videoUrl: urlInput.trim(),
      }));
    }

    toast.success("URL added successfully!");
  };

  const clearMedia = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: "",
      thumbnailUrl: "",
      videoUrl: "",
    }));
    setUrlInput("");
  };

  const hasMedia =
    mediaType === "image"
      ? !!formData.imageUrl
      : !!formData.videoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.promptText.trim()) {
      toast.error("Please enter your prompt");
      return;
    }

    if (!hasMedia) {
      toast.error(`Please add ${mediaType === "image" ? "an image" : "a video"}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          promptText: formData.promptText.trim(),
          type: formData.type,
          tags: formData.tags,
          category: formData.category || null,
          imageUrl: formData.imageUrl || null,
          thumbnailUrl: formData.thumbnailUrl || null,
          videoUrl: formData.videoUrl || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to submit prompt");
      }

      toast.success("Prompt submitted!", {
        description: "Your prompt has been added to the gallery",
      });

      router.push(`/prompts/${data.data.slug}`);
    } catch (error) {
      toast.error("Submission failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (!isHydrated || authLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  // Don't render form if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Submit a Prompt"
        description="Share your creative prompts with the community"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl pb-16"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <Input
              id="title"
              placeholder="Give your prompt a descriptive title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              maxLength={100}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Prompt Type */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Prompt Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(PROMPT_TYPES) as PromptType[]).map((type) => {
                const config = PROMPT_TYPES[type];
                const Icon = typeIcons[type];
                const isSelected = formData.type === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type }))}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                      isSelected
                        ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-offset-background ${config.ringColor}`
                        : "border-input hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {isSelected && (
                      <div className={cn(
                        "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm",
                        config.color
                      )}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className={cn("w-6 h-6", isSelected ? config.textColor : "text-muted-foreground")} />
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? config.textColor : "text-muted-foreground"
                    )}>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Text */}
          <div>
            <label htmlFor="promptText" className="block text-sm font-medium mb-2">
              Prompt Text *
            </label>
            <textarea
              id="promptText"
              placeholder="Enter your full prompt here..."
              value={formData.promptText}
              onChange={(e) =>
                setFormData({ ...formData, promptText: e.target.value })
              }
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-foreground"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formData.promptText.length} characters
            </p>
          </div>

          {/* Media Upload/Generate Section */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {mediaType === "image" ? "Image" : "Video"} *
            </label>

            {/* Media Source Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMediaSource("upload")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  mediaSource === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>

              {canGenerateForType && (
                <button
                  type="button"
                  onClick={() => setMediaSource("generate")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    mediaSource === "generate"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Wand2 className="w-4 h-4" />
                  Generate
                </button>
              )}

              <button
                type="button"
                onClick={() => setMediaSource("url")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  mediaSource === "url"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <LinkIcon className="w-4 h-4" />
                URL
              </button>
            </div>

            {/* Media Preview or Upload Area */}
            {hasMedia ? (
              <div className="relative rounded-xl overflow-hidden border bg-muted">
                {mediaType === "image" ? (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-64 object-contain"
                  />
                ) : (
                  <video
                    src={formData.videoUrl}
                    controls
                    className="w-full h-64 object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Upload Area */}
                {mediaSource === "upload" && (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={mediaType === "image" ? "image/*" : "video/*"}
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Uploading and converting...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Drag and drop or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mediaType === "image"
                            ? "PNG, JPG, GIF, WebP up to 10MB"
                            : "MP4, WebM, MOV up to 100MB"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Files will be converted to{" "}
                          {mediaType === "image" ? "WebP" : "WebM"} for optimal
                          performance
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Area */}
                {mediaSource === "generate" && canGenerateForType && (
                  <div className="rounded-xl border p-6 text-center">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Generating image with AI...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This may take up to 30 seconds
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <Wand2 className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            Generate image from your prompt
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uses Google Imagen AI to create an image based on
                            your prompt text
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleGenerate}
                          disabled={!formData.promptText.trim()}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Image
                        </Button>
                        {!formData.promptText.trim() && (
                          <p className="text-xs text-amber-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Enter a prompt first to generate
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* URL Input Area */}
                {mediaSource === "url" && (
                  <div className="rounded-xl border p-6">
                    <div className="flex flex-col items-center gap-4">
                      <LinkIcon className="w-8 h-8 text-muted-foreground" />
                      <div className="w-full">
                        <p className="text-sm font-medium text-center mb-4">
                          Enter {mediaType === "image" ? "image" : "video"} URL
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder={`https://example.com/your-${mediaType}.${mediaType === "image" ? "webp" : "mp4"}`}
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                          />
                          <Button type="button" onClick={handleUrlSubmit}>
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags (up to 10)
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddTag(tagInput)}
                  disabled={formData.tags.length >= 10}
                >
                  Add
                </Button>
              </div>

              {/* Selected tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer group"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3 group-hover:text-destructive transition-colors" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Suggested tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Suggested:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags
                    .filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 8)
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleAddTag(tag)}
                      >
                        + {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !hasMedia}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Submit Prompt
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </PageLayout>
  );
}
