import { useState, useEffect } from 'react';
import {
  adminGetStats,
  adminGetThoughts,
  adminEditThought,
  adminDeleteThought,
  adminClearReports,
  adminGetReports,
  adminDismissReport,
  adminGetPolls,
  adminUpdatePoll,
  adminDeletePoll,
  createPoll,
  adminGetUsers,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminDeleteUser,
  modHideThought,
  modUnhideThought,
  loginUser,
  type AdminStats,
  type ThoughtAdmin,
  type Report,
  type Poll,
  type User,
  CATEGORIES,
} from '../api';
import { useToast } from './Toast';

interface AdminDashboardProps {
  currentUser?: User | null;
  onUserRoleChanged?: (updatedUser: User) => void;
}

type AdminTab = 'overview' | 'thoughts' | 'polls' | 'reports' | 'users';

export default function AdminDashboard({ currentUser, onUserRoleChanged }: AdminDashboardProps) {
  const { showToast } = useToast();

  // Authentication
  const isUserAdmin = currentUser?.role === 'admin';
  const [authKey, setAuthKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isUserAdmin);
  const [authMode, setAuthMode] = useState<'login' | 'secret'>('login');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [secretInput, setSecretInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [thoughts, setThoughts] = useState<ThoughtAdmin[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Thought filters
  const [thoughtStatusFilter, setThoughtStatusFilter] = useState<'all' | 'flagged' | 'hidden' | 'active'>('all');
  const [thoughtCategoryFilter, setThoughtCategoryFilter] = useState<string>('All');
  const [thoughtSearch, setThoughtSearch] = useState<string>('');

  // Editing Thought modal
  const [editingThought, setEditingThought] = useState<ThoughtAdmin | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIsHidden, setEditIsHidden] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Create Poll modal
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollCategory, setNewPollCategory] = useState<string>('Campus Life');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [createPollSaving, setCreatePollSaving] = useState(false);

  // Sync state if currentUser becomes admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  // Load all admin data
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [st, th, po, re, us] = await Promise.all([
        adminGetStats(authKey || undefined),
        adminGetThoughts(authKey || undefined, {
          status: thoughtStatusFilter,
          category: thoughtCategoryFilter,
          search: thoughtSearch,
        }),
        adminGetPolls(authKey || undefined),
        adminGetReports(authKey || undefined),
        adminGetUsers(authKey || undefined),
      ]);
      setStats(st);
      setThoughts(th);
      setPolls(po);
      setReports(re);
      setUsers(us);
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated, thoughtStatusFilter, thoughtCategoryFilter, thoughtSearch]);

  // Admin login handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await loginUser({
          username_or_email: adminUsername,
          password: adminPassword,
        });
        if (res.user.role !== 'admin') {
          showToast('Account is authenticated but does not have Admin privileges', 'error');
          return;
        }
        setIsAuthenticated(true);
        if (onUserRoleChanged) onUserRoleChanged(res.user);
        showToast('Logged in as Administrator 🛡️', 'success');
      } else {
        // Moderator secret header authentication
        await adminGetStats(secretInput);
        setAuthKey(secretInput);
        setIsAuthenticated(true);
        showToast('Authenticated via Moderator Secret 🛡️', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed: Invalid credentials', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Thought Actions ---
  const handleOpenEdit = (t: ThoughtAdmin) => {
    setEditingThought(t);
    setEditContent(t.content);
    setEditCategory(t.category);
    setEditIsHidden(t.is_hidden);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThought) return;
    setEditSaving(true);
    try {
      await adminEditThought(
        editingThought.id,
        {
          content: editContent,
          category: editCategory,
          is_hidden: editIsHidden,
        },
        authKey || undefined
      );
      showToast(`Thought #${editingThought.id} updated successfully! ✏️`, 'success');
      setEditingThought(null);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update thought', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteThought = async (id: number) => {
    if (!window.confirm(`Permanently delete Thought #${id}? This will remove all reports and comments.`)) return;
    try {
      await adminDeleteThought(id, authKey || undefined);
      showToast(`Thought #${id} permanently deleted 🗑️`, 'info');
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete thought', 'error');
    }
  };

  const handleToggleHideThought = async (id: number, currentHidden: boolean) => {
    try {
      if (currentHidden) {
        await modUnhideThought(id, authKey || 'change-me-in-production');
        showToast(`Thought #${id} unhidden & restored to feed`, 'success');
      } else {
        await modHideThought(id, authKey || 'change-me-in-production');
        showToast(`Thought #${id} hidden from public feed`, 'info');
      }
      await loadAdminData();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleClearReports = async (id: number) => {
    try {
      await adminClearReports(id, authKey || undefined);
      showToast(`Reports cleared for Thought #${id} 🛡️`, 'success');
      await loadAdminData();
    } catch {
      showToast('Failed to clear reports', 'error');
    }
  };

  // --- Poll Actions ---
  const handleTogglePollStatus = async (pollId: number, currentActive: boolean) => {
    try {
      await adminUpdatePoll(pollId, { is_active: !currentActive }, authKey || undefined);
      showToast(`Poll #${pollId} ${!currentActive ? 'reopened' : 'closed'}`, 'success');
      await loadAdminData();
    } catch {
      showToast('Failed to update poll', 'error');
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    if (!window.confirm(`Permanently delete Poll #${pollId}? All votes will be erased.`)) return;
    try {
      await adminDeletePoll(pollId, authKey || undefined);
      showToast(`Poll #${pollId} deleted 🗑️`, 'info');
      await loadAdminData();
    } catch {
      showToast('Failed to delete poll', 'error');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOpts = newPollOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      showToast('Please provide at least 2 options', 'error');
      return;
    }
    setCreatePollSaving(true);
    try {
      await createPoll({
        question: newPollQuestion,
        category: newPollCategory,
        options: cleanOpts,
      });
      showToast('New community poll launched! 🚀', 'success');
      setShowCreatePollModal(false);
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create poll', 'error');
    } finally {
      setCreatePollSaving(false);
    }
  };

  // --- Report Actions ---
  const handleDismissReport = async (reportId: number) => {
    try {
      await adminDismissReport(reportId, authKey || undefined);
      showToast(`Report #${reportId} dismissed`, 'info');
      await loadAdminData();
    } catch {
      showToast('Failed to dismiss report', 'error');
    }
  };

  // --- User Management Actions ---
  const handleToggleUserRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change @${user.username}'s role to "${newRole}"?`)) return;
    try {
      await adminUpdateUserRole(user.id, newRole, authKey || undefined);
      showToast(`User @${user.username} is now ${newRole} 👑`, 'success');
      await loadAdminData();
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = !user.is_active;
    try {
      await adminUpdateUserStatus(user.id, newStatus, authKey || undefined);
      showToast(`User @${user.username} ${newStatus ? 'reactivated' : 'suspended'}`, 'info');
      await loadAdminData();
    } catch {
      showToast('Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Permanently delete user @${user.username}?`)) return;
    try {
      await adminDeleteUser(user.id, authKey || undefined);
      showToast(`User @${user.username} deleted`, 'info');
      await loadAdminData();
    } catch {
      showToast('Failed to delete user', 'error');
    }
  };

  // ============================================================
  // RENDER: AUTHENTICATION GATE
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div className="admin-gate-container">
        <div className="admin-gate-card">
          <div className="admin-gate-header">
            <div className="gate-icon-badge">🛡️</div>
            <h2>Admin Control Center</h2>
            <p>Access management dashboard for thoughts, polls, reports, and users.</p>
          </div>

          <div className="admin-gate-tabs">
            <button
              type="button"
              className={`gate-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Sign In as Admin
            </button>
            <button
              type="button"
              className={`gate-tab ${authMode === 'secret' ? 'active' : ''}`}
              onClick={() => setAuthMode('secret')}
            >
              Moderator Secret Key
            </button>
          </div>

          <div className="demo-credentials-banner">
            <div className="demo-text">
              <span>💡 <strong>Quick Demo Admin:</strong> username: <code>admin</code> | pass: <code>admin123</code></span>
            </div>
            <button
              type="button"
              className="demo-fill-btn"
              onClick={() => {
                setAuthMode('login');
                setAdminUsername('admin');
                setAdminPassword('admin123');
              }}
            >
              Fill Credentials
            </button>
          </div>

          <form onSubmit={handleAdminLogin} className="admin-gate-form">
            {authMode === 'login' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">Moderator Secret</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter secret (default: change-me-in-production)"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={authLoading}
            >
              {authLoading ? 'Verifying Credentials...' : 'Unlock Admin Dashboard 🔓'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: ADMIN DASHBOARD
  // ============================================================
  return (
    <div className="admin-dashboard-container">
      {/* Top Header */}
      <div className="admin-header-bar">
        <div className="admin-header-left">
          <div className="admin-title-group">
            <span className="admin-shield-icon">🛡️</span>
            <div>
              <h1 className="admin-page-title">Admin & Moderation Hub</h1>
              <p className="admin-subtitle">
                Manage thoughts, community polls, safety reports, and campus members
              </p>
            </div>
          </div>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadAdminData}
            disabled={loading}
            title="Refresh data"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsAuthenticated(false)}
            title="Exit admin view"
          >
            Lock Dashboard 🔒
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs">
        <button
          className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          <span>Overview</span>
        </button>

        <button
          className={`admin-nav-tab ${activeTab === 'thoughts' ? 'active' : ''}`}
          onClick={() => setActiveTab('thoughts')}
        >
          <span className="tab-icon">💬</span>
          <span>Thoughts</span>
          <span className="tab-pill">{thoughts.length}</span>
        </button>

        <button
          className={`admin-nav-tab ${activeTab === 'polls' ? 'active' : ''}`}
          onClick={() => setActiveTab('polls')}
        >
          <span className="tab-icon">🗳️</span>
          <span>Polls</span>
          <span className="tab-pill">{polls.length}</span>
        </button>

        <button
          className={`admin-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <span className="tab-icon">🚩</span>
          <span>Reports</span>
          {reports.length > 0 && <span className="tab-pill tab-pill-warn">{reports.length}</span>}
        </button>

        <button
          className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">👥</span>
          <span>Users</span>
          <span className="tab-pill">{users.length}</span>
        </button>
      </nav>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="admin-section overview-section">
          {/* Stats Metric Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Thoughts Feed</span>
                <span className="stat-icon-wrap bg-blue">💬</span>
              </div>
              <div className="stat-card-body">
                <span className="stat-main-number">{stats?.total_thoughts ?? thoughts.length}</span>
                <div className="stat-subtext">
                  <span className="sub-ok">{stats?.active_thoughts ?? 0} active</span> ·{' '}
                  <span className="sub-warn">{stats?.hidden_thoughts ?? 0} hidden</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Community Polls</span>
                <span className="stat-icon-wrap bg-purple">🗳️</span>
              </div>
              <div className="stat-card-body">
                <span className="stat-main-number">{stats?.total_polls ?? polls.length}</span>
                <div className="stat-subtext">
                  <span className="sub-ok">{stats?.active_polls ?? 0} live</span> ·{' '}
                  <span>{stats?.total_votes ?? 0} total votes</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Flagged Content</span>
                <span className="stat-icon-wrap bg-orange">🚩</span>
              </div>
              <div className="stat-card-body">
                <span className="stat-main-number">{stats?.total_reports ?? reports.length}</span>
                <div className="stat-subtext">
                  <span className="sub-danger">{stats?.reported_thoughts ?? 0} thoughts flagged</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-title">Registered Members</span>
                <span className="stat-icon-wrap bg-emerald">👥</span>
              </div>
              <div className="stat-card-body">
                <span className="stat-main-number">{stats?.total_users ?? users.length}</span>
                <div className="stat-subtext">
                  <span className="sub-ok">{stats?.admin_users ?? 0} administrators</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Distribution */}
          <div className="overview-row">
            <div className="card overview-card">
              <h3>⚡ Quick Admin Shortcuts</h3>
              <div className="quick-actions-list">
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab('polls');
                    setShowCreatePollModal(true);
                  }}
                >
                  <span className="qa-icon">➕</span>
                  <div>
                    <strong>Create Official Campus Poll</strong>
                    <p>Launch an interactive voting topic for students</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    setActiveTab('thoughts');
                    setThoughtStatusFilter('flagged');
                  }}
                >
                  <span className="qa-icon">🛡️</span>
                  <div>
                    <strong>Review Reported Content ({reports.length})</strong>
                    <p>Take moderation action on reported posts</p>
                  </div>
                </button>

                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => setActiveTab('users')}
                >
                  <span className="qa-icon">👑</span>
                  <div>
                    <strong>Manage User Roles ({users.length})</strong>
                    <p>Promote members to moderators or admins</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="card overview-card">
              <h3>🏷️ Thoughts by Category</h3>
              <div className="category-distribution-list">
                {CATEGORIES.map((cat) => {
                  const count = stats?.category_breakdown?.[cat] ?? thoughts.filter((t) => t.category === cat).length;
                  const total = stats?.total_thoughts || thoughts.length || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={cat} className="cat-dist-row">
                      <div className="cat-dist-label">
                        <span>{cat}</span>
                        <span className="cat-dist-count">{count} ({pct}%)</span>
                      </div>
                      <div className="cat-dist-bar-track">
                        <div className="cat-dist-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: THOUGHTS MANAGER */}
      {activeTab === 'thoughts' && (
        <div className="admin-section thoughts-section">
          {/* Controls Bar */}
          <div className="admin-controls-bar">
            <div className="admin-search-wrapper">
              <input
                type="text"
                className="form-input admin-search-input"
                placeholder="Search thoughts by content, author, or ID..."
                value={thoughtSearch}
                onChange={(e) => setThoughtSearch(e.target.value)}
              />
            </div>

            <div className="admin-filter-group">
              <select
                className="form-select admin-filter-select"
                value={thoughtStatusFilter}
                onChange={(e: any) => setThoughtStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Visible)</option>
                <option value="hidden">Hidden</option>
                <option value="flagged">Flagged ({reports.length})</option>
              </select>

              <select
                className="form-select admin-filter-select"
                value={thoughtCategoryFilter}
                onChange={(e) => setThoughtCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Thoughts List */}
          {thoughts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>No thoughts matched your current filter criteria.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Content</th>
                    <th>Author</th>
                    <th>Engagement</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {thoughts.map((t) => (
                    <tr key={t.id} className={t.is_hidden ? 'row-hidden' : t.reports > 0 ? 'row-flagged' : ''}>
                      <td className="td-id">#{t.id}</td>
                      <td>
                        <span className="badge-category">{t.category}</span>
                      </td>
                      <td className="td-content">
                        <p className="table-content-text">{t.content}</p>
                      </td>
                      <td>
                        <span className="table-author">{t.author_name || 'Anonymous'}</span>
                      </td>
                      <td>
                        <div className="table-stats-pill">
                          <span>❤️ {t.likes}</span>
                          {t.reports > 0 && <span className="text-danger">🚩 {t.reports}</span>}
                          <span>💬 {t.comments_count ?? 0}</span>
                        </div>
                      </td>
                      <td>
                        {t.is_hidden ? (
                          <span className="status-badge badge-hidden">Hidden</span>
                        ) : (
                          <span className="status-badge badge-active">Active</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-xs btn-edit"
                            onClick={() => handleOpenEdit(t)}
                            title="Edit thought content & category"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleToggleHideThought(t.id, t.is_hidden)}
                            title={t.is_hidden ? 'Restore thought' : 'Hide from feed'}
                          >
                            {t.is_hidden ? '👁️ Restore' : '🙈 Hide'}
                          </button>
                          {t.reports > 0 && (
                            <button
                              type="button"
                              className="btn btn-outline btn-xs btn-clear-reports"
                              onClick={() => handleClearReports(t.id)}
                              title="Clear report flags"
                            >
                              🛡️ Clear
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleDeleteThought(t.id)}
                            title="Permanently delete thought"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: POLLS MANAGER */}
      {activeTab === 'polls' && (
        <div className="admin-section polls-section">
          <div className="admin-section-header">
            <div>
              <h3>Community Polls Management</h3>
              <p>Create official polls, monitor voting turnouts, close or delete polls.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreatePollModal(true)}
            >
              ➕ Create Official Poll
            </button>
          </div>

          <div className="admin-polls-grid">
            {polls.map((poll) => (
              <div key={poll.id} className="card admin-poll-card">
                <div className="admin-poll-card-top">
                  <div className="poll-badge-group">
                    <span className="badge-category">{poll.category}</span>
                    <span className={`poll-status-pill ${poll.is_active ? 'status-active' : 'status-ended'}`}>
                      {poll.is_active ? 'Live' : 'Closed'}
                    </span>
                  </div>
                  <div className="admin-poll-actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => handleTogglePollStatus(poll.id, poll.is_active)}
                    >
                      {poll.is_active ? '🔒 Close Poll' : '🔓 Reopen Poll'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={() => handleDeletePoll(poll.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <h4 className="admin-poll-question">#{poll.id}: {poll.question}</h4>
                {poll.description && <p className="admin-poll-desc">{poll.description}</p>}

                <div className="admin-poll-options">
                  {poll.options.map((opt) => (
                    <div key={opt.id} className="admin-poll-opt-row">
                      <div className="admin-opt-info">
                        <span className="admin-opt-text">{opt.text}</span>
                        <span className="admin-opt-count">{opt.votes_count} votes ({opt.percentage}%)</span>
                      </div>
                      <div className="admin-opt-track">
                        <div className="admin-opt-fill" style={{ width: `${opt.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-poll-meta">
                  <span>Total Votes: <strong>{poll.total_votes}</strong></span>
                  <span>Author: {poll.author_name || 'Anonymous'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: REPORTS MANAGER */}
      {activeTab === 'reports' && (
        <div className="admin-section reports-section">
          <div className="admin-section-header">
            <div>
              <h3>Community Moderation Reports</h3>
              <p>Inspect flagged content submitted by students and campus members.</p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛡️</div>
              <h3>No pending reports!</h3>
              <p>The campus community is safe and peaceful.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Target Thought</th>
                    <th>Report Reason</th>
                    <th>Category</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="td-id">#{r.id}</td>
                      <td>
                        <strong>Thought #{r.thought_id}</strong>
                        <p className="table-content-text">{r.thought_content}</p>
                      </td>
                      <td>
                        <span className="report-reason-pill">{r.reason || 'Unspecified concern'}</span>
                      </td>
                      <td>
                        <span className="badge-category">{r.thought_category}</span>
                      </td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleDismissReport(r.id)}
                            title="Dismiss report"
                          >
                            ✓ Dismiss
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => handleToggleHideThought(r.thought_id, false)}
                            title="Hide flagged thought"
                          >
                            🙈 Hide Post
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleDeleteThought(r.thought_id)}
                            title="Permanently delete flagged thought"
                          >
                            🗑️ Delete Post
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: USERS MANAGER */}
      {activeTab === 'users' && (
        <div className="admin-section users-section">
          <div className="admin-section-header">
            <div>
              <h3>Registered Campus Members</h3>
              <p>Manage accounts, assign administrator roles, and maintain safety.</p>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="td-id">#{u.id}</td>
                    <td>
                      <div className="user-table-cell">
                        <span className="user-table-avatar">👤</span>
                        <div>
                          <strong>@{u.username}</strong>
                          {u.full_name && <p className="user-full-name">{u.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-pill ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                        {u.role === 'admin' ? '👑 Admin' : 'Member'}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="status-badge badge-active">Active</span>
                      ) : (
                        <span className="status-badge badge-hidden">Suspended</span>
                      )}
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleToggleUserRole(u)}
                          title="Toggle user role"
                        >
                          {u.role === 'admin' ? 'Demote' : 'Promote to Admin 👑'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => handleToggleUserStatus(u)}
                          title="Toggle account active status"
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          onClick={() => handleDeleteUser(u)}
                          title="Delete user"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT THOUGHT */}
      {editingThought && (
        <div className="modal-overlay" onClick={() => setEditingThought(null)}>
          <div className="modal-card admin-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Thought #{editingThought.id}</h3>
              <button className="modal-close-btn" onClick={() => setEditingThought(null)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thought Content</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={editIsHidden}
                    onChange={(e) => setEditIsHidden(e.target.checked)}
                  />
                  <span>Hide from Public Feed</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingThought(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSaving}
                >
                  {editSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE POLL */}
      {showCreatePollModal && (
        <div className="modal-overlay" onClick={() => setShowCreatePollModal(false)}>
          <div className="modal-card admin-create-poll-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Launch Official Campus Poll</h3>
              <button className="modal-close-btn" onClick={() => setShowCreatePollModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label className="form-label">Poll Question *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Should library hours be extended 24/7 during finals?"
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  required
                  minLength={5}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newPollCategory}
                  onChange={(e) => setNewPollCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Poll Options (2 to 6 choices)</label>
                {newPollOptions.map((opt, idx) => (
                  <div key={idx} className="poll-option-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newPollOptions];
                        copy[idx] = e.target.value;
                        setNewPollOptions(copy);
                      }}
                      required
                    />
                    {newPollOptions.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setNewPollOptions(newPollOptions.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {newPollOptions.length < 6 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm add-option-btn"
                    onClick={() => setNewPollOptions([...newPollOptions, ''])}
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreatePollModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPollSaving}
                >
                  {createPollSaving ? 'Creating Poll...' : 'Launch Poll 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
