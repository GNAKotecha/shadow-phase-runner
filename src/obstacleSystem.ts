// Simple Obstacle System - Keep RectBand logic unchanged, add 5 new obstacles after score 50

export interface BandPart {
  y: number;
  height: number;
  type: "SOLID" | "GHOST" | "NEUTRAL"; // NEUTRAL = white, blocks both phases
  x?: number;     // for partial width bands
  width?: number; // for partial width bands
  isThin?: boolean; // visual indicator for thin barriers
  movingX?: number; // for horizontally moving obstacles
  moveSpeed?: number; // pixels per second
  moveDirection?: 1 | -1; // 1 = right, -1 = left
  moveRange?: { min: number; max: number }; // movement bounds
  linkId?: string; // Unique ID for linking with orbs
}

export interface OrbPart {
  x: number;
  y: number;
  r: number;
  phaseRequired: "SOLID" | "GHOST";
  bandType: "SOLID" | "GHOST";
  taken: boolean;
  linkId?: string; // Links orb to a moving barrier
  offsetX?: number; // Offset from linked barrier's position
}

export function createObstacleSystem(
  bandsRef: { current: BandPart[] },
  orbsRef: { current: OrbPart[] },
  options: { W?: number } = {}
) {
  const W = options.W || 420;
  
  // State tracking
  let obstacleCount = 0;
  let lastTopY = -80;
  let rectBandsSinceSpecial = 0;
  let consecutiveSamePhase = 0;
  let lastBandPhase: "SOLID" | "GHOST" | null = null;

  // Debug state
  const debugState = {
    count: 0,
    lastKey: 'RectBand',
    exitSafePhase: 'SOLID' as "SOLID" | "GHOST",
    firstDemandPhase: 'SOLID' as "SOLID" | "GHOST",
    bands: 0,
    orbs: 0,
    lastTopY: -80,
    noFlipStreak: 0,
    needFlip: false,
    spacing: 0,
    minSpacing: 0,
    firstUnlock: 0,
    consecutiveSamePhase: 0
  };

  // Guardrail: prevent more than 5 bands of same phase in a row
  function pickPhaseWithGuardrail(): "SOLID" | "GHOST" {
    if (consecutiveSamePhase >= 5 && lastBandPhase) {
      console.log(`Phase lock prevention: forcing ${lastBandPhase === "SOLID" ? "GHOST" : "SOLID"} after ${consecutiveSamePhase} consecutive ${lastBandPhase}`);
      return lastBandPhase === "SOLID" ? "GHOST" : "SOLID";
    }
    return Math.random() < 0.5 ? "SOLID" : "GHOST";
  }

  function trackBandPhase(phase: "SOLID" | "GHOST") {
    if (phase === lastBandPhase) {
      consecutiveSamePhase++;
    } else {
      consecutiveSamePhase = 1;
      lastBandPhase = phase;
    }
  }

  // Original RectBand logic (UNCHANGED except for guardrail)
  function spawnRectBand() {
    const gap = Math.max(170, 260 * 0.5); // Keep original spacing
    const height = 40 + Math.random() * (240 - 40); // Keep original height range
    
    const bandPhase = pickPhaseWithGuardrail();
    trackBandPhase(bandPhase);
    
    const y = lastTopY - (height + gap);
    const orbOffset = Math.min(70, gap * 0.45);
    const orbY = y + height + orbOffset;
    const orbX = 40 + Math.random() * (420 - 80);
    
    bandsRef.current.push({ y, height, type: bandPhase });
    orbsRef.current.push({ 
      x: orbX, 
      y: orbY, 
      r: 8, 
      phaseRequired: bandPhase, 
      bandType: bandPhase, 
      taken: false 
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial++;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'RectBand';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = bandPhase;
    debugState.firstDemandPhase = bandPhase;
    debugState.bands = 1;
    debugState.orbs = 1;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // 5 New Obstacles (simple versions)
  function spawnGate() {
    const gatePhase = pickPhaseWithGuardrail();
    trackBandPhase(gatePhase);
    
    const y = lastTopY - 120;
    const gapWidth = 100;
    const gapX = (W - gapWidth) / 2; // Center the gap
    
    // Left white wall (covers most of left side)
    bandsRef.current.push({
      y: y,
      height: 80,
      type: "NEUTRAL",
      x: 0,
      width: gapX
    });
    
    // Right white wall (covers most of right side)
    bandsRef.current.push({
      y: y,
      height: 80,
      type: "NEUTRAL",
      x: gapX + gapWidth,
      width: W - (gapX + gapWidth)
    });
    
    // Colored barrier in the gap (phasable)
    bandsRef.current.push({
      y: y + 20,
      height: 40,
      type: gatePhase,
      x: gapX,
      width: gapWidth
    });
    
    // Orb above the colored barrier
    orbsRef.current.push({
      x: gapX + gapWidth / 2,
      y: y - 20,
      r: 8,
      phaseRequired: gatePhase,
      bandType: gatePhase,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'Gate';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = gatePhase;
    debugState.firstDemandPhase = gatePhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  function spawnZigZag() {
    const phase1 = pickPhaseWithGuardrail();
    trackBandPhase(phase1);
    const phase2 = phase1 === "SOLID" ? "GHOST" : "SOLID";
    trackBandPhase(phase2);
    
    const y = lastTopY - 140;
    
    // Left barrier
    bandsRef.current.push({
      y: y,
      height: 30,
      type: phase1,
      x: 0,
      width: W * 0.6,
      isThin: true
    });
    
    // Right barrier (offset down)
    bandsRef.current.push({
      y: y + 60,
      height: 30,
      type: phase2,
      x: W * 0.4,
      width: W * 0.6,
      isThin: true
    });
    
    // Guide orbs
    orbsRef.current.push({
      x: W * 0.8,
      y: y - 20,
      r: 8,
      phaseRequired: phase1,
      bandType: phase1,
      taken: false
    });
    
    orbsRef.current.push({
      x: W * 0.2,
      y: y + 40,
      r: 8,
      phaseRequired: phase2,
      bandType: phase2,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'ZigZag';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = phase2;
    debugState.firstDemandPhase = phase1;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  function spawnSplitRail() {
    const railPhase = pickPhaseWithGuardrail();
    trackBandPhase(railPhase);
    
    const y = lastTopY - 120;
    const gap = 80;
    
    // Top rail
    bandsRef.current.push({
      y: y,
      height: 20,
      type: railPhase
    });
    
    // Bottom rail
    bandsRef.current.push({
      y: y + 20 + gap,
      height: 20,
      type: railPhase
    });
    
    // Orb in gap
    orbsRef.current.push({
      x: 100 + Math.random() * (W - 200),
      y: y + 10 + gap / 2,
      r: 8,
      phaseRequired: railPhase,
      bandType: railPhase,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'SplitRail';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = railPhase;
    debugState.firstDemandPhase = railPhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  function spawnStaggeredBars() {
    const barPhase = pickPhaseWithGuardrail();
    trackBandPhase(barPhase);
    
    const y = lastTopY - 160;
    const numBars = 3;
    
    for (let i = 0; i < numBars; i++) {
      const barY = y + i * 50;
      const barWidth = 80;
      const barX = Math.random() * (W - barWidth);
      
      bandsRef.current.push({
        y: barY,
        height: 25,
        type: barPhase,
        x: barX,
        width: barWidth,
        isThin: true
      });
      
      // Orb near each bar
      orbsRef.current.push({
        x: barX + barWidth / 2,
        y: barY - 30,
        r: 6,
        phaseRequired: barPhase,
        bandType: barPhase,
        taken: false
      });
    }
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'StaggeredBars';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = barPhase;
    debugState.firstDemandPhase = barPhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  function spawnMovingWindow() {
    const windowPhase = pickPhaseWithGuardrail();
    trackBandPhase(windowPhase);
    
    const y = lastTopY - 120;
    const windowWidth = 100;
    const windowX = Math.random() * (W - windowWidth);
    
    // Left wall
    if (windowX > 0) {
      bandsRef.current.push({
        y: y,
        height: 60,
        type: windowPhase,
        x: 0,
        width: windowX
      });
    }
    
    // Right wall
    if (windowX + windowWidth < W) {
      bandsRef.current.push({
        y: y,
        height: 60,
        type: windowPhase,
        x: windowX + windowWidth,
        width: W - (windowX + windowWidth)
      });
    }
    
    // Orb in window
    orbsRef.current.push({
      x: windowX + windowWidth / 2,
      y: y - 30,
      r: 8,
      phaseRequired: windowPhase,
      bandType: windowPhase,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'MovingWindow';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = windowPhase;
    debugState.firstDemandPhase = windowPhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // NeutralGate: White walls with colored barrier in the gap
  function spawnNeutralGate() {
    const gatePhase = pickPhaseWithGuardrail();
    trackBandPhase(gatePhase);
    
    const y = lastTopY - 120;
    const gapWidth = 80;
    const gapX = (W - gapWidth) / 2; // Center the gap
    
    // Left white wall (covers most of left side)
    bandsRef.current.push({
      y: y,
      height: 80,
      type: "NEUTRAL",
      x: 0,
      width: gapX
    });
    
    // Right white wall (covers most of right side)
    bandsRef.current.push({
      y: y,
      height: 80,
      type: "NEUTRAL",
      x: gapX + gapWidth,
      width: W - (gapX + gapWidth)
    });
    
    // Colored barrier in the gap (phasable)
    bandsRef.current.push({
      y: y + 20,
      height: 40,
      type: gatePhase,
      x: gapX,
      width: gapWidth
    });
    
    // Orb above the colored barrier
    orbsRef.current.push({
      x: gapX + gapWidth / 2,
      y: y - 20,
      r: 8,
      phaseRequired: gatePhase,
      bandType: gatePhase,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'NeutralGate';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = gatePhase;
    debugState.firstDemandPhase = gatePhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // MovingBarrier: Horizontal barrier that slides left and right
  function spawnMovingBarrier() {
    const barrierPhase = pickPhaseWithGuardrail();
    trackBandPhase(barrierPhase);
    
    const y = lastTopY - 120;
    const barrierWidth = 120;
    const moveRange = { min: 0, max: W };
    const startX = Math.random() * (W - barrierWidth);
    
    bandsRef.current.push({
      y: y,
      height: 40,
      type: barrierPhase,
      x: startX,
      width: barrierWidth,
      movingX: startX,
      moveSpeed: 60 + Math.random() * 40, // 60-100 pixels per second
      moveDirection: Math.random() < 0.5 ? 1 : -1,
      moveRange: moveRange
    });
    
    // Orb that follows the barrier
    orbsRef.current.push({
      x: startX + barrierWidth / 2,
      y: y - 30,
      r: 8,
      phaseRequired: barrierPhase,
      bandType: barrierPhase,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'MovingBarrier';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = barrierPhase;
    debugState.firstDemandPhase = barrierPhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // NeutralMaze: Mix of neutral and colored barriers creating a maze
  function spawnNeutralMaze() {
    const y = lastTopY - 160;
    const phase1 = pickPhaseWithGuardrail();
    trackBandPhase(phase1);
    
    // Top neutral barrier with gaps
    bandsRef.current.push({
      y: y,
      height: 25,
      type: "NEUTRAL",
      x: 0,
      width: W * 0.3
    });
    
    bandsRef.current.push({
      y: y,
      height: 25,
      type: "NEUTRAL",
      x: W * 0.7,
      width: W * 0.3
    });
    
    // Middle colored barrier
    bandsRef.current.push({
      y: y + 40,
      height: 25,
      type: phase1,
      x: W * 0.2,
      width: W * 0.6
    });
    
    // Bottom neutral barrier with different gaps
    bandsRef.current.push({
      y: y + 80,
      height: 25,
      type: "NEUTRAL",
      x: 0,
      width: W * 0.4
    });
    
    bandsRef.current.push({
      y: y + 80,
      height: 25,
      type: "NEUTRAL",
      x: W * 0.8,
      width: W * 0.2
    });
    
    // Guide orbs
    orbsRef.current.push({
      x: W * 0.5, // Top gap
      y: y - 20,
      r: 8,
      phaseRequired: phase1,
      bandType: phase1,
      taken: false
    });
    
    orbsRef.current.push({
      x: W * 0.6, // Bottom gap
      y: y + 100,
      r: 8,
      phaseRequired: phase1,
      bandType: phase1,
      taken: false
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'NeutralMaze';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = phase1;
    debugState.firstDemandPhase = phase1;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // BouncingGate: Moving white wall with colored barrier in the gap
  function spawnBouncingGate() {
    const gatePhase = pickPhaseWithGuardrail();
    trackBandPhase(gatePhase);
    
    const y = lastTopY - 120;
    const gapWidth = 100;
    const wallHeight = 80;
    const linkId = `bouncing-gate-${obstacleCount}`;
    
    // Single moving white wall with gap
    const startGapX = Math.random() * (W - gapWidth);
    
    // Left part of moving white wall
    bandsRef.current.push({
      y: y,
      height: wallHeight,
      type: "NEUTRAL",
      x: 0,
      width: startGapX,
      movingX: 0,
      moveSpeed: 80,
      moveDirection: Math.random() < 0.5 ? 1 : -1,
      moveRange: { min: 0, max: W - gapWidth },
      linkId: linkId + "-left"
    });
    
    // Right part of moving white wall
    bandsRef.current.push({
      y: y,
      height: wallHeight,
      type: "NEUTRAL",
      x: startGapX + gapWidth,
      width: W - (startGapX + gapWidth),
      movingX: startGapX + gapWidth,
      moveSpeed: 80,
      moveDirection: Math.random() < 0.5 ? 1 : -1,
      moveRange: { min: gapWidth, max: W },
      linkId: linkId + "-right"
    });
    
    // Colored barrier in the moving gap
    bandsRef.current.push({
      y: y + 20,
      height: 40,
      type: gatePhase,
      x: startGapX + 20,
      width: gapWidth - 40,
      movingX: startGapX + 20,
      moveSpeed: 80,
      moveDirection: Math.random() < 0.5 ? 1 : -1,
      moveRange: { min: 20, max: W - gapWidth + 20 },
      linkId: linkId
    });
    
    // Orb that follows the moving gap
    orbsRef.current.push({
      x: startGapX + gapWidth / 2,
      y: y - 20,
      r: 8,
      phaseRequired: gatePhase,
      bandType: gatePhase,
      taken: false,
      linkId: linkId,
      offsetX: gapWidth / 2
    });
    
    lastTopY = y;
    obstacleCount++;
    rectBandsSinceSpecial = 0;
    
    debugState.count = obstacleCount;
    debugState.lastKey = 'BouncingGate';
    debugState.lastTopY = lastTopY;
    debugState.exitSafePhase = gatePhase;
    debugState.firstDemandPhase = gatePhase;
    debugState.consecutiveSamePhase = consecutiveSamePhase;
  }

  // Main spawn logic
  function spawnOne(score: number) {
    // After score 50, randomly spawn special obstacles every 5-10 RectBands
    if (score >= 50 && rectBandsSinceSpecial >= 5) {
      const shouldSpawnSpecial = rectBandsSinceSpecial >= 10 || Math.random() < 0.3;
      
      if (shouldSpawnSpecial) {
        const specials = [spawnGate, spawnZigZag, spawnSplitRail, spawnStaggeredBars, spawnMovingWindow, spawnNeutralGate, spawnMovingBarrier, spawnNeutralMaze, spawnBouncingGate];
        const randomSpecial = specials[Math.floor(Math.random() * specials.length)];
        randomSpecial();
        console.log(`Spawned special obstacle after ${rectBandsSinceSpecial} RectBands`);
        return;
      }
    }
    
    // Default: spawn RectBand
    spawnRectBand();
  }

  // Public API
  return {
    maybeSpawn(score: number, speed: number, screenHeight: number) {
      const targetAbove = screenHeight * 0.9;
      let safety = 40;
      while (-lastTopY < targetAbove && safety-- > 0) {
        spawnOne(score);
      }
    },
    
    scroll(deltaY: number) {
      lastTopY += deltaY;
    },
    
    reset() {
      obstacleCount = 0;
      lastTopY = -80;
      rectBandsSinceSpecial = 0;
      consecutiveSamePhase = 0;
      lastBandPhase = null;
      bandsRef.current.length = 0;
      orbsRef.current.length = 0;
      
      debugState.count = 0;
      debugState.lastKey = 'RectBand';
      debugState.lastTopY = -80;
      debugState.consecutiveSamePhase = 0;
      
      console.log("Obstacle system reset");
    },
    
    getDebug() {
      return { ...debugState };
    }
  };
}
