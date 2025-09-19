import React, { useState, useEffect } from 'react';
import { 
  signOutUser, 
  getUserProfile, 
  updateUserProfile, 
  auth,
  AuthResult 
} from './firebase.js';
import { User } from 'firebase/auth';

interface UserProfileProps {
  user: User;
  onSignOut: () => void;
  onShowAuth: () => void;
}

export default function UserProfile({ user, onSignOut, onShowAuth }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      setDisplayName(userProfile?.displayName || user.displayName || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onSignOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await updateUserProfile({
        displayName: displayName.trim()
      });

      if (success) {
        setEditing(false);
        await loadProfile(); // Reload profile
      } else {
        setError('Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (providerId: string): string => {
    switch (providerId) {
      case 'google.com': return 'Google';
      case 'apple.com': return 'Apple';
      case 'password': return 'Email';
      case 'anonymous': return 'Guest';
      default: return 'Unknown';
    }
  };

  const isAnonymous = user.isAnonymous;
  const provider = user.providerData[0]?.providerId || 'anonymous';

  if (isAnonymous) {
    return (
      <div className="user-profile">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <div className="user-name">Guest Player</div>
            <div className="user-provider">Playing as guest</div>
          </div>
        </div>
        
        <div className="user-actions">
          <button 
            className="profile-button profile-primary"
            onClick={onShowAuth}
          >
            Sign In to Save Progress
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" />
          ) : (
            <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
          )}
        </div>
        
        <div className="user-details">
          {editing ? (
            <form onSubmit={handleUpdateProfile} className="edit-form">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="edit-input"
                placeholder="Your name"
                disabled={loading}
                required
              />
              {error && <div className="profile-error">{error}</div>}
              <div className="edit-actions">
                <button 
                  type="submit" 
                  className="edit-button save"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="edit-button cancel"
                  onClick={() => {
                    setEditing(false);
                    setError('');
                    setDisplayName(profile?.displayName || user.displayName || '');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="user-name">
                {profile?.displayName || user.displayName || user.email}
                <button 
                  className="edit-icon"
                  onClick={() => setEditing(true)}
                  title="Edit name"
                >
                  ✏️
                </button>
              </div>
              <div className="user-provider">
                Signed in with {getProviderName(provider)}
              </div>
              {profile && (
                <div className="user-stats">
                  <span>Best Score: {profile.bestScore || 0}</span>
                  {profile.gamesPlayed && (
                    <span> • Games: {profile.gamesPlayed}</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="user-actions">
        <button 
          className="profile-button profile-secondary"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
