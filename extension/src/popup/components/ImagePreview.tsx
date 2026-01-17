interface ImagePreviewProps {
  images: string[];
  selectedImage: string | null;
  onSelect: (image: string | null) => void;
}

export function ImagePreview({ images, selectedImage, onSelect }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Main Preview */}
      {selectedImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={selectedImage}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Remove image"
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
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => onSelect(image)}
              className={`
                relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                ${selectedImage === image ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'}
              `}
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
              {selectedImage === image && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
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
              )}
            </button>
          ))}
        </div>
      )}

      {/* No image selected hint */}
      {!selectedImage && images.length > 0 && (
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
          <span>Click a thumbnail to attach an image</span>
        </div>
      )}
    </div>
  );
}
