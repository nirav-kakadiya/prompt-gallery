import type { PromptType } from '../../types';

interface TypeSelectorProps {
  value: PromptType;
  onChange: (type: PromptType) => void;
}

const PROMPT_TYPES: { value: PromptType; label: string; icon: string }[] = [
  { value: 'text-to-image', label: 'Text to Image', icon: 'image' },
  { value: 'image-to-image', label: 'Image to Image', icon: 'refresh' },
  { value: 'text-to-video', label: 'Text to Video', icon: 'video' },
  { value: 'image-to-video', label: 'Image to Video', icon: 'play' },
];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROMPT_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
            ${
              value === type.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-muted-foreground/50 hover:bg-muted'
            }
          `}
        >
          <TypeIcon type={type.icon} className="w-4 h-4" />
          <span className="truncate">{type.label}</span>
        </button>
      ))}
    </div>
  );
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'image':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
      );
    case 'refresh':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="23,4 23,10 17,10" />
          <polyline points="1,20 1,14 7,14" />
          <path d="M3.51,9a9,9,0,0,1,14.85-3.36L23,10M1,14l4.64,4.36A9,9,0,0,0,20.49,15" />
        </svg>
      );
    case 'video':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="2" y1="7" x2="7" y2="7" />
          <line x1="2" y1="17" x2="7" y2="17" />
          <line x1="17" y1="17" x2="22" y2="17" />
          <line x1="17" y1="7" x2="22" y2="7" />
        </svg>
      );
    case 'play':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polygon points="5,3 19,12 5,21 5,3" />
        </svg>
      );
    default:
      return null;
  }
}
