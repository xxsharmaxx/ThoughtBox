import { useState, useEffect } from 'react';
import Header, { type ActiveView } from './components/Header';
import ThoughtFeed from './components/ThoughtFeed';
import PollFeed from './components/PollFeed';
import SavedThoughtsView from './components/SavedThoughtsView';
import CreateThoughtModal from './components/CreateThoughtModal';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import { ToastProvider } from './components/Toast';
import {
  fetchThoughts,
  getStoredUser,
  fetchCurrentUser,
  type Thought,
  type User,
} from './api';

function AppContent() {
  const [view, setView] = useState<ActiveView>('feed');
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultMode, setCreateDefaultMode] = useState<'thought' | 'poll'>('thought');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [activePromptCategory, setActivePromptCategory] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Verify auth session on load
  useEffect(() => {
    fetchCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        // Token might have expired or not logged in
      });
  }, []);

  // Global cache of thoughts for Saved tab
  const [allThoughts, setAllThoughts] = useState<Thought[]>([]);

  // Saved bookmark IDs in localStorage
  const [savedIds, setSavedIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('thoughtbox_saved_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync savedIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('thoughtbox_saved_ids', JSON.stringify(savedIds));
    } catch {
      // Ignore
    }
  }, [savedIds]);

  // Load thoughts for bookmark resolution
  useEffect(() => {
    fetchThoughts()
      .then(setAllThoughts)
      .catch(() => {});
  }, [refreshKey]);

  const handleToggleBookmark = (id: number) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenCreateWithPrompt = (promptText: string, category: string) => {
    setCreateDefaultMode('thought');
    setActivePrompt(promptText);
    setActivePromptCategory(category);
    setShowCreate(true);
  };

  const handleOpenStandardCreate = (mode: 'thought' | 'poll' = 'thought') => {
    setCreateDefaultMode(mode);
    setActivePrompt('');
    setActivePromptCategory(undefined);
    setShowCreate(true);
  };

  const handleCreated = () => {
    setShowCreate(false);
    setActivePrompt('');
    setActivePromptCategory(undefined);
    setRefreshKey((k) => k + 1);
  };

  const handleLikeUpdate = (id: number, newLikes: number) => {
    setAllThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, likes: newLikes } : t))
    );
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (view === 'admin') {
      setView('feed');
    }
  };

  return (
    <div className="app">
      <Header
        currentView={view}
        onNavigate={setView}
        savedCount={savedIds.length}
        currentUser={currentUser}
        onOpenCreate={() => handleOpenStandardCreate('thought')}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {view === 'feed' && (
          <ThoughtFeed
            key={refreshKey}
            onOpenCreateWithPrompt={handleOpenCreateWithPrompt}
            onOpenCreate={() => handleOpenStandardCreate('thought')}
            savedIds={savedIds}
            onToggleBookmark={handleToggleBookmark}
            currentUser={currentUser}
            isAdmin={currentUser?.role === 'admin'}
          />
        )}

        {view === 'polls' && (
          <PollFeed
            currentUser={currentUser}
            isAdmin={currentUser?.role === 'admin'}
            onOpenCreatePoll={() => handleOpenStandardCreate('poll')}
          />
        )}

        {view === 'saved' && (
          <SavedThoughtsView
            thoughts={allThoughts}
            savedIds={savedIds}
            onToggleBookmark={handleToggleBookmark}
            onLikeUpdate={handleLikeUpdate}
            onExploreFeed={() => setView('feed')}
          />
        )}

        {view === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            onUserRoleChanged={(u) => setCurrentUser(u)}
          />
        )}

        {/* Global Floating Action Button for sharing */}
        <button
          className="fab"
          onClick={() => handleOpenStandardCreate('thought')}
          title="Share a thought or create a poll"
          id="share-thought-btn"
          aria-label="Share a Thought"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="fab-label">Share / Poll</span>
        </button>
      </main>

      {/* Modal Dialog for creating thoughts or polls */}
      {showCreate && (
        <CreateThoughtModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          initialPrompt={activePrompt}
          initialCategory={activePromptCategory}
          currentUser={currentUser}
          defaultMode={createDefaultMode}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        initialMode={authModalMode}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => setCurrentUser(u)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
