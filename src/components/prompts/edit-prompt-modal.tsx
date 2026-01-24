"use client";

import * as React from "react";
import { Loader2, X, Image, Video, RefreshCw, Play, Check, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdatePrompt } from "@/hooks/use-prompts";
import { toast } from "sonner";
import { cn, PROMPT_TYPES, type PromptType } from "@/lib/utils";

const typeIcons: Record<PromptType, React.ElementType> = {
  "text-to-image": Image,
  "text-to-video": Video,
  "image-to-image": RefreshCw,
  "image-to-video": Play,
};

interface EditPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: {
    id: string;
    title: string;
    promptText: string;
    type: PromptType;
    tags: string[];
    isPublic?: boolean;
  };
}

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

export function EditPromptModal({
  open,
  onOpenChange,
  prompt,
}: EditPromptModalProps) {
  const updatePromptMutation = useUpdatePrompt();
  const [title, setTitle] = React.useState(prompt.title);
  const [promptText, setPromptText] = React.useState(prompt.promptText);
  const [type, setType] = React.useState<PromptType>(prompt.type);
  const [tags, setTags] = React.useState<string[]>(prompt.tags);
  const [tagInput, setTagInput] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(prompt.isPublic ?? true);

  // Reset form when prompt changes or modal opens
  React.useEffect(() => {
    if (open) {
      setTitle(prompt.title);
      setPromptText(prompt.promptText);
      setType(prompt.type);
      setTags(prompt.tags);
      setTagInput("");
      setIsPublic(prompt.isPublic ?? true);
    }
  }, [open, prompt.title, prompt.promptText, prompt.type, prompt.tags, prompt.isPublic]);

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < 10) {
      setTags([...tags, normalizedTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!promptText.trim()) {
      toast.error("Please enter prompt text");
      return;
    }

    // Close modal immediately
    onOpenChange(false);

    // Save in background
    updatePromptMutation.mutate(
      {
        id: prompt.id,
        data: {
          title: title.trim(),
          promptText: promptText.trim(),
          type,
          tags,
          isPublic,
        },
      },
      {
        onSuccess: () => {
          toast.success("Prompt updated successfully", {
            description: "Your changes have been saved",
            duration: 3000,
          });
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to update prompt";

          if (errorMessage.includes("UNAUTHORIZED")) {
            toast.error("Please log in to edit prompts", {
              duration: 4000,
            });
          } else if (errorMessage.includes("FORBIDDEN")) {
            toast.error("You can only edit your own prompts", {
              duration: 4000,
            });
          } else if (errorMessage.includes("NOT_FOUND")) {
            toast.error("This prompt may have been deleted", {
              duration: 4000,
            });
          } else {
            toast.error("Failed to update prompt", {
              description: errorMessage.replace(/^[^:]+:\s*/, ""),
              duration: 4000,
            });
          }
        },
      }
    );
  };

  const isLoading = updatePromptMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Make changes to your prompt. Media cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <Input
              id="edit-title"
              placeholder="Give your prompt a descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isLoading}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {title.length}/100 characters
            </p>
          </div>

          {/* Prompt Type */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Prompt Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PROMPT_TYPES) as PromptType[]).map((promptType) => {
                const config = PROMPT_TYPES[promptType];
                const Icon = typeIcons[promptType];
                const isSelected = type === promptType;

                return (
                  <button
                    key={promptType}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setType(promptType)}
                    className={cn(
                      "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected
                        ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-offset-background ${config.ringColor}`
                        : "border-input hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {isSelected && (
                      <div className={cn(
                        "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center",
                        config.color
                      )}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className={cn("w-5 h-5", isSelected ? config.textColor : "text-muted-foreground")} />
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected && config.textColor
                    )}>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Text */}
          <div>
            <label htmlFor="edit-promptText" className="block text-sm font-medium mb-2">
              Prompt Text *
            </label>
            <textarea
              id="edit-promptText"
              placeholder="Enter your full prompt here..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={6}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="edit-tags" className="block text-sm font-medium mb-2">
              Tags (up to 10)
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  id="edit-tags"
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddTag(tagInput)}
                  disabled={tags.length >= 10 || isLoading}
                >
                  Add
                </Button>
              </div>

              {/* Selected tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer group"
                      onClick={() => !isLoading && handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3 group-hover:text-destructive transition-colors" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Suggested tags */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Suggested:
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags
                    .filter((tag) => !tags.includes(tag))
                    .slice(0, 8)
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => !isLoading && handleAddTag(tag)}
                      >
                        + {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsPublic(true)}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isPublic
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-offset-2 ring-offset-background ring-emerald-500/50"
                    : "border-input hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isPublic && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Globe className={cn("w-5 h-5", isPublic ? "text-emerald-600" : "text-muted-foreground")} />
                <div className="text-left">
                  <span className={cn("text-sm font-medium block", isPublic && "text-emerald-600")}>Public</span>
                  <span className="text-xs text-muted-foreground">Visible to everyone</span>
                </div>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsPublic(false)}
                className={cn(
                  "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  !isPublic
                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-offset-2 ring-offset-background ring-amber-500/50"
                    : "border-input hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {!isPublic && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center bg-amber-500">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <Lock className={cn("w-5 h-5", !isPublic ? "text-amber-600" : "text-muted-foreground")} />
                <div className="text-left">
                  <span className={cn("text-sm font-medium block", !isPublic && "text-amber-600")}>Private</span>
                  <span className="text-xs text-muted-foreground">Only visible to you</span>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
