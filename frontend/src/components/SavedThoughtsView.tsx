import { useState } from 'react';
import { type Thought } from '../api';
import ThoughtCard from './ThoughtCard';

interface SavedThoughtsViewProps {
  thoughts: Thought[];
  savedIds: number[];
  onToggleBookmark: (id: number) => void;
  onLikeUpdate: (id: number, newLikes: number) => void;
  onExploreFeed: () => void;
}

export default function SavedThoughtsView({
  thoughts,
  savedIds,
  onToggleBookmark,
  onLikeUpdate,
  onExploreFeed,
}: SavedThoughtsViewProps) {
  const [search, setSearch] = useState('');

  const savedThoughts = thoughts.filter((t) => savedIds.includes(t.id));
  const filtered = savedThoughts.filter((t) =>
    t.content.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="saved-view" id="saved-view">
      <div className="saved-header">
        <div>
          <h2 className="feed-title">🔖 Saved Bookmarks</h2>
          <p className="feed-subtitle">
            Thoughts you’ve bookmarked on this device ({savedThoughts.length} saved)
          </p>
        </div>

        {savedThoughts.length > 0 && (
          <div className="search-box saved-search">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search saved..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {savedThoughts.length === 0 ? (
        <div className="state-message state-empty">
          <div className="empty-icon">🔖</div>
          <h3>No saved thoughts yet</h3>
          <p>
            When you see a thought, suggestion, or campus tip you want to remember, click the{' '}
            <strong>Save</strong> button on any card.
          </p>
          <button className="btn btn-primary" onClick={onExploreFeed} style={{ marginTop: '14px' }}>
            Browse Campus Thoughts →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="state-message state-empty">
          <div className="empty-icon">🔍</div>
          <h3>No matches in your bookmarks</h3>
          <p>No saved thoughts match "{search}".</p>
          <button className="btn btn-secondary" onClick={() => setSearch('')}>
            Clear Search
          </button>
        </div>
      ) : (
        <div className="thought-grid">
          {filtered.map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              onLikeUpdate={onLikeUpdate}
              isBookmarked={true}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
