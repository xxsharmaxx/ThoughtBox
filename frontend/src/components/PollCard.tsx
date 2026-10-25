import { useState } from 'react';
import { votePoll, type Poll, type User } from '../api';
import { CATEGORY_ICONS } from './FeedControls';
import { useToast } from './Toast';

interface PollCardProps {
  poll: Poll;
  currentUser?: User | null;
  isAdmin?: boolean;
  onPollUpdated: (updated: Poll) => void;
  onAdminDelete?: (pollId: number) => void;
  onAdminToggleActive?: (pollId: number, currentActive: boolean) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Academics: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  Suggestions: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  Appreciation: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  'Campus Life': { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  Other: { bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' },
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
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PollCard({
  poll,
  currentUser,
  isAdmin = false,
  onPollUpdated,
  onAdminDelete,
  onAdminToggleActive,
}: PollCardProps) {
  const { showToast } = useToast();
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(poll.user_voted_option_id || null);
  const [voting, setVoting] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasVoted = Boolean(poll.user_voted_option_id || selectedOptionId);
  const catStyle = CATEGORY_COLORS[poll.category] || CATEGORY_COLORS.Other;
  const catIcon = CATEGORY_ICONS[poll.category] || '📊';

  // Find leading option
  const maxVotes = Math.max(...poll.options.map((o) => o.votes_count), 0);

  const handleVote = async (optionId: number) => {
    if (hasVoted || voting || !poll.is_active) return;
    setVoting(true);
    try {
      const updated = await votePoll(poll.id, optionId);
      setSelectedOptionId(optionId);
      onPollUpdated(updated);
      showToast('Vote counted! Thank you for participating 🗳️', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit vote', 'error');
    } finally {
      setVoting(false);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      showToast('Poll link copied to clipboard! 📋', 'info');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <article className={`card poll-card ${!poll.is_active ? 'poll-closed' : ''}`} id={`poll-${poll.id}`}>
      {/* Poll Header */}
      <div className="card-header poll-card-header">
        <div className="poll-badge-group">
          <span
            className="category-pill"
            style={{
              backgroundColor: catStyle.bg,
              color: catStyle.text,
              borderColor: catStyle.border,
            }}
          >
            <span className="cat-icon">{catIcon}</span>
            <span>{poll.category}</span>
          </span>

          <span className={`poll-status-pill ${poll.is_active ? 'status-active' : 'status-ended'}`}>
            <span className="status-dot" />
            <span>{poll.is_active ? 'Live Poll' : 'Ended'}</span>
          </span>
        </div>

        <div className="card-meta">
          <span className="author-tag" title="Poll author">
            👤 {poll.author_name || 'Campus Community'}
          </span>
          <span className="meta-dot">·</span>
          <time dateTime={poll.created_at} className="post-time">
            {timeAgo(poll.created_at)}
          </time>
        </div>
      </div>

      {/* Question & Description */}
      <div className="poll-question-wrapper">
        <h3 className="poll-question">{poll.question}</h3>
        {poll.description && <p className="poll-description">{poll.description}</p>}
      </div>

      {/* Options List */}
      <div className="poll-options-list">
        {poll.options.map((option) => {
          const isSelected = (poll.user_voted_option_id === option.id) || (selectedOptionId === option.id);
          const isLeader = maxVotes > 0 && option.votes_count === maxVotes;

          return (
            <div
              key={option.id}
              className={`poll-option-row ${isSelected ? 'is-selected' : ''} ${hasVoted ? 'voted-mode' : 'voting-mode'} ${isLeader && hasVoted ? 'is-leader' : ''}`}
              onClick={() => !hasVoted && poll.is_active && handleVote(option.id)}
              role={!hasVoted && poll.is_active ? 'button' : undefined}
              tabIndex={!hasVoted && poll.is_active ? 0 : undefined}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <div
                  className="poll-option-progress"
                  style={{ width: `${option.percentage}%` }}
                />
              )}

              <div className="poll-option-content">
                <div className="poll-option-text-group">
                  {!hasVoted && poll.is_active && (
                    <span className="poll-radio-circle" />
                  )}
                  {isSelected && (
                    <span className="poll-voted-check" title="Your vote">✓</span>
                  )}
                  <span className="poll-option-label">{option.text}</span>
                  {isSelected && <span className="poll-user-tag">You</span>}
                  {isLeader && hasVoted && poll.total_votes > 2 && (
                    <span className="poll-leader-tag">Leading</span>
                  )}
                </div>

                {hasVoted && (
                  <div className="poll-option-stats">
                    <span className="poll-option-pct">{option.percentage}%</span>
                    <span className="poll-option-count">({option.votes_count})</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Admin Actions */}
      <div className="card-footer poll-card-footer">
        <div className="poll-total-votes">
          <span className="poll-vote-icon">🗳️</span>
          <span>
            <strong>{poll.total_votes}</strong> {poll.total_votes === 1 ? 'total vote' : 'total votes'}
          </span>
          {hasVoted && <span className="voted-confirmation-pill">✓ You voted</span>}
        </div>

        <div className="poll-footer-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopyLink}
            title="Share Poll"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>

          {/* Admin quick controls */}
          {isAdmin && (
            <div className="poll-admin-actions">
              {onAdminToggleActive && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm admin-toggle-btn"
                  onClick={() => onAdminToggleActive(poll.id, poll.is_active)}
                  title={poll.is_active ? 'Close this poll' : 'Reopen poll'}
                >
                  {poll.is_active ? 'Close' : 'Reopen'}
                </button>
              )}
              {onAdminDelete && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm admin-del-btn"
                  onClick={() => onAdminDelete(poll.id)}
                  title="Delete poll"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
