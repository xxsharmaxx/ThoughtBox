interface HeaderProps {
  currentView: 'feed' | 'mod';
  onNavigate: (view: 'feed' | 'mod') => void;
}

export default function Header({ currentView, onNavigate }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={() => onNavigate('feed')} role="button" tabIndex={0}>
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="4" width="24" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M8 10h12M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="22" cy="6" r="4" fill="var(--accent)" />
            </svg>
          </div>
          <h1 className="logo-text">ThoughtBox</h1>
        </div>

        <nav className="nav" id="main-nav">
          <button
            className={`nav-link ${currentView === 'feed' ? 'active' : ''}`}
            onClick={() => onNavigate('feed')}
            id="nav-feed"
          >
            Feed
          </button>
          <button
            className={`nav-link ${currentView === 'mod' ? 'active' : ''}`}
            onClick={() => onNavigate('mod')}
            id="nav-mod"
          >
            Moderate
          </button>
        </nav>
      </div>
    </header>
  );
}
