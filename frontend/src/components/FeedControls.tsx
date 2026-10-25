import { useEffect, useRef } from 'react';
import { CATEGORIES, type Category, type Thought } from '../api';

export type SortOption = 'latest' | 'trending' | 'oldest';

export const CATEGORY_ICONS: Record<string, string> = {
  Academics: '📚',
  Suggestions: '💡',
  Appreciation: '🌟',
  'Campus Life': '☕',
  Other: '🔮',
};

interface FeedControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  thoughts: Thought[];
  totalResults: number;
}

export default function FeedControls({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  thoughts,
  totalResults,
}: FeedControlsProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute counts per category
  const categoryCounts = thoughts.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  const isFiltered = Boolean(activeCategory || searchQuery.trim());

  const handleResetFilters = () => {
    onCategoryChange('');
    onSearchChange('');
  };

  return (
    <div className="feed-controls" id="feed-controls">
      {/* Top row: Search Bar & Sort Dropdown */}
      <div className="controls-row">
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search thoughts by keyword... (Press '/' to focus)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            id="search-thoughts-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="sort-container">
          <label htmlFor="sort-select" className="sort-label">
            Sort by:
          </label>
          <div className="sort-pills" id="sort-controls">
            <button
              className={`sort-pill ${sortBy === 'latest' ? 'sort-pill-active' : ''}`}
              onClick={() => onSortChange('latest')}
              id="sort-latest"
              title="Newest first"
            >
              🕒 Latest
            </button>
            <button
              className={`sort-pill ${sortBy === 'trending' ? 'sort-pill-active' : ''}`}
              onClick={() => onSortChange('trending')}
              id="sort-trending"
              title="Most liked first"
            >
              🔥 Trending
            </button>
            <button
              className={`sort-pill ${sortBy === 'oldest' ? 'sort-pill-active' : ''}`}
              onClick={() => onSortChange('oldest')}
              id="sort-oldest"
              title="Oldest first"
            >
              ⏳ Oldest
            </button>
          </div>
        </div>
      </div>

      {/* Category filter chips with emoji & count badges */}
      <div className="category-filters-wrapper">
        <div className="category-filters" id="category-filters">
          <button
            className={`chip ${activeCategory === '' ? 'chip-active' : ''}`}
            onClick={() => onCategoryChange('')}
            id="filter-all"
          >
            <span>✨ All</span>
            <span className="chip-badge">{thoughts.length}</span>
          </button>
          {CATEGORIES.map((cat: Category) => {
            const count = categoryCounts[cat] || 0;
            const icon = CATEGORY_ICONS[cat] || '🏷️';
            return (
              <button
                key={cat}
                className={`chip ${activeCategory === cat ? 'chip-active' : ''}`}
                onClick={() => onCategoryChange(cat === activeCategory ? '' : cat)}
                id={`filter-${cat.toLowerCase().replace(/\s/g, '-')}`}
              >
                <span>{icon} {cat}</span>
                <span className="chip-badge">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active filter summary bar */}
      {isFiltered && (
        <div className="filter-summary">
          <span>
            Showing <strong>{totalResults}</strong> {totalResults === 1 ? 'thought' : 'thoughts'}
            {activeCategory && <> in <em>"{activeCategory}"</em></>}
            {searchQuery && <> matching <em>"{searchQuery}"</em></>}
          </span>
          <button
            className="filter-reset-btn"
            onClick={handleResetFilters}
            id="reset-filters-btn"
          >
            Clear filters ×
          </button>
        </div>
      )}
    </div>
  );
}
