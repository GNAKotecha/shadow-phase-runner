import React from 'react';

interface MenuScreenProps {
  onPlay: () => void;
  onLeaderboard: () => void;
  onPreview: () => void;
  onSettings: () => void;
  username: string | null;
  onChangeName: () => void;
  theme: { bg: string; accent: string };
}

export default function MenuScreen({ 
  onPlay, 
  onLeaderboard, 
  onPreview, 
  onSettings, 
  username, 
  onChangeName,
  theme 
}: MenuScreenProps) {
  const menuScreenStyle: React.CSSProperties = {
    position: 'fixed',
    inset: '0',
    background: 'linear-gradient(135deg, #0b0f14 0%, #1a1a2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'auto',
    padding: '20px',
    boxSizing: 'border-box'
  };

  const menuContainerStyle: React.CSSProperties = {
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 'clamp(24px, 6vw, 32px)',
    margin: '0 0 8px 0',
    background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '32px'
  };

  const userInfoStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px'
  };

  const changeNameBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  };

  const menuButtonsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px'
  };

  const baseBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };

  const playBtnStyle: React.CSSProperties = {
    ...baseBtnStyle,
    fontSize: '18px',
    padding: '20px 24px',
    borderWidth: '3px',
    background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent})`,
    borderColor: theme.bg
  };

  const instructionsStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '13px',
    lineHeight: 1.4
  };

  const instructionItemStyle: React.CSSProperties = {
    margin: '8px 0',
    textAlign: 'left'
  };

  return (
    <div style={menuScreenStyle}>
      <div style={menuContainerStyle}>
        {/* Title */}
        <div>
          <h1 style={titleStyle}>Shadow Phase Runner</h1>
          <div style={subtitleStyle}>Master the phases to survive</div>
        </div>

        {/* User Info */}
        {username && (
          <div style={userInfoStyle}>
            <span>Playing as: {username}</span>
            <button 
              style={changeNameBtnStyle}
              onClick={onChangeName}
            >
              Change Name
            </button>
          </div>
        )}

        {/* Main Menu Buttons */}
        <div style={menuButtonsStyle}>
          <button 
            style={playBtnStyle}
            onClick={onPlay}
          >
            <span style={{ fontSize: '20px' }}>▶</span>
            <span>Play</span>
          </button>

          <button 
            style={baseBtnStyle}
            onClick={onLeaderboard}
          >
            <span style={{ fontSize: '20px' }}>🏆</span>
            <span>Leaderboard</span>
          </button>

          <button 
            style={baseBtnStyle}
            onClick={onPreview}
          >
            <span style={{ fontSize: '20px' }}>👁</span>
            <span>Preview Obstacles</span>
          </button>

          <button 
            style={baseBtnStyle}
            onClick={onSettings}
          >
            <span style={{ fontSize: '20px' }}>⚙</span>
            <span>Settings</span>
          </button>
        </div>

        {/* Instructions */}
        <div style={instructionsStyle}>
          <div style={instructionItemStyle}>
            <strong style={{ color: theme.accent }}>Move:</strong> Drag, arrow keys, or tilt device
          </div>
          <div style={instructionItemStyle}>
            <strong style={{ color: theme.accent }}>Phase Switch:</strong> Tap, spacebar, or enter
          </div>
          <div style={instructionItemStyle}>
            <strong style={{ color: theme.accent }}>Goal:</strong> Collect orbs, avoid wrong-phase obstacles
          </div>
          <div style={instructionItemStyle}>
            <strong style={{ color: theme.accent }}>Navigation:</strong> Escape to return to menu
          </div>
        </div>
      </div>
    </div>
  );
}
