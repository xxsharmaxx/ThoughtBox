import { useState } from 'react'
import Header from './components/Header'
import ThoughtFeed from './components/ThoughtFeed'
import CreateThoughtModal from './components/CreateThoughtModal'
import ModPanel from './components/ModPanel'

type View = 'feed' | 'mod';

export default function App() {
  const [view, setView] = useState<View>('feed');
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setShowCreate(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app">
      <Header
        currentView={view}
        onNavigate={setView}
      />

      <main className="main-content">
        {view === 'feed' && (
          <>
            <ThoughtFeed key={refreshKey} />
            <button
              className="fab"
              onClick={() => setShowCreate(true)}
              title="Share a Thought"
              id="share-thought-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="fab-label">Share a Thought</span>
            </button>
          </>
        )}

        {view === 'mod' && <ModPanel />}
      </main>

      {showCreate && (
        <CreateThoughtModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
