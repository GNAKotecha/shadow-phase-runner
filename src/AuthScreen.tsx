import React, { useState } from 'react';
import { 
  signInWithGoogle, 
  signInWithApple, 
  signInWithEmail, 
  signUpWithEmail, 
  resetPassword,
  AuthResult 
} from './firebase.js';

interface AuthScreenProps {
  onAuthSuccess: (result: AuthResult) => void;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export default function AuthScreen({ onAuthSuccess, onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');
    
    try {
      let result: AuthResult;
      if (provider === 'google') {
        result = await signInWithGoogle();
      } else {
        result = await signInWithApple();
      }
      
      console.log(`${provider} auth success:`, result.user.uid);
      onAuthSuccess(result);
    } catch (err: any) {
      console.error(`${provider} auth error:`, err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups and try again.');
      } else {
        setError(err.message || `Failed to sign in with ${provider}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result: AuthResult;
      if (mode === 'signup') {
        if (!displayName) {
          setError('Please enter your name');
          return;
        }
        result = await signUpWithEmail(email, password, displayName);
      } else {
        result = await signInWithEmail(email, password);
      }
      
      console.log('Email auth success:', result.user.uid);
      onAuthSuccess(result);
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError(err.message || 'Failed to send reset email');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose} disabled={loading}>
          ×
        </button>
        
        <div className="auth-content">
          <h2 className="auth-title">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>

          {mode === 'reset' && resetSent ? (
            <div className="auth-success">
              <p>Password reset email sent! Check your inbox.</p>
              <button 
                className="auth-link" 
                onClick={() => { setMode('signin'); setResetSent(false); }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Social Auth Buttons */}
              {mode !== 'reset' && (
                <div className="auth-social">
                  <button 
                    className="auth-button auth-google"
                    onClick={() => handleSocialAuth('google')}
                    disabled={loading}
                  >
                    <span className="auth-icon">🔍</span>
                    Continue with Google
                  </button>
                  
                  <button 
                    className="auth-button auth-apple"
                    onClick={() => handleSocialAuth('apple')}
                    disabled={loading}
                  >
                    <span className="auth-icon">🍎</span>
                    Continue with Apple
                  </button>
                  
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                </div>
              )}

              {/* Email Form */}
              <form className="auth-form" onSubmit={mode === 'reset' ? handlePasswordReset : handleEmailAuth}>
                {mode === 'signup' && (
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="auth-input"
                    disabled={loading}
                    required
                  />
                )}
                
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  disabled={loading}
                  required
                />
                
                {mode !== 'reset' && (
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    disabled={loading}
                    required
                  />
                )}

                {error && <div className="auth-error">{error}</div>}

                <button 
                  type="submit" 
                  className="auth-button auth-primary"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : (
                    mode === 'signin' ? 'Sign In' :
                    mode === 'signup' ? 'Create Account' :
                    'Send Reset Email'
                  )}
                </button>
              </form>

              {/* Mode Switching */}
              <div className="auth-links">
                {mode === 'signin' && (
                  <>
                    <button 
                      className="auth-link" 
                      onClick={() => setMode('signup')}
                      disabled={loading}
                    >
                      Don't have an account? Sign up
                    </button>
                    <button 
                      className="auth-link" 
                      onClick={() => setMode('reset')}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </>
                )}
                
                {mode === 'signup' && (
                  <button 
                    className="auth-link" 
                    onClick={() => setMode('signin')}
                    disabled={loading}
                  >
                    Already have an account? Sign in
                  </button>
                )}
                
                {mode === 'reset' && (
                  <button 
                    className="auth-link" 
                    onClick={() => setMode('signin')}
                    disabled={loading}
                  >
                    Back to Sign In
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
