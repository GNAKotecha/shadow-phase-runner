import React, { useState, useEffect } from 'react';

interface SettingsScreenProps {
  onBack: () => void;
  theme: { bg: string; accent: string };
}

export default function SettingsScreen({ onBack, theme }: SettingsScreenProps) {
  const [controlMode, setControlMode] = useState<'drag' | 'tilt'>('drag');
  const [showDebug, setShowDebug] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const savedControlMode = localStorage.getItem('spr_control_mode') as 'drag' | 'tilt' | null;
    const savedShowDebug = localStorage.getItem('spr_show_debug') === 'true';
    const savedSoundEnabled = localStorage.getItem('spr_sound_enabled') !== 'false';
    const savedVibrationEnabled = localStorage.getItem('spr_vibration_enabled') !== 'false';

    if (savedControlMode) setControlMode(savedControlMode);
    setShowDebug(savedShowDebug);
    setSoundEnabled(savedSoundEnabled);
    setVibrationEnabled(savedVibrationEnabled);
  }, []);

  // Save settings to localStorage
  const updateSetting = (key: string, value: string | boolean) => {
    localStorage.setItem(key, value.toString());
  };

  const handleControlModeChange = (mode: 'drag' | 'tilt') => {
    setControlMode(mode);
    updateSetting('spr_control_mode', mode);
  };

  const handleDebugToggle = () => {
    const newValue = !showDebug;
    setShowDebug(newValue);
    updateSetting('spr_show_debug', newValue);
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    updateSetting('spr_sound_enabled', newValue);
  };

  const handleVibrationToggle = () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    updateSetting('spr_vibration_enabled', newValue);
  };

  const requestDeviceOrientationPermission = async () => {
    if(typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if(permission === 'granted') {
          alert('Device orientation permission granted! You can now use tilt controls.');
        } else {
          alert('Device orientation permission denied.');
        }
      } catch(e) {
        alert('Error requesting device orientation permission.');
      }
    } else {
      alert('Device orientation permission not required on this device.');
    }
  };

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

  const sectionStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: theme.accent
  };

  const settingRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  };

  const settingLabelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '14px',
    lineHeight: 1.4
  };

  const settingDescStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#aaa',
    marginTop: '4px'
  };

  const toggleBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    minWidth: '60px'
  };

  const activeToggleStyle: React.CSSProperties = {
    ...toggleBtnStyle,
    background: theme.accent,
    borderColor: theme.accent,
    color: '#000'
  };

  const controlBtnStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '0 4px',
    minWidth: '80px'
  };

  const activeControlStyle: React.CSSProperties = {
    ...controlBtnStyle,
    background: theme.bg,
    borderColor: theme.bg,
    color: '#fff'
  };

  return (
    <div style={screenStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <button style={backBtnStyle} onClick={onBack}>
            ← Back
          </button>
          <h1 style={titleStyle}>Settings</h1>
        </div>

        {/* Controls Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Controls</div>
          
          <div style={settingRowStyle}>
            <div style={settingLabelStyle}>
              <div>Control Mode</div>
              <div style={settingDescStyle}>
                Choose how to move your character
              </div>
            </div>
            <div>
              <button 
                style={controlMode === 'drag' ? activeControlStyle : controlBtnStyle}
                onClick={() => handleControlModeChange('drag')}
              >
                Touch/Drag
              </button>
              <button 
                style={controlMode === 'tilt' ? activeControlStyle : controlBtnStyle}
                onClick={() => handleControlModeChange('tilt')}
              >
                Tilt Device
              </button>
            </div>
          </div>

          <div style={settingRowStyle}>
            <div style={settingLabelStyle}>
              <div>Phase Switch</div>
              <div style={settingDescStyle}>
                Tap anywhere on screen or press space
              </div>
            </div>
            <div style={{ color: '#aaa', fontSize: '12px' }}>
              Always Available
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Feedback</div>
          
          <div style={settingRowStyle}>
            <div style={settingLabelStyle}>
              <div>Sound Effects</div>
              <div style={settingDescStyle}>
                Audio feedback for actions and collisions
              </div>
            </div>
            <button 
              style={soundEnabled ? activeToggleStyle : toggleBtnStyle}
              onClick={handleSoundToggle}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div style={{ ...settingRowStyle, borderBottom: 'none' }}>
            <div style={settingLabelStyle}>
              <div>Vibration</div>
              <div style={settingDescStyle}>
                Haptic feedback on mobile devices
              </div>
            </div>
            <button 
              style={vibrationEnabled ? activeToggleStyle : toggleBtnStyle}
              onClick={handleVibrationToggle}
            >
              {vibrationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Device Orientation Permission for iOS */}
          {typeof (DeviceOrientationEvent as any).requestPermission === 'function' && (
            <div style={settingRowStyle}>
              <div style={settingLabelStyle}>
                <div>Tilt Controls Permission</div>
                <div style={settingDescStyle}>
                  iOS requires permission for device orientation
                </div>
              </div>
              <button 
                style={toggleBtnStyle}
                onClick={requestDeviceOrientationPermission}
              >
                Request
              </button>
            </div>
          )}
        </div>

        {/* Debug Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Developer</div>
          
          <div style={settingRowStyle}>
            <div style={settingLabelStyle}>
              <div>Debug Mode</div>
              <div style={settingDescStyle}>
                Show debug information overlay
              </div>
            </div>
            <button 
              style={showDebug ? activeToggleStyle : toggleBtnStyle}
              onClick={handleDebugToggle}
            >
              {showDebug ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#888' }}>
          <div>Shadow Phase Runner</div>
          <div style={{ marginTop: '4px' }}>Settings are saved locally on your device</div>
        </div>
      </div>
    </div>
  );
}
