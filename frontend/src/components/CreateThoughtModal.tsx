import { useState } from 'react'
import { createThought, CATEGORIES, type Category } from '../api'

interface CreateThoughtModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateThoughtModal({ onClose, onCreated }: CreateThoughtModalProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.trim().length;
  const isValid = charCount >= 3 && charCount <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    try {
      await createThought(content.trim(), category);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} id="create-thought-modal">
        <div className="modal-header">
          <h2>Share a Thought</h2>
          <button className="modal-close" onClick={onClose} title="Close" id="modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label htmlFor="thought-content">Your thought</label>
            <textarea
              id="thought-content"
              className="textarea"
              placeholder="What's on your mind? Share a thought, suggestion, or appreciation anonymously..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
              autoFocus
            />
            <div className={`char-count ${charCount > 950 ? 'char-warn' : ''}`}>
              {charCount}/1000
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="thought-category">Category</label>
            <select
              id="thought-category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat: Category) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="anon-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Your thought will be posted anonymously. No names or identifiers are collected.</span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || loading}
              id="submit-thought-btn"
            >
              {loading ? 'Posting...' : 'Post Anonymously'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
