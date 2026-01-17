import type { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onSettingsClick: () => void;
}

export function Header({ user, onLogout, onSettingsClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <svg
            className="w-5 h-5 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
            />
            <polyline
              strokeLinecap="round"
              strokeLinejoin="round"
              points="17,21 17,13 7,13 7,21"
            />
            <polyline
              strokeLinecap="round"
              strokeLinejoin="round"
              points="7,3 7,8 15,8"
            />
          </svg>
        </div>
        <span className="font-semibold text-sm">Prompt Gallery</span>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Settings"
            >
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {(user.name || user.email)?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
