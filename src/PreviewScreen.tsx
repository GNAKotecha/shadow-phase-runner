import React from 'react';
import ObstaclePreview from './ObstaclePreview.js';

interface PreviewScreenProps {
  theme: { bg: string; accent: string };
  onBack: () => void;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({ theme, onBack }) => {
  const previewWidth = 180;
  const previewHeight = 120;

  // Mock obstacle generators for preview
  const obstacleGenerators = {
    RectBand: () => ({
      bands: [{
        y: 40,
        height: 50,
        type: "SOLID" as const,
      }],
      orbs: [{
        x: 90,
        y: 20,
        r: 6,
        phaseRequired: "SOLID" as const,
        bandType: "SOLID" as const,
      }]
    }),

    Gate: () => ({
      bands: [
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 0, width: 70 },
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 110, width: 70 },
        { y: 35, height: 30, type: "SOLID" as const, x: 70, width: 40 }
      ],
      orbs: [{
        x: 90,
        y: 5,
        r: 6,
        phaseRequired: "SOLID" as const,
        bandType: "SOLID" as const,
      }]
    }),

    ZigZag: () => ({
      bands: [
        { y: 20, height: 25, type: "SOLID" as const, x: 0, width: 108 },
        { y: 60, height: 25, type: "GHOST" as const, x: 72, width: 108 }
      ],
      orbs: [
        { x: 140, y: 10, r: 6, phaseRequired: "SOLID" as const, bandType: "SOLID" as const },
        { x: 40, y: 50, r: 6, phaseRequired: "GHOST" as const, bandType: "GHOST" as const }
      ]
    }),

    SplitRail: () => ({
      bands: [
        { y: 20, height: 15, type: "SOLID" as const },
        { y: 75, height: 15, type: "SOLID" as const }
      ],
      orbs: [{
        x: 90,
        y: 50,
        r: 6,
        phaseRequired: "SOLID" as const,
        bandType: "SOLID" as const,
      }]
    }),

    StaggeredBars: () => ({
      bands: [
        { y: 20, height: 20, type: "GHOST" as const, x: 30, width: 60 },
        { y: 50, height: 20, type: "GHOST" as const, x: 90, width: 60 },
        { y: 80, height: 20, type: "GHOST" as const, x: 20, width: 60 }
      ],
      orbs: [
        { x: 60, y: 5, r: 4, phaseRequired: "GHOST" as const, bandType: "GHOST" as const },
        { x: 120, y: 35, r: 4, phaseRequired: "GHOST" as const, bandType: "GHOST" as const },
        { x: 50, y: 65, r: 4, phaseRequired: "GHOST" as const, bandType: "GHOST" as const }
      ]
    }),

    MovingWindow: () => ({
      bands: [
        { y: 30, height: 50, type: "SOLID" as const, x: 0, width: 60 },
        { y: 30, height: 50, type: "SOLID" as const, x: 120, width: 60 }
      ],
      orbs: [{
        x: 90,
        y: 15,
        r: 6,
        phaseRequired: "SOLID" as const,
        bandType: "SOLID" as const,
      }]
    }),

    NeutralGate: () => ({
      bands: [
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 0, width: 60 },
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 120, width: 60 },
        { y: 35, height: 30, type: "GHOST" as const, x: 60, width: 60 }
      ],
      orbs: [{
        x: 90,
        y: 5,
        r: 6,
        phaseRequired: "GHOST" as const,
        bandType: "GHOST" as const,
      }]
    }),

    MovingBarrier: () => ({
      bands: [{
        y: 40,
        height: 30,
        type: "GHOST" as const,
        x: 60,
        width: 80
      }],
      orbs: [{
        x: 100,
        y: 25,
        r: 6,
        phaseRequired: "GHOST" as const,
        bandType: "GHOST" as const,
      }]
    }),

    NeutralMaze: () => ({
      bands: [
        { y: 20, height: 20, type: "NEUTRAL" as const, x: 0, width: 54 },
        { y: 20, height: 20, type: "NEUTRAL" as const, x: 126, width: 54 },
        { y: 50, height: 20, type: "SOLID" as const, x: 36, width: 108 },
        { y: 80, height: 20, type: "NEUTRAL" as const, x: 0, width: 72 },
        { y: 80, height: 20, type: "NEUTRAL" as const, x: 144, width: 36 }
      ],
      orbs: [
        { x: 90, y: 5, r: 6, phaseRequired: "SOLID" as const, bandType: "SOLID" as const },
        { x: 108, y: 105, r: 6, phaseRequired: "SOLID" as const, bandType: "SOLID" as const }
      ]
    }),

    BouncingGate: () => ({
      bands: [
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 0, width: 50 },
        { y: 20, height: 60, type: "NEUTRAL" as const, x: 130, width: 50 },
        { y: 35, height: 30, type: "GHOST" as const, x: 70, width: 40 }
      ],
      orbs: [{
        x: 90,
        y: 5,
        r: 6,
        phaseRequired: "GHOST" as const,
        bandType: "GHOST" as const,
      }]
    })
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: '#0b0f14', 
      color: '#fff',
      fontFamily: 'system-ui',
      overflow: 'auto'
    }}>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#1e1e1e',
              border: '1px solid #444',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '16px'
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Obstacle Preview</h1>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          maxWidth: '1200px'
        }}>
          {Object.entries(obstacleGenerators).map(([name, generator]) => (
            <ObstaclePreview
              key={name}
              name={name}
              width={previewWidth}
              height={previewHeight}
              theme={theme}
              onGenerate={generator}
            />
          ))}
        </div>

        <div style={{ marginTop: '30px', fontSize: '14px', color: '#aaa', lineHeight: '1.5' }}>
          <h3>Legend:</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: theme.bg }}></div>
              <span>SOLID Phase</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: theme.accent }}></div>
              <span>GHOST Phase</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: '#ffffff' }}></div>
              <span>NEUTRAL (blocks both)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewScreen;
