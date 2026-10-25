import { useState, useEffect } from 'react';
import { createThought, createPoll, CATEGORIES, type Category, type User } from '../api';
import { CATEGORY_ICONS } from './FeedControls';
import { useToast } from './Toast';

interface CreateThoughtModalProps {
  onClose: () => void;
  onCreated: () => void;
  initialPrompt?: string;
  initialCategory?: string;
  currentUser?: User | null;
  defaultMode?: 'thought' | 'poll';
}

const QUICK_STARTERS = [
  '🌟 Shoutout to: ',
  '💡 Campus Suggestion: ',
  '📚 Study tip that works: ',
  '☕ Underrated campus spot: ',
  '🤔 Unpopular opinion: ',
];

export default function CreateThoughtModal({
  onClose,
  onCreated,
  initialPrompt = '',
  initialCategory,
  currentUser,
  defaultMode = 'thought',
}: CreateThoughtModalProps) {
  const { showToast } = useToast();
  const [modalMode, setModalMode] = useState<'thought' | 'poll'>(defaultMode);

  // Thought states
  const [content, setContent] = useState(initialPrompt);
  const [category, setCategory] = useState<string>(
    initialCategory && CATEGORIES.includes(initialCategory as Category)
      ? initialCategory
      : CATEGORIES[0]
  );
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll states
  const [pollQuestion, setPollQuestion] = useState(initialPrompt);
  const [pollDescription, setPollDescription] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const charCount = content.trim().length;
  const minLength = 3;
  const maxLength = 1000;
  const isThoughtValid = charCount >= minLength && charCount <= maxLength;

  // Poll validation
  const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const isPollValid = pollQuestion.trim().length >= 5 && cleanOptions.length >= 2;

  // SVG circular progress calculation
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(charCount / maxLength, 1);
  const strokeDashoffset = circumference - progressRatio * circumference;

  const getProgressColor = () => {
    if (charCount > 950) return '#ef4444';
    if (charCount > 800) return '#f59e0b';
    return '#2563eb';
  };

  const handleStarterClick = (starter: string) => {
    if (!content.trim()) {
      setContent(starter);
    } else {
      setContent((prev) => `${starter} ${prev}`);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const copy = [...pollOptions];
    copy[idx] = val;
    setPollOptions(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (modalMode === 'thought') {
        if (!isThoughtValid) return;
        await createThought(content.trim(), category, isAnonymous);
        showToast(
          isAnonymous
            ? 'Thought posted anonymously! 🚀'
            : `Thought posted as @${currentUser?.username}! ✨`,
          'success'
        );
      } else {
        if (!isPollValid) return;
        await createPoll({
          question: pollQuestion.trim(),
          description: pollDescription.trim() || undefined,
          category,
          options: cleanOptions,
          is_anonymous: isAnonymous,
        });
        showToast('Campus poll launched successfully! 🗳️', 'success');
      }
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      showToast('Failed to publish', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} id="create-thought-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-icon">
              {modalMode === 'thought' ? '✍️' : '🗳️'}
            </span>
            <div>
              <h2>{modalMode === 'thought' ? 'Share a Campus Thought' : 'Create Community Poll'}</h2>
              <p className="modal-subtitle">
                {modalMode === 'thought'
                  ? 'Open to all students. Safe, engaging, and supportive.'
                  : 'Ask a question and gather live votes from campus members.'}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Close" id="modal-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="modal-type-switcher">
          <button
            type="button"
            className={`type-switch-btn ${modalMode === 'thought' ? 'active' : ''}`}
            onClick={() => setModalMode('thought')}
          >
            <span>💭 Share Thought</span>
          </button>
          <button
            type="button"
            className={`type-switch-btn ${modalMode === 'poll' ? 'active' : ''}`}
            onClick={() => setModalMode('poll')}
          >
            <span>📊 Launch Poll</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          {/* Visual Category Selector Tiles */}
          <div className="form-group">
            <label className="form-label-with-hint">
              <span>Select Category</span>
              <span className="field-hint">Helps students filter relevant topics</span>
            </label>
            <div className="category-tiles-grid" id="category-selector">
              {CATEGORIES.map((cat: Category) => {
                const isSelected = category === cat;
                const icon = CATEGORY_ICONS[cat] || '🏷️';
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-tile ${isSelected ? 'category-tile-active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    <span className="tile-icon">{icon}</span>
                    <span className="tile-name">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MODE A: THOUGHT POST */}
          {modalMode === 'thought' && (
            <>
              {/* Quick Starters */}
              <div className="quick-starters-section">
                <span className="starters-label">Quick ideas:</span>
                <div className="starters-pills">
                  {QUICK_STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="starter-pill"
                      onClick={() => handleStarterClick(s)}
                    >
                      {s.trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Input */}
              <div className="form-group">
                <div className="textarea-header">
                  <label htmlFor="thought-content">Your Thought</label>
                  <button
                    type="button"
                    className="preview-toggle-btn"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? '✏️ Edit Mode' : '👀 Live Preview'}
                  </button>
                </div>

                {!showPreview ? (
                  <div className="textarea-wrapper">
                    <textarea
                      id="thought-content"
                      className="textarea"
                      placeholder="What's happening on campus? Share a question, study tip, confession, or suggestion..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={5}
                      maxLength={maxLength}
                      autoFocus
                    />

                    {/* Circular Character Progress Ring */}
                    <div className="textarea-footer">
                      <span className="min-length-hint">
                        {charCount < minLength ? `At least ${minLength} characters required` : 'Ready to post'}
                      </span>
                      <div className="char-progress-wrapper" title={`${charCount} / ${maxLength} characters`}>
                        <svg width="34" height="34" viewBox="0 0 36 36" className="circular-progress">
                          <circle cx="18" cy="18" r={radius} className="progress-bg" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r={radius}
                            className="progress-fill"
                            strokeWidth="3"
                            stroke={getProgressColor()}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                          />
                        </svg>
                        <span className="char-count-text">{charCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Live Preview Card */
                  <div className="live-preview-box">
                    <div className="preview-label">Live Preview on Feed:</div>
                    <div className="thought-card preview-card">
                      <div className="card-top">
                        <span className="category-badge">
                          {CATEGORY_ICONS[category]} {category}
                        </span>
                        <span className="card-author">
                          {isAnonymous ? '👤 Anonymous' : `@${currentUser?.username}`}
                        </span>
                        <span className="card-time">just now</span>
                      </div>
                      <p className="card-content">
                        {content.trim() || <em>Start typing to see preview...</em>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* MODE B: POLL CREATION */}
          {modalMode === 'poll' && (
            <div className="poll-creation-inputs">
              <div className="form-group">
                <label className="form-label">
                  Poll Question <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Should the dining hall stay open past 10 PM?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required
                  minLength={5}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Provide additional campus context or background..."
                  value={pollDescription}
                  onChange={(e) => setPollDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Answer Choices (2 to 6 options) <span className="req">*</span>
                </label>
                <div className="poll-options-builder">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="poll-builder-row">
                      <span className="option-num-badge">{idx + 1}</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Option choice ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm remove-opt-btn"
                          onClick={() => handleRemovePollOption(idx)}
                          title="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm add-option-btn"
                      onClick={handleAddPollOption}
                    >
                      + Add Another Choice
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Author / Anonymity Option */}
          {currentUser && (
            <div className="author-visibility-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span>
                  Post as <strong>Anonymous</strong> (uncheck to show <strong>@{currentUser.username}</strong>)
                </span>
              </label>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={(modalMode === 'thought' ? !isThoughtValid : !isPollValid) || loading}
              id="submit-thought-btn"
            >
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  <span>Publishing...</span>
                </>
              ) : modalMode === 'thought' ? (
                isAnonymous ? '🚀 Post Anonymously' : `🚀 Post as @${currentUser?.username}`
              ) : (
                '🗳️ Launch Community Poll'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
