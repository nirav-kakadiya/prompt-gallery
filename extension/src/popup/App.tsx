import { useEffect, useState } from 'react';
import { getUser, getPendingPrompt, clearPendingPrompt } from '../lib/storage';
import { LoginForm } from './components/LoginForm';
import { PromptForm } from './components/PromptForm';
import { Header } from './components/Header';
import type { User, PendingPrompt } from '../types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      const [storedUser, storedPrompt] = await Promise.all([
        getUser(),
        getPendingPrompt(),
      ]);
      setUser(storedUser);
      setPendingPrompt(storedPrompt);
    } catch (error) {
      console.error('Failed to load initial state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    const { clearAuth } = await import('../lib/auth');
    await clearAuth();
    setUser(null);
  };

  const handlePromptSaved = async () => {
    await clearPendingPrompt();
    setPendingPrompt(null);
  };

  const handleClearPrompt = async () => {
    await clearPendingPrompt();
    setPendingPrompt(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <Header
        user={user}
        onLogout={handleLogout}
        onSettingsClick={() => setShowSettings(!showSettings)}
      />

      <main className="flex-1 overflow-y-auto p-4">
        {!user ? (
          <LoginForm onLogin={handleLogin} />
        ) : pendingPrompt ? (
          <PromptForm
            pendingPrompt={pendingPrompt}
            onSaved={handlePromptSaved}
            onClear={handleClearPrompt}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">No prompt to save</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Select text on any page and right-click to save, or visit a Reddit/X post with AI art to capture prompts.
      </p>
      <div className="mt-6 space-y-3 text-left w-full max-w-[280px]">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <span className="text-xl">1</span>
          <div>
            <p className="text-sm font-medium">Select text</p>
            <p className="text-xs text-muted-foreground">Highlight any prompt text on a webpage</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <span className="text-xl">2</span>
          <div>
            <p className="text-sm font-medium">Right-click</p>
            <p className="text-xs text-muted-foreground">Choose "Save to Prompt Gallery"</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <span className="text-xl">3</span>
          <div>
            <p className="text-sm font-medium">Save</p>
            <p className="text-xs text-muted-foreground">Add tags and save to your collection</p>
          </div>
        </div>
      </div>
    </div>
  );
}
