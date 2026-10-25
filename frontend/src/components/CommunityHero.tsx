import { useState } from 'react';
import { CATEGORIES, type Thought } from '../api';

interface CommunityHeroProps {
  thoughts: Thought[];
  onPromptSelect: (promptText: string, category: string) => void;
  onOpenCreate: () => void;
}

const INSPIRATION_PROMPTS = [
  { text: "What's an unspoken rule of your campus library that everyone should know?", category: "Campus Life" },
  { text: "Shout out a professor or TA who went above and beyond this semester!", category: "Appreciation" },
  { text: "What is one small improvement to the campus cafeteria you'd love to see?", category: "Suggestions" },
  { text: "What study technique finally made that impossible course click for you?", category: "Academics" },
  { text: "Share the most wholesome thing you witnessed walking between classes today.", category: "Appreciation" },
  { text: "If you could create any club on campus tomorrow, what would it be?", category: "Suggestions" },
  { text: "What's your favorite secret quiet spot when you need to decompress?", category: "Campus Life" },
];

export default function CommunityHero({ thoughts, onPromptSelect, onOpenCreate }: CommunityHeroProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [rolling, setRolling] = useState(false);

  // Computed stats
  const totalLikes = thoughts.reduce((acc, t) => acc + (t.likes || 0), 0);
  const activeCategoriesCount = new Set(thoughts.map((t) => t.category)).size;
  const currentPrompt = INSPIRATION_PROMPTS[promptIndex];

  const rollNewPrompt = () => {
    setRolling(true);
    setTimeout(() => {
      setPromptIndex((prev) => (prev + 1) % INSPIRATION_PROMPTS.length);
      setRolling(false);
    }, 250);
  };

  const handleUsePrompt = () => {
    onPromptSelect(currentPrompt.text, currentPrompt.category);
  };

  return (
    <div className="community-hero" id="community-hero">
      <div className="hero-glow-blob hero-blob-1" aria-hidden="true" />
      <div className="hero-glow-blob hero-blob-2" aria-hidden="true" />

      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-pulse-dot" />
          <span>Campus Voice & Feedback Hub</span>
        </div>

        <h1 className="hero-headline">
          Speak Your Mind. <br />
          <span className="hero-gradient-text">100% Anonymously.</span>
        </h1>

        <p className="hero-description">
          A judgment-free space to share campus feedback, academic tips, honest suggestions,
          and heartfelt appreciation with your fellow students.
        </p>

        {/* Live Interactive Stats Grid */}
        <div className="hero-stats-grid" id="community-stats">
          <div className="hero-stat-card">
            <span className="stat-icon">💭</span>
            <div className="stat-details">
              <span className="stat-number">{thoughts.length}</span>
              <span className="stat-label">Thoughts Shared</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <span className="stat-icon">❤️</span>
            <div className="stat-details">
              <span className="stat-number">{totalLikes}</span>
              <span className="stat-label">Campus Likes</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <span className="stat-icon">🏷️</span>
            <div className="stat-details">
              <span className="stat-number">{activeCategoriesCount || CATEGORIES.length}</span>
              <span className="stat-label">Active Topics</span>
            </div>
          </div>

          <div className="hero-stat-card stat-badge-card">
            <span className="stat-icon">🛡️</span>
            <div className="stat-details">
              <span className="stat-number">Zero Logs</span>
              <span className="stat-label">Identity Protected</span>
            </div>
          </div>
        </div>

        {/* Inspiration Prompt Interactive Widget */}
        <div className="inspiration-banner" id="inspiration-banner">
          <div className="inspiration-header">
            <div className="inspiration-title">
              <span className="spark-icon">✨</span>
              <span>Need inspiration? Try this prompt:</span>
            </div>
            <button
              className={`roll-btn ${rolling ? 'rolling' : ''}`}
              onClick={rollNewPrompt}
              title="Roll another prompt"
              id="roll-prompt-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>Shuffle</span>
            </button>
          </div>

          <div className="inspiration-quote">
            <p>"{currentPrompt.text}"</p>
            <div className="inspiration-actions">
              <span className="inspiration-tag">{currentPrompt.category}</span>
              <button
                className="btn btn-sm btn-accent"
                onClick={handleUsePrompt}
                id="use-prompt-btn"
              >
                Use this prompt →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
