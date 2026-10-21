import { useState } from 'react'
import { likeThought, reportThought, type Thought } from '../api'

interface ThoughtCardProps {
  thought: Thought;
  onLikeUpdate: (id: number, newLikes: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Academics: '#3b82f6',
  Suggestions: '#f59e0b',
  Appreciation: '#10b981',
  'Campus Life': '#8b5cf6',
  Other: '#6b7280',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ThoughtCard({ thought, onLikeUpdate }: ThoughtCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const handleLike = async () => {
    if (liked || likeLoading) return;
    setLikeLoading(true);
    try {
      await likeThought(thought.id);
      setLiked(true);
      onLikeUpdate(thought.id, thought.likes + 1);
    } catch {
      // Silent fail for likes
    } finally {
      setLikeLoading(false);
    }
  };

  const handleReport = async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      await reportThought(thought.id, reportReason);
      setReportSent(true);
      setShowReport(false);
    } catch {
      alert('Could not submit report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const catColor = CATEGORY_COLORS[thought.category] || '#6b7280';

  return (
    <article className="thought-card" id={`thought-${thought.id}`}>
      <div className="card-top">
        <span
          className="category-badge"
          style={{ backgroundColor: `${catColor}18`, color: catColor, borderColor: `${catColor}40` }}
        >
          {thought.category}
        </span>
        <span className="card-time">{timeAgo(thought.created_at)}</span>
      </div>

      <p className="card-content">{thought.content}</p>

      <div className="card-actions">
        <button
          className={`action-btn like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={liked || likeLoading}
          title={liked ? 'Already liked' : 'Like this thought'}
          id={`like-btn-${thought.id}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{thought.likes}</span>
        </button>

        {!reportSent ? (
          <button
            className="action-btn report-btn"
            onClick={() => setShowReport(!showReport)}
            title="Report this thought"
            id={`report-btn-${thought.id}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
        ) : (
          <span className="report-thanks">Reported ✓</span>
        )}
      </div>

      {showReport && (
        <div className="report-form">
          <input
            type="text"
            className="input"
            placeholder="Reason (optional)"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            maxLength={255}
            id={`report-reason-${thought.id}`}
          />
          <div className="report-form-actions">
            <button className="btn btn-sm btn-danger" onClick={handleReport} disabled={reportLoading}>
              {reportLoading ? 'Sending...' : 'Submit Report'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowReport(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
