import React, { useRef, useEffect } from 'react';

interface ObstaclePreviewProps {
  name: string;
  width: number;
  height: number;
  theme: { bg: string; accent: string };
  onGenerate: () => {
    bands: Array<{
      y: number;
      height: number;
      type: "SOLID" | "GHOST" | "NEUTRAL";
      x?: number;
      width?: number;
    }>;
    orbs: Array<{
      x: number;
      y: number;
      r: number;
      phaseRequired: "SOLID" | "GHOST";
      bandType: "SOLID" | "GHOST";
    }>;
  };
}

const ObstaclePreview: React.FC<ObstaclePreviewProps> = ({ name, width, height, theme, onGenerate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, width, height);

    try {
      // Generate obstacle
      const { bands, orbs } = onGenerate();

      // Draw bands
      bands.forEach(band => {
        if (band.type === 'NEUTRAL') {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.95;
        } else {
          ctx.fillStyle = band.type === 'SOLID' ? theme.bg : theme.accent;
          ctx.globalAlpha = 0.9;
        }

        const bx = band.x ?? 0;
        const bw = band.width ?? width;
        ctx.fillRect(bx, band.y, bw, band.height);
      });

      // Draw orbs
      ctx.globalAlpha = 1;
      orbs.forEach(orb => {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        const base = orb.bandType === 'SOLID' ? theme.bg : theme.accent;
        ctx.fillStyle = base;
        ctx.fill();
      });

    } catch (error) {
      // If generation fails, show error
      ctx.fillStyle = '#ff4444';
      ctx.font = '12px system-ui';
      ctx.fillText('Error', 10, 20);
    }
  }, [width, height, theme, onGenerate]);

  return (
    <div style={{ margin: '8px', textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #333',
          borderRadius: '4px',
          background: '#0b0f14'
        }}
      />
      <div style={{ 
        fontSize: '12px', 
        color: '#fff', 
        marginTop: '4px',
        fontFamily: 'system-ui'
      }}>
        {name}
      </div>
    </div>
  );
};

export default ObstaclePreview;
