import { useState, useEffect } from 'react'
import { fetchThoughts, CATEGORIES, type Thought, type Category } from '../api'
import ThoughtCard from './ThoughtCard'

export default function ThoughtFeed() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const load = async (category?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchThoughts(category || undefined);
      setThoughts(data);
    } catch {
      setError('Could not load thoughts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat === activeCategory ? '' : cat);
  };

  const handleLikeUpdate = (id: number, newLikes: number) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, likes: newLikes } : t))
    );
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2 className="feed-title">Campus Thoughts</h2>
        <p className="feed-subtitle">Anonymous thoughts from your campus community</p>
      </div>

      {/* Category filter chips */}
      <div className="category-filters" id="category-filters">
        <button
          className={`chip ${activeCategory === '' ? 'chip-active' : ''}`}
          onClick={() => handleCategoryChange('')}
        >
          All
        </button>
        {CATEGORIES.map((cat: Category) => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'chip-active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
            id={`filter-${cat.toLowerCase().replace(/\s/g, '-')}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Feed content */}
      {loading && (
        <div className="state-message">
          <div className="spinner" />
          <p>Loading thoughts...</p>
        </div>
      )}

      {error && (
        <div className="state-message state-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => load(activeCategory)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && thoughts.length === 0 && (
        <div className="state-message state-empty">
          <div className="empty-icon">💭</div>
          <h3>No thoughts yet</h3>
          <p>
            {activeCategory
              ? `No thoughts in "${activeCategory}" yet. Be the first to share!`
              : 'Be the first to share a thought with your campus community!'}
          </p>
        </div>
      )}

      {!loading && !error && thoughts.length > 0 && (
        <div className="thought-grid">
          {thoughts.map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              onLikeUpdate={handleLikeUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
