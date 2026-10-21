import { useState, useEffect } from 'react'
import {
  modGetThoughts,
  modGetReports,
  modHideThought,
  modUnhideThought,
  type ThoughtAdmin,
  type Report,
} from '../api'

export default function ModPanel() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [thoughts, setThoughts] = useState<ThoughtAdmin[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'thoughts' | 'reports'>('thoughts');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await modGetThoughts(secret);
      setAuthenticated(true);
      await loadData();
    } catch {
      setError('Invalid moderator credentials');
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
      setError('Failed to load data');
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
      } else {
        await modHideThought(id, secret);
      }
      await loadData();
    } catch {
      alert('Action failed');
    }
  };

  if (!authenticated) {
    return (
      <div className="mod-login-container">
        <div className="mod-login-card">
          <div className="mod-login-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>Moderator Access</h2>
          <p className="mod-login-desc">Enter the moderator secret to access the moderation panel.</p>
          <form onSubmit={handleLogin} className="mod-login-form">
            <input
              type="password"
              className="input"
              placeholder="Moderator secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              id="mod-secret-input"
              autoFocus
            />
            {error && <div className="form-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !secret.trim()}
              id="mod-login-btn"
            >
              {loading ? 'Verifying...' : 'Access Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-panel">
      <div className="mod-panel-header">
        <h2>Moderation Panel</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => { setAuthenticated(false); setSecret(''); }}>
          Logout
        </button>
      </div>

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
          Reports ({reports.length})
        </button>
      </div>

      {loading && (
        <div className="state-message">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      )}

      {!loading && tab === 'thoughts' && (
        <div className="mod-list">
          {thoughts.length === 0 ? (
            <p className="mod-empty">No thoughts yet.</p>
          ) : (
            thoughts.map((t) => (
              <div key={t.id} className={`mod-item ${t.is_hidden ? 'mod-item-hidden' : ''}`}>
                <div className="mod-item-top">
                  <span className="category-badge" style={{ fontSize: '0.7rem' }}>
                    {t.category}
                  </span>
                  <span className="mod-stats">
                    ❤️ {t.likes} &nbsp; 🚩 {t.reports}
                    {t.is_hidden && <span className="mod-hidden-badge">HIDDEN</span>}
                  </span>
                </div>
                <p className="mod-item-content">{t.content}</p>
                <div className="mod-item-actions">
                  <button
                    className={`btn btn-sm ${t.is_hidden ? 'btn-secondary' : 'btn-danger'}`}
                    onClick={() => handleToggleHide(t.id, t.is_hidden)}
                    id={`mod-toggle-${t.id}`}
                  >
                    {t.is_hidden ? 'Unhide' : 'Hide'}
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
            <p className="mod-empty">No reports yet.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="mod-item">
                <div className="mod-item-top">
                  <span className="mod-report-thought">Thought #{r.thought_id}</span>
                  <span className="card-time">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mod-item-content">
                  {r.reason || <em>No reason provided</em>}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
