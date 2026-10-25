import { useState, useEffect } from 'react';
import { fetchPolls, adminUpdatePoll, adminDeletePoll, type Poll, type User } from '../api';
import PollCard from './PollCard';
import { useToast } from './Toast';

interface PollFeedProps {
  currentUser?: User | null;
  isAdmin?: boolean;
  onOpenCreatePoll: () => void;
}

const POLL_CATEGORIES = ['All', 'Campus Life', 'Academics', 'Suggestions', 'Appreciation', 'Other'];

export default function PollFeed({ currentUser, isAdmin = false, onOpenCreatePoll }: PollFeedProps) {
  const { showToast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const data = await fetchPolls(selectedCategory === 'All' ? undefined : selectedCategory);
      setPolls(data);
    } catch {
      showToast('Failed to load campus polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, [selectedCategory]);

  const handlePollUpdated = (updated: Poll) => {
    setPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAdminToggleActive = async (pollId: number, currentActive: boolean) => {
    try {
      const updated = await adminUpdatePoll(pollId, { is_active: !currentActive });
      handlePollUpdated(updated);
      showToast(`Poll #${pollId} ${!currentActive ? 'reopened' : 'closed'} successfully`, 'success');
    } catch {
      showToast('Failed to update poll status', 'error');
    }
  };

  const handleAdminDelete = async (pollId: number) => {
    if (!window.confirm(`Permanently delete poll #${pollId}? This cannot be undone.`)) return;
    try {
      await adminDeletePoll(pollId);
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
      showToast(`Poll #${pollId} deleted`, 'info');
    } catch {
      showToast('Failed to delete poll', 'error');
    }
  };

  const displayedPolls = filterActiveOnly ? polls.filter((p) => p.is_active) : polls;
  const totalVotesCast = polls.reduce((sum, p) => sum + p.total_votes, 0);

  return (
    <div className="feed-container poll-feed-container">
      {/* Polls Hero Banner */}
      <div className="poll-hero-banner">
        <div className="poll-hero-left">
          <div className="poll-hero-badge">
            <span className="poll-badge-icon">🗳️</span>
            <span>Real-time Voice of the Campus</span>
          </div>
          <h2 className="poll-hero-title">Campus Polls & Community Voting</h2>
          <p className="poll-hero-desc">
            Vote on student initiatives, campus dining, exam schedules, and library hours. Every vote counts!
          </p>
          <div className="poll-hero-stats">
            <div className="poll-stat-item">
              <span className="stat-number">{polls.length}</span>
              <span className="stat-name">Active Polls</span>
            </div>
            <div className="poll-stat-item">
              <span className="stat-number">{totalVotesCast}</span>
              <span className="stat-name">Total Votes</span>
            </div>
          </div>
        </div>

        <div className="poll-hero-right">
          <button
            type="button"
            className="btn btn-primary btn-lg create-poll-cta-btn"
            onClick={onOpenCreatePoll}
          >
            <span className="btn-icon">➕</span>
            <span>Create New Poll</span>
          </button>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="feed-controls poll-controls">
        <div className="category-chips poll-chips">
          {POLL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>

        <div className="poll-filter-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
            />
            <span>Active Only</span>
          </label>
        </div>
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="feed-loading">
          <div className="spinner" />
          <p>Loading community polls...</p>
        </div>
      ) : displayedPolls.length === 0 ? (
        <div className="empty-state poll-empty-state">
          <div className="empty-icon">🗳️</div>
          <h3>No polls found in this category</h3>
          <p>Be the first campus member to ask a question and gather votes!</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreatePoll}
          >
            Create the First Poll
          </button>
        </div>
      ) : (
        <div className="poll-cards-grid">
          {displayedPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onPollUpdated={handlePollUpdated}
              onAdminDelete={handleAdminDelete}
              onAdminToggleActive={handleAdminToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
