import { useState, useEffect, useMemo } from 'react';
import { fetchThoughts, adminDeleteThought, type Thought, type User } from '../api';
import ThoughtCard from './ThoughtCard';
import CommunityHero from './CommunityHero';
import FeedControls, { type SortOption } from './FeedControls';

interface ThoughtFeedProps {
  onOpenCreateWithPrompt: (promptText: string, category: string) => void;
  onOpenCreate: () => void;
  savedIds: number[];
  onToggleBookmark: (id: number) => void;
  currentUser?: User | null;
  isAdmin?: boolean;
}

export default function ThoughtFeed({
  onOpenCreateWithPrompt,
  onOpenCreate,
  savedIds,
  onToggleBookmark,
  currentUser,
  isAdmin = false,
}: ThoughtFeedProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all thoughts so local search, counts, and client-side sorting are instantaneous
      const data = await fetchThoughts();
      setThoughts(data);
    } catch {
      setError('Could not load thoughts. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLikeUpdate = (id: number, newLikes: number) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, likes: newLikes } : t))
    );
  };

  // Filter & sort logic
  const filteredAndSortedThoughts = useMemo(() => {
    let list = [...thoughts];

    // Category filter
    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }

    // Search query filter (matches content or category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) => t.content.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortBy === 'trending') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      // Latest first
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [thoughts, activeCategory, searchQuery, sortBy]);

  return (
    <div className="feed-container">
      {/* Community Hero with live stats & prompt sparker */}
      <CommunityHero
        thoughts={thoughts}
        onPromptSelect={onOpenCreateWithPrompt}
        onOpenCreate={onOpenCreate}
      />

      {/* Interactive Controls: Search, Sort, Categories */}
      <FeedControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        thoughts={thoughts}
        totalResults={filteredAndSortedThoughts.length}
      />

      {/* Feed content states */}
      {loading && (
        <div className="skeleton-grid" id="feed-skeletons">
          {[1, 2, 3].map((n) => (
            <div key={n} className="thought-card skeleton-card">
              <div className="skeleton-line skeleton-badge" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-sub" />
              <div className="skeleton-line skeleton-actions" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="state-message state-error">
          <div className="empty-icon">🔌</div>
          <h3>Unable to connect</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={load} style={{ marginTop: '12px' }}>
            🔄 Retry Connection
          </button>
        </div>
      )}

      {!loading && !error && filteredAndSortedThoughts.length === 0 && (
        <div className="state-message state-empty">
          <div className="empty-icon">💭</div>
          <h3>No thoughts found</h3>
          <p>
            {searchQuery
              ? `No thoughts matched your search "${searchQuery}". Try a different keyword.`
              : activeCategory
              ? `No thoughts in "${activeCategory}" yet. Be the first to share one!`
              : 'Be the first person to share a thought with your campus community!'}
          </p>
          <button
            className="btn btn-primary"
            onClick={onOpenCreate}
            style={{ marginTop: '14px' }}
          >
            ✍️ Post the First Thought
          </button>
        </div>
      )}

      {!loading && !error && filteredAndSortedThoughts.length > 0 && (
        <div className="thought-grid" id="thought-grid">
          {filteredAndSortedThoughts.map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onLikeUpdate={handleLikeUpdate}
              isBookmarked={savedIds.includes(thought.id)}
              onToggleBookmark={onToggleBookmark}
              onAdminDelete={async (id) => {
                if (!window.confirm(`Permanently delete thought #${id}?`)) return;
                try {
                  await adminDeleteThought(id);
                  setThoughts((prev) => prev.filter((t) => t.id !== id));
                } catch {
                  // Ignore
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
