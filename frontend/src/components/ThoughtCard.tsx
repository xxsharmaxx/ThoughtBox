import { useState } from 'react';
import {
  likeThought,
  reportThought,
  fetchComments,
  createComment,
  type Thought,
  type Comment,
  type User,
} from '../api';
import { CATEGORY_ICONS } from './FeedControls';
import { useToast } from './Toast';

interface ThoughtCardProps {
  thought: Thought;
  currentUser?: User | null;
  isAdmin?: boolean;
  onLikeUpdate: (id: number, newLikes: number) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: number) => void;
  onAdminEdit?: (thought: Thought) => void;
  onAdminDelete?: (id: number) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Academics: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  Suggestions: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  Appreciation: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  'Campus Life': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  Other: { bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' },
};

const REPORT_REASONS = [
  'Inappropriate or offensive',
  'Harassment or hate speech',
  'Spam or advertising',
  'False information',
  'Other violation',
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ThoughtCard({
  thought,
  currentUser,
  isAdmin = false,
  onLikeUpdate,
  isBookmarked = false,
  onToggleBookmark,
  onAdminEdit,
  onAdminDelete,
}: ThoughtCardProps) {
  const { showToast } = useToast();

  // Persistent like state from localStorage
  const [liked, setLiked] = useState(() => {
    try {
      const stored = localStorage.getItem(`thoughtbox_liked_${thought.id}`);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [likeLoading, setLikeLoading] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsCount, setCommentsCount] = useState(thought.comments_count ?? 0);

  const catStyle = CATEGORY_COLORS[thought.category] || CATEGORY_COLORS.Other;
  const catIcon = CATEGORY_ICONS[thought.category] || '🏷️';

  const handleLike = async () => {
    if (liked || likeLoading) return;
    setLikeLoading(true);
    setShowHeartBurst(true);

    try {
      await likeThought(thought.id);
      setLiked(true);
      try {
        localStorage.setItem(`thoughtbox_liked_${thought.id}`, 'true');
      } catch {
        // Ignore
      }
      onLikeUpdate(thought.id, thought.likes + 1);
      showToast('Liked thought! ❤️', 'success');
    } catch {
      showToast('Could not like thought. Try again later.', 'error');
    } finally {
      setLikeLoading(false);
      setTimeout(() => setShowHeartBurst(false), 900);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`"${thought.content}" — Shared via ThoughtBox`);
      showToast('Copied thought to clipboard! 📋', 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'warning');
    }
  };

  const handleBookmarkToggle = () => {
    if (onToggleBookmark) {
      onToggleBookmark(thought.id);
      showToast(
        isBookmarked ? 'Removed from saved thoughts' : 'Saved to your bookmarks! 🔖',
        'info'
      );
    }
  };

  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);
    if (nextState && !commentsLoaded) {
      try {
        const data = await fetchComments(thought.id);
        setComments(data);
        setCommentsLoaded(true);
        setCommentsCount(data.length);
      } catch {
        showToast('Failed to load comments', 'error');
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const newComment = await createComment(thought.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentsCount((c) => c + 1);
      setCommentText('');
      showToast('Comment posted! 💬', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportLoading || hasReported) return;
    setReportLoading(true);

    const finalReason = customReason.trim()
      ? `${selectedReason}: ${customReason.trim()}`
      : selectedReason;

    try {
      await reportThought(thought.id, finalReason);
      setHasReported(true);
      setShowReportModal(false);
      showToast('Report submitted. Thank you for keeping the campus safe! 🛡️', 'success');
    } catch {
      showToast('Failed to submit report. Please try again.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <article className="thought-card" id={`thought-${thought.id}`}>
      {/* Category header & author & timestamp */}
      <div className="card-top">
        <div className="card-top-left">
          <span
            className="category-badge"
            style={{
              backgroundColor: catStyle.bg,
              color: catStyle.text,
              borderColor: catStyle.border,
            }}
          >
            <span className="cat-icon">{catIcon}</span>
            <span className="cat-name">{thought.category}</span>
          </span>

          <span className="author-badge">
            👤 {thought.author_name || 'Anonymous'}
          </span>
        </div>

        <div className="card-meta-right">
          <span className="card-time" title={new Date(thought.created_at).toLocaleString()}>
            🕒 {timeAgo(thought.created_at)}
          </span>
        </div>
      </div>

      {/* Main thought content */}
      <p className="card-content">{thought.content}</p>

      {/* Action bar */}
      <div className="card-actions">
        {/* Like Button */}
        <div className="like-wrapper">
          <button
            className={`action-btn like-btn ${liked ? 'liked' : ''} ${likeLoading ? 'loading' : ''}`}
            onClick={handleLike}
            disabled={liked || likeLoading}
            title={liked ? 'You liked this' : 'Like this thought'}
            id={`like-btn-${thought.id}`}
            aria-label="Like"
          >
            <svg
              className="heart-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="like-count">{thought.likes}</span>
          </button>
          {showHeartBurst && (
            <span className="floating-heart" aria-hidden="true">
              ❤️
            </span>
          )}
        </div>

        {/* Comments Toggle Button */}
        <button
          className={`action-btn comments-btn ${showComments ? 'active' : ''}`}
          onClick={handleToggleComments}
          title="View comments"
          id={`comments-btn-${thought.id}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="action-label">{commentsCount > 0 ? commentsCount : 'Comment'}</span>
        </button>

        {/* Bookmark Button */}
        <button
          className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmarkToggle}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this thought'}
          id={`bookmark-btn-${thought.id}`}
          aria-label="Bookmark"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span className="action-label">{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>

        {/* Share / Copy Button */}
        <button
          className="action-btn share-btn"
          onClick={handleCopy}
          title="Copy thought to clipboard"
          id={`share-btn-${thought.id}`}
          aria-label="Copy to clipboard"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span className="action-label">Share</span>
        </button>

        {/* Admin Direct Actions or Report */}
        <div className="card-actions-right">
          {isAdmin ? (
            <div className="card-admin-direct-actions">
              {onAdminEdit && (
                <button
                  type="button"
                  className="action-btn admin-card-btn"
                  onClick={() => onAdminEdit(thought)}
                  title="Admin Edit"
                >
                  ✏️
                </button>
              )}
              {onAdminDelete && (
                <button
                  type="button"
                  className="action-btn admin-card-btn"
                  onClick={() => onAdminDelete(thought.id)}
                  title="Admin Delete"
                >
                  🗑️
                </button>
              )}
            </div>
          ) : !hasReported ? (
            <button
              className="action-btn report-btn"
              onClick={() => setShowReportModal(true)}
              title="Report inappropriate content"
              id={`report-btn-${thought.id}`}
              aria-label="Report"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
          ) : (
            <span className="report-thanks" title="Report submitted">
              ✓ Reported
            </span>
          )}
        </div>
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="thought-comments-drawer">
          <div className="comments-header">
            <span className="comments-title">Discussion & Replies</span>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments-msg">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="comment-bubble">
                  <div className="comment-meta">
                    <span className="comment-author">@{c.author_name}</span>
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                </div>
              ))
            )}
          </div>

          {/* New Comment Input */}
          <form onSubmit={handleAddComment} className="comment-input-form">
            <input
              type="text"
              className="form-input comment-input"
              placeholder={
                currentUser
                  ? `Reply as @${currentUser.username}...`
                  : 'Add a helpful reply or thought...'
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              required
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm comment-submit-btn"
              disabled={commentSubmitting || !commentText.trim()}
            >
              {commentSubmitting ? '...' : 'Reply'}
            </button>
          </form>
        </div>
      )}

      {/* Interactive Report Dialog Modal */}
      {showReportModal && (
        <div className="report-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <h4>Report Thought #{thought.id}</h4>
              <button
                className="close-sm-btn"
                onClick={() => setShowReportModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="report-modal-hint">
              Help keep our campus community respectful and constructive.
            </p>

            <form onSubmit={handleReportSubmit}>
              <div className="report-reasons-list">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason} className="report-radio-label">
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="Additional context (optional)..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  maxLength={150}
                  id={`report-custom-reason-${thought.id}`}
                />
              </div>

              <div className="report-modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-danger"
                  disabled={reportLoading}
                  id={`submit-report-btn-${thought.id}`}
                >
                  {reportLoading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
