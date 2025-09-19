import React from 'react';
import type { LeaderboardEntry } from './firebase.js';

interface LeaderboardScreenProps {
  onBack: () => void;
  leaderboard: LeaderboardEntry[];
  selfRank: { rank: number; bestScore: number } | null;
  username: string | null;
  theme: { bg: string; accent: string };
}

export default function LeaderboardScreen({ 
  onBack, 
  leaderboard, 
  selfRank, 
  username,
  theme 
}: LeaderboardScreenProps) {
  const screenStyle: React.CSSProperties = {
    position: 'fixed',
    inset: '0',
    background: 'linear-gradient(135deg, #0b0f14 0%, #1a1a2e 100%)',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'auto',
    padding: '20px',
    boxSizing: 'border-box'
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '500px',
    margin: '0 auto'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px'
  };

  const backBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
    background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const selfRankStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${theme.bg}20, ${theme.accent}20)`,
    border: `1px solid ${theme.accent}40`,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'center'
  };

  const leaderboardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden'
  };

  const entryStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  };

  const rankStyle: React.CSSProperties = {
    width: '40px',
    fontWeight: 600,
    fontSize: '16px'
  };

  const usernameStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '14px'
  };

  const scoreStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '16px',
    color: theme.accent
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#ffd700'; // Gold
    if (rank === 2) return '#c0c0c0'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#fff';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <div style={screenStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button style={backBtnStyle} onClick={onBack}>
            ← Back
          </button>
          <h1 style={titleStyle}>Leaderboard</h1>
        </div>

        {/* Self Rank Display */}
        {selfRank && username && (
          <div style={selfRankStyle}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
              Your Rank
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              #{selfRank.rank} • {selfRank.bestScore} points • {username}
            </div>
          </div>
        )}

        {/* Leaderboard List */}
        <div style={leaderboardStyle}>
          {leaderboard.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
              No scores yet. Be the first to play!
            </div>
          ) : (
            leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.username === username;
              
              return (
                <div 
                  key={entry.username}
                  style={{
                    ...entryStyle,
                    background: isCurrentUser ? `${theme.accent}10` : 'transparent',
                    borderLeft: isCurrentUser ? `3px solid ${theme.accent}` : 'none'
                  }}
                >
                  <div style={{ ...rankStyle, color: getRankColor(rank) }}>
                    {getRankEmoji(rank)} #{rank}
                  </div>
                  <div style={usernameStyle}>
                    {entry.username}
                    {isCurrentUser && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '12px', 
                        color: theme.accent,
                        fontWeight: 600
                      }}>
                        (You)
                      </span>
                    )}
                  </div>
                  <div style={scoreStyle}>
                    {entry.bestScore}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '20px', 
          fontSize: '12px', 
          color: '#888' 
        }}>
          Leaderboard updates in real-time
        </div>
      </div>
    </div>
  );
}
