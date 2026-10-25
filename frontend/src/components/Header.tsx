import { useState, useEffect, useRef } from 'react';
import { checkHealth, logoutUser, type User } from '../api';

export type ActiveView = 'feed' | 'polls' | 'saved' | 'admin';

interface HeaderProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  savedCount: number;
  currentUser: User | null;
  onOpenCreate: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export default function Header({
  currentView,
  onNavigate,
  savedCount,
  currentUser,
  onOpenCreate,
  onOpenAuth,
  onLogout,
}: HeaderProps) {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('thoughtbox_theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Health status
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // User dropdown menu
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('thoughtbox_theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await checkHealth();
        if (isMounted) setApiOnline(res.status === 'ok');
      } catch {
        if (isMounted) setApiOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogoutClick = () => {
    logoutUser();
    setShowUserMenu(false);
    onLogout();
  };

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand / Logo */}
        <div
          className="logo"
          onClick={() => onNavigate('feed')}
          role="button"
          tabIndex={0}
          title="Return to feed"
        >
          <div className="logo-icon-wrapper">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="4" width="24" height="20" rx="6" stroke="currentColor" strokeWidth="2.2" />
              <path d="M8 10h12M8 14h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="21" cy="7" r="3.5" fill="var(--accent)" />
            </svg>
          </div>
          <div className="logo-text-group">
            <span className="logo-text">ThoughtBox</span>
            <span className="logo-pill">Campus</span>
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="nav" id="main-nav" aria-label="Main Navigation">
          <button
            className={`nav-link ${currentView === 'feed' ? 'active' : ''}`}
            onClick={() => onNavigate('feed')}
            id="nav-feed"
          >
            <span className="nav-icon">💬</span>
            <span>Feed</span>
          </button>

          <button
            className={`nav-link ${currentView === 'polls' ? 'active' : ''}`}
            onClick={() => onNavigate('polls')}
            id="nav-polls"
          >
            <span className="nav-icon">🗳️</span>
            <span>Polls</span>
          </button>

          <button
            className={`nav-link ${currentView === 'saved' ? 'active' : ''}`}
            onClick={() => onNavigate('saved')}
            id="nav-saved"
          >
            <span className="nav-icon">🔖</span>
            <span>Saved</span>
            {savedCount > 0 && <span className="nav-badge">{savedCount}</span>}
          </button>

          <button
            className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => onNavigate('admin')}
            id="nav-admin"
          >
            <span className="nav-icon">🛡️</span>
            <span>Admin</span>
            {currentUser?.role === 'admin' && <span className="nav-role-badge">Admin</span>}
          </button>
        </nav>

        {/* Right Controls */}
        <div className="header-actions">
          {/* API Health Pill */}
          <div
            className={`health-pill ${apiOnline === true ? 'health-ok' : apiOnline === false ? 'health-down' : 'health-checking'}`}
            title={
              apiOnline === true
                ? 'Backend connected & healthy'
                : apiOnline === false
                ? 'Backend unreachable'
                : 'Checking server health...'
            }
          >
            <span className="health-dot" />
            <span className="health-label">
              {apiOnline === true ? 'Live' : apiOnline === false ? 'Offline' : 'Connecting'}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            id="theme-toggle-btn"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* User Auth Controls */}
          {currentUser ? (
            <div className="user-dropdown-container" ref={userMenuRef}>
              <button
                type="button"
                className="user-profile-chip"
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={`Signed in as @${currentUser.username}`}
              >
                <span className="user-avatar-circle">
                  {currentUser.role === 'admin' ? '👑' : '🎓'}
                </span>
                <span className="user-chip-name">@{currentUser.username}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <p className="menu-fullname">{currentUser.full_name || `@${currentUser.username}`}</p>
                    <p className="menu-email">{currentUser.email}</p>
                    <span className={`menu-role-badge ${currentUser.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {currentUser.role === 'admin' ? '👑 Administrator' : '🎓 Campus Member'}
                    </span>
                  </div>

                  <div className="user-menu-items">
                    <button
                      type="button"
                      className="user-menu-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('feed');
                      }}
                    >
                      💬 Explore Campus Feed
                    </button>
                    <button
                      type="button"
                      className="user-menu-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('polls');
                      }}
                    >
                      🗳️ Community Polls
                    </button>
                    <button
                      type="button"
                      className="user-menu-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('saved');
                      }}
                    >
                      🔖 Saved Thoughts ({savedCount})
                    </button>
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        className="user-menu-item item-highlight"
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('admin');
                        }}
                      >
                        🛡️ Admin Dashboard
                      </button>
                    )}
                  </div>

                  <div className="user-menu-footer">
                    <button
                      type="button"
                      className="user-menu-item item-logout"
                      onClick={handleLogoutClick}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button
                type="button"
                className="btn btn-ghost btn-sm login-btn"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm register-btn"
                onClick={() => onOpenAuth('register')}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Quick Post Header Button */}
          <button
            className="btn btn-primary btn-header-share"
            onClick={onOpenCreate}
            id="header-share-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Share / Poll</span>
          </button>
        </div>
      </div>
    </header>
  );
}
