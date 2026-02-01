interface ImagePreviewProps {
  images: string[];
  selectedImages: string[];
  onSelect: (images: string[]) => void;
  maxImages?: number;
}

export function ImagePreview({ images, selectedImages, onSelect, maxImages = 4 }: ImagePreviewProps) {
  if (images.length === 0) return null;

  const handleImageClick = (image: string) => {
    if (selectedImages.includes(image)) {
      // Deselect image
      onSelect(selectedImages.filter(img => img !== image));
    } else {
      // Select image (respect max limit)
      if (selectedImages.length < maxImages) {
        onSelect([...selectedImages, image]);
      }
    }
  };

  const handleRemoveAll = () => {
    onSelect([]);
  };

  // Show first selected image in main preview, or first available if none selected
  const mainPreviewImage = selectedImages.length > 0 ? selectedImages[0] : null;

  return (
    <div className="space-y-2">
      {/* Main Preview */}
      {mainPreviewImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={mainPreviewImage}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemoveAll}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Clear all selections"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {/* Selection count badge */}
          {selectedImages.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {selectedImages.length} selected
            </div>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Click to select images ({selectedImages.length}/{maxImages})</span>
            {selectedImages.length > 0 && (
              <button
                type="button"
                onClick={handleRemoveAll}
                className="text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => {
              const isSelected = selectedImages.includes(image);
              const isDisabled = !isSelected && selectedImages.length >= maxImages;

              return (
                <button
                  key={image}
                  type="button"
                  onClick={() => handleImageClick(image)}
                  disabled={isDisabled}
                  className={`
                    relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={isDisabled ? `Maximum ${maxImages} images allowed` : isSelected ? 'Click to deselect' : 'Click to select'}
                >
                  <img
                    src={image}
                    alt={`Option ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.style.display = 'none';
                      }
                    }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Selection order badge */}
                  {isSelected && selectedImages.length > 1 && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {selectedImages.indexOf(image) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No image selected hint */}
      {selectedImages.length === 0 && images.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Click thumbnails to select images (up to {maxImages})</span>
        </div>
      )}
    </div>
  );
}
