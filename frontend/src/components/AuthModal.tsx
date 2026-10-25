import { useState } from 'react';
import { registerUser, loginUser, type User } from '../api';
import { useToast } from './Toast';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AVATARS = [
  { id: 'avatar-scholar', label: '🎓 Scholar' },
  { id: 'avatar-coder', label: '💻 Techie' },
  { id: 'avatar-artist', label: '🎨 Creative' },
  { id: 'avatar-rocket', label: '🚀 Innovator' },
  { id: 'avatar-book', label: '📚 Thinker' },
  { id: 'avatar-star', label: '⚡ Leader' },
];

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>('user');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRollingAvatar, setIsRollingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Dice roll random avatar function
  const handleRollAvatar = () => {
    setIsRollingAvatar(true);
    const otherAvatars = AVATARS.filter((a) => a.id !== selectedAvatar);
    const randomPick = otherAvatars[Math.floor(Math.random() * otherAvatars.length)] || AVATARS[0];
    setTimeout(() => {
      setSelectedAvatar(randomPick.id);
      setIsRollingAvatar(false);
      showToast(`Rolled avatar: ${randomPick.label}! 🎲`, 'info');
    }, 200);
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: '', color: '#94a3b8' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, text: 'Weak', color: '#ef4444' };
    if (score === 2) return { score: 2, text: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score: 3, text: 'Good', color: '#3b82f6' };
    return { score: 4, text: 'Strong', color: '#10b981' };
  };

  const pwdStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-check.');
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser({
          username_or_email: username,
          password: password,
        });
        showToast(`Welcome back, ${res.user.full_name || res.user.username}! ✨`, 'success');
        onSuccess(res.user);
        onClose();
      } else {
        const res = await registerUser({
          username,
          email,
          password,
          full_name: fullName || undefined,
          roll_number: rollNumber || undefined,
          avatar: selectedAvatar,
          role: selectedRole,
        });
        showToast(
          `Account created as ${selectedRole === 'admin' ? 'Administrator 👑' : 'Campus Member 🎓'}! Welcome @${res.user.username} 🎉`,
          'success'
        );
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdminDemo = () => {
    setMode('login');
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
  };

  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Vibrant Colored Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-badge">
            <span className="auth-brand-icon">✨</span>
            <div className="auth-header-text">
              <h2 className="auth-brand-title">
                {mode === 'login' ? 'Sign In to ThoughtBox' : 'Create Campus Account'}
              </h2>
              <p className="auth-brand-subtitle">
                {mode === 'login'
                  ? 'Access campus feeds, vote on polls & join discussions'
                  : 'Join your campus peers with customizable role, roll number and avatar'}
              </p>
            </div>
          </div>
          <button className="auth-modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Inner Body with Solid High-Contrast Background */}
        <div className="auth-modal-body">
          {/* Mode Switcher Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
            >
              Create Account
            </button>
          </div>

          {/* Demo Helper Pill */}
          <div className="demo-credentials-banner">
            <div className="demo-text">
              <span>💡 <strong>Quick Demo Admin:</strong> username: <code>admin</code> | pass: <code>admin123</code></span>
            </div>
            <button
              type="button"
              className="demo-fill-btn"
              onClick={handleFillAdminDemo}
              title="Auto-fill admin credentials"
            >
              Fill Admin
            </button>
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <>
                {/* ROLE SELECTION FUNCTION */}
                <div className="auth-field-card">
                  <div className="auth-field-header">
                    <label className="auth-field-label">
                      <span className="auth-label-title">Select Campus Role</span>
                      <span className="req">*</span>
                    </label>
                    <span className="auth-field-tag">Role Function</span>
                  </div>
                  <div className="role-selector-grid">
                    <button
                      type="button"
                      className={`role-option-btn ${selectedRole === 'user' ? 'selected' : ''}`}
                      onClick={() => setSelectedRole('user')}
                    >
                      <span className="role-icon">🎓</span>
                      <div className="role-info">
                        <strong>Student / Member</strong>
                        <p>Share thoughts, vote in polls & discuss</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`role-option-btn ${selectedRole === 'admin' ? 'selected' : ''}`}
                      onClick={() => setSelectedRole('admin')}
                    >
                      <span className="role-icon">👑</span>
                      <div className="role-info">
                        <strong>Administrator</strong>
                        <p>Full control: edit, delete, polls & users</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* CAMPUS ROLL NUMBER / STUDENT ID (ROLL FUNCTION) */}
                <div className="auth-field-card">
                  <div className="auth-field-header">
                    <label className="auth-field-label" htmlFor="auth-roll-no">
                      <span className="auth-label-title">Campus Roll No. / Student ID</span>
                      <span className="optional-tag">optional</span>
                    </label>
                    <span className="auth-field-tag">Roll Function</span>
                  </div>
                  <div className="auth-styled-input-box">
                    <div className="auth-input-icon-pill icon-roll" title="Roll Number">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <line x1="6" y1="8" x2="10" y2="8" />
                        <line x1="6" y1="12" x2="14" y2="12" />
                        <line x1="6" y1="16" x2="11" y2="16" />
                      </svg>
                    </div>
                    <input
                      id="auth-roll-no"
                      type="text"
                      className="auth-styled-input"
                      placeholder="e.g. 2024CS101 or STU-8821"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* FULL NAME (OPTIONAL) */}
                <div className="auth-field-card">
                  <div className="auth-field-header">
                    <label className="auth-field-label" htmlFor="auth-full-name">
                      <span className="auth-label-title">Full Name</span>
                      <span className="optional-tag">optional</span>
                    </label>
                  </div>
                  <div className="auth-styled-input-box">
                    <div className="auth-input-icon-pill icon-name" title="Full Name">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <input
                      id="auth-full-name"
                      type="text"
                      className="auth-styled-input"
                      placeholder="e.g. Alex Rivera"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* AVATAR SELECTOR WITH ROLL/RANDOMIZE FUNCTION */}
                <div className="auth-field-card">
                  <div className="auth-field-header">
                    <label className="auth-field-label">
                      <span className="auth-label-title">Select Avatar</span>
                    </label>
                    <button
                      type="button"
                      className={`roll-avatar-btn ${isRollingAvatar ? 'rolling' : ''}`}
                      onClick={handleRollAvatar}
                      title="Roll for a random avatar!"
                    >
                      <span>🎲 Roll Avatar</span>
                    </button>
                  </div>
                  <div className="avatar-selector-grid">
                    {AVATARS.map((av) => (
                      <button
                        type="button"
                        key={av.id}
                        className={`avatar-option-btn ${selectedAvatar === av.id ? 'selected' : ''}`}
                        onClick={() => setSelectedAvatar(av.id)}
                      >
                        <span className="avatar-opt-emoji">{av.label.split(' ')[0]}</span>
                        <span className="avatar-opt-name">{av.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* EMAIL */}
                <div className="auth-field-card">
                  <div className="auth-field-header">
                    <label className="auth-field-label" htmlFor="auth-email">
                      <span className="auth-label-title">Campus Email</span>
                      <span className="req">*</span>
                    </label>
                    <span className="auth-field-tag">Required</span>
                  </div>
                  <div className="auth-styled-input-box">
                    <div className="auth-input-icon-pill icon-email" title="Campus Email">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <input
                      id="auth-email"
                      type="email"
                      className="auth-styled-input"
                      placeholder="your.name@campus.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              </>
            )}

            {/* USERNAME FIELD (BOTH SIGN IN & CREATE ACCOUNT) */}
            <div className="auth-field-card">
              <div className="auth-field-header">
                <label className="auth-field-label" htmlFor="auth-username">
                  <span className="auth-label-title">
                    {mode === 'login' ? 'Username or Email' : 'Username'}
                  </span>
                  <span className="req">*</span>
                </label>
                <span className="auth-field-tag">
                  {mode === 'login' ? 'Campus Account' : 'Unique Handle'}
                </span>
              </div>
              <div className="auth-styled-input-box">
                <div className="auth-input-icon-pill icon-user" title="Username">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="auth-username"
                  type="text"
                  className="auth-styled-input"
                  placeholder={mode === 'login' ? 'Enter your username or email' : 'Choose unique username (e.g. alex24)'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* PASSWORD FIELD WITH HIGH-VISIBILITY SHOW/HIDE TOGGLE */}
            <div className="auth-field-card">
              <div className="auth-field-header">
                <label className="auth-field-label" htmlFor="auth-password">
                  <span className="auth-label-title">Password</span>
                  <span className="req">*</span>
                </label>
                <button
                  type="button"
                  className="auth-pwd-quick-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="pwd-toggle-icon">{showPassword ? '🙈' : '👁️'}</span>
                  <span className="pwd-toggle-label">{showPassword ? 'Hide Password' : 'Show Password'}</span>
                </button>
              </div>
              <div className="auth-styled-input-box">
                <div className="auth-input-icon-pill icon-lock" title="Password">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-styled-input auth-password-input ${showPassword ? 'is-revealed' : ''}`}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create strong password (min 6 chars)'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className={`auth-pwd-inline-btn ${showPassword ? 'revealed' : ''}`}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Click to hide password' : 'Click to show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="pwd-inline-emoji">{showPassword ? '🙈' : '👁️'}</span>
                  <span className="pwd-inline-text">{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              {/* Password strength meter for registration */}
              {mode === 'register' && password && (
                <div className="pwd-strength-container">
                  <div className="pwd-strength-track">
                    <div
                      className="pwd-strength-bar"
                      style={{
                        width: `${(pwdStrength.score / 4) * 100}%`,
                        backgroundColor: pwdStrength.color,
                      }}
                    />
                  </div>
                  <div className="pwd-strength-meta">
                    <span className="pwd-strength-label" style={{ color: pwdStrength.color }}>
                      Strength: <strong>{pwdStrength.text}</strong>
                    </span>
                    <span className="pwd-strength-hint">Min 6 characters (mix letters & numbers)</span>
                  </div>
                </div>
              )}

              {/* Plain text reveal banner */}
              {showPassword && password && (
                <div className="pwd-visible-badge">
                  <span>👁️ Password is currently visible as plain text</span>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD (CREATE ACCOUNT) */}
            {mode === 'register' && (
              <div className="auth-field-card">
                <div className="auth-field-header">
                  <label className="auth-field-label" htmlFor="auth-confirm-password">
                    <span className="auth-label-title">Confirm Password</span>
                    <span className="req">*</span>
                  </label>
                  <button
                    type="button"
                    className="auth-pwd-quick-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <span className="pwd-toggle-icon">{showConfirmPassword ? '🙈' : '👁️'}</span>
                    <span className="pwd-toggle-label">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="auth-styled-input-box">
                  <div className="auth-input-icon-pill icon-key" title="Confirm Password">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5-2 2L12 6l-2 2 1.5 1.5L10 11l-1.5-1.5L7 11" />
                      <circle cx="7.5" cy="15.5" r="5.5" />
                    </svg>
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`auth-styled-input auth-password-input ${showConfirmPassword ? 'is-revealed' : ''}`}
                    placeholder="Re-enter your password to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={`auth-pwd-inline-btn ${showConfirmPassword ? 'revealed' : ''}`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Click to hide password' : 'Click to show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="pwd-inline-emoji">{showConfirmPassword ? '🙈' : '👁️'}</span>
                    <span className="pwd-inline-text">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>

                {confirmPassword && (
                  <div className={`pwd-match-pill ${password === confirmPassword ? 'match-success' : 'match-mismatch'}`}>
                    <span>{password === confirmPassword ? '✓ Passwords match' : '⚠️ Passwords do not match'}</span>
                  </div>
                )}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="auth-actions">
              <button
                type="submit"
                className="btn btn-primary btn-block auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading-content">
                    <span className="spinner" />
                    <span>Processing...</span>
                  </span>
                ) : mode === 'login' ? (
                  'Sign In to ThoughtBox 🚀'
                ) : (
                  `Create ${selectedRole === 'admin' ? 'Admin' : 'Member'} Account 🎉`
                )}
              </button>
            </div>
          </form>

          {/* FOOTER TOGGLE */}
          <div className="auth-footer">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                  }}
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
