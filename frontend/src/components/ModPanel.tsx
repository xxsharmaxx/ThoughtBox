import { useState, useEffect } from 'react';
import {
  modGetThoughts,
  modGetReports,
  modHideThought,
  modUnhideThought,
  type ThoughtAdmin,
  type Report,
} from '../api';
import { useToast } from './Toast';

export default function ModPanel() {
  const { showToast } = useToast();
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [thoughts, setThoughts] = useState<ThoughtAdmin[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'thoughts' | 'reports'>('thoughts');
  const [search, setSearch] = useState('');
  const [thoughtStatusFilter, setThoughtStatusFilter] = useState<'all' | 'flagged' | 'hidden' | 'active'>('all');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const t = await modGetThoughts(secret);
      const r = await modGetReports(secret);
      setThoughts(t);
      setReports(r);
      setAuthenticated(true);
      showToast('Authenticated as moderator 🛡️', 'success');
    } catch {
      setError('Invalid moderator credentials');
      showToast('Access denied: Invalid secret', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        modGetThoughts(secret),
        modGetReports(secret),
      ]);
      setThoughts(t);
      setReports(r);
    } catch {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  const handleToggleHide = async (id: number, isHidden: boolean) => {
    try {
      if (isHidden) {
        await modUnhideThought(id, secret);
        showToast(`Thought #${id} restored to public feed`, 'success');
      } else {
        await modHideThought(id, secret);
        showToast(`Thought #${id} hidden from public feed`, 'info');
      }
      await loadData();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  // Metrics
  const hiddenCount = thoughts.filter((t) => t.is_hidden).length;
  const reportedCount = thoughts.filter((t) => t.reports > 0).length;

  // Filtered thoughts
  const filteredThoughts = thoughts.filter((t) => {
    if (thoughtStatusFilter === 'flagged' && t.reports === 0) return false;
    if (thoughtStatusFilter === 'hidden' && !t.is_hidden) return false;
    if (thoughtStatusFilter === 'active' && t.is_hidden) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    }
    return true;
  });

  if (!authenticated) {
    return (
      <div className="mod-login-container">
        <div className="mod-login-card">
          <div className="mod-login-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2>Moderator Portal</h2>
          <p className="mod-login-desc">
            Authorized campus moderators only. Enter your credentials to manage content and review reports.
          </p>

          <form onSubmit={handleLogin} className="mod-login-form">
            <div className="form-group">
              <label htmlFor="mod-secret-input">Moderator Key</label>
              <div className="password-input-wrapper">
                <input
                  type={showSecret ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter secret passkey..."
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  id="mod-secret-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowSecret(!showSecret)}
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !secret.trim()}
              id="mod-login-btn"
            >
              {loading ? 'Verifying Credentials...' : 'Access Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-panel">
      {/* Mod Dashboard Header */}
      <div className="mod-panel-header">
        <div>
          <h2>🛡️ Campus Moderation Center</h2>
          <p className="feed-subtitle">Manage reported thoughts and community safety</p>
        </div>
        <div className="mod-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            🔄 Refresh
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAuthenticated(false);
              setSecret('');
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="mod-metrics-grid">
        <div className="mod-metric-card">
          <span className="metric-val">{thoughts.length}</span>
          <span className="metric-title">Total Submissions</span>
        </div>
        <div className="mod-metric-card">
          <span className="metric-val" style={{ color: reportedCount > 0 ? '#ef4444' : 'inherit' }}>
            {reportedCount}
          </span>
          <span className="metric-title">Flagged Thoughts</span>
        </div>
        <div className="mod-metric-card">
          <span className="metric-val" style={{ color: '#f59e0b' }}>
            {hiddenCount}
          </span>
          <span className="metric-title">Hidden Content</span>
        </div>
        <div className="mod-metric-card">
          <span className="metric-val">{reports.length}</span>
          <span className="metric-title">Total Reports Filed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mod-tabs">
        <button
          className={`mod-tab ${tab === 'thoughts' ? 'mod-tab-active' : ''}`}
          onClick={() => setTab('thoughts')}
        >
          All Thoughts ({thoughts.length})
        </button>
        <button
          className={`mod-tab ${tab === 'reports' ? 'mod-tab-active' : ''}`}
          onClick={() => setTab('reports')}
        >
          Reports Log ({reports.length})
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      {tab === 'thoughts' && (
        <div className="mod-toolbar">
          <div className="search-box mod-search">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by ID, content, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mod-filter-pills">
            {(['all', 'flagged', 'hidden', 'active'] as const).map((filter) => (
              <button
                key={filter}
                className={`mod-filter-btn ${thoughtStatusFilter === filter ? 'active' : ''}`}
                onClick={() => setThoughtStatusFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="state-message">
          <div className="spinner" />
          <p>Syncing moderation database...</p>
        </div>
      )}

      {!loading && tab === 'thoughts' && (
        <div className="mod-list">
          {filteredThoughts.length === 0 ? (
            <p className="mod-empty">No thoughts match the current filter criteria.</p>
          ) : (
            filteredThoughts.map((t) => (
              <div key={t.id} className={`mod-item ${t.is_hidden ? 'mod-item-hidden' : ''}`}>
                <div className="mod-item-top">
                  <div className="mod-item-meta">
                    <span className="mod-id">#{t.id}</span>
                    <span className="category-badge">{t.category}</span>
                    <span className="card-time">{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mod-stats">
                    <span>❤️ {t.likes}</span>
                    <span className={`mod-flag-stat ${t.reports > 0 ? 'flag-alert' : ''}`}>
                      🚩 {t.reports}
                    </span>
                    {t.is_hidden && <span className="mod-hidden-badge">HIDDEN</span>}
                  </div>
                </div>

                <p className="mod-item-content">{t.content}</p>

                <div className="mod-item-actions">
                  <button
                    className={`btn btn-sm ${t.is_hidden ? 'btn-secondary' : 'btn-danger'}`}
                    onClick={() => handleToggleHide(t.id, t.is_hidden)}
                    id={`mod-toggle-${t.id}`}
                  >
                    {t.is_hidden ? '✓ Restore to Feed' : '🚫 Hide from Feed'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === 'reports' && (
        <div className="mod-list">
          {reports.length === 0 ? (
            <p className="mod-empty">No reports on file. The community is healthy! ✨</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="mod-item">
                <div className="mod-item-top">
                  <span className="mod-report-thought">🚩 Report for Thought #{r.thought_id}</span>
                  <span className="card-time">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mod-item-content">
                  <strong>Reason:</strong> {r.reason || <em>No explanation provided</em>}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
