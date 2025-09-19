import React, { useEffect, useRef, useState } from "react";
import { 
  ensureAnonAuth, 
  submitScore, 
  fetchTop, 
  fetchSelfRank, 
  type LeaderboardEntry, 
  subscribeTop, 
  subscribeSelfRank, 
  getUserBest, 
  sanitizeUsername,
  auth,
  AuthResult,
  getUserProfile,
  signOutUser
} from './firebase.js';
import { User } from 'firebase/auth';
import { createObstacleSystem } from './obstacleSystem.js';
import PreviewScreen from './PreviewScreen.js';
import MenuScreen from './MenuScreen.js';
import LeaderboardScreen from './LeaderboardScreen.js';
import SettingsScreen from './SettingsScreen.js';
import AuthScreen from './AuthScreen.js';
import UserProfile from './UserProfile.js';

// Neon phase color pairs (bg = SOLID color, accent = GHOST color). All bright for contrast on dark playfield.
const colorCombos: { bg: string; accent: string }[] = [
  { bg: '#ff2d55', accent: '#0affff' },
  { bg: '#39ff14', accent: '#ff007f' },
  { bg: '#ffd60a', accent: '#845ef7' },
  { bg: '#ff6b00', accent: '#00f5d4' },
  { bg: '#ff00ff', accent: '#00ff6a' },
  { bg: '#ff3366', accent: '#33ddff' },
  { bg: '#ffdc00', accent: '#ff006e' },
  { bg: '#fe53bb', accent: '#09fbd3' },
  { bg: '#ff9f1c', accent: '#2ec4b6' },
  { bg: '#ff5f1f', accent: '#00e5ff' },
  { bg: '#f72585', accent: '#b517ff' },
  { bg: '#ff4d4d', accent: '#7dff00' },
];

// Static UI / background colors (dark theme remains constant)
const UI_BG = '#0b0f14';
const UI_ACCENT = '#09fbd3';
const BAND_RED = '#ff3b5c';
const BAND_BLUE = '#2d5bff';

// Utility helpers
function shade(hex: string, amt: number) {
  const h = hex.replace('#','');
  let r = parseInt(h.substring(0,2),16);
  let g = parseInt(h.substring(2,4),16);
  let b = parseInt(h.substring(4,6),16);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Theme state (bg = SOLID phase color, accent = GHOST phase color)
  const [theme, setTheme] = useState(() => colorCombos[Math.floor(Math.random()*colorCombos.length)]);
  const [gameState, setGameState] = useState<"MENU" | "RUN" | "GAMEOVER" | "PREVIEW" | "LEADERBOARD" | "SETTINGS">("MENU");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<"SOLID" | "GHOST">("SOLID");
  const [cooldown, setCooldown] = useState(0);
  // Enhanced authentication state
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [liveTop, setLiveTop] = useState<LeaderboardEntry[]>([]);
  const [selfRankLive, setSelfRankLive] = useState<{ rank: number; bestScore: number } | null>(null);
  const [changing, setChanging] = useState(false);

  // Mobile/touch controls
  const [controlMode, setControlMode] = useState<'drag' | 'tilt'>('drag');
  const [activeTouches, setActiveTouches] = useState<{ [id: number]: { x: number; y: number; type: 'move' | 'phase' } }>({});
  const deviceOrientationRef = useRef<{ beta: number; gamma: number } | null>(null);
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const selfRankRef = useRef<{ rank: number; bestScore: number } | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false, t0: 0 });

  const W = 420;
  const H = 720;
  // Speed ramp: original acceleration but capped at 350
  const SPEED_START = 260;
  const SPEED_CAP = 350;

  const player = useRef({ x: W / 2, y: H * 0.75, r: 18 });
  const speedRef = useRef(SPEED_START);
  // Revert bands to RED/BLUE identifiers (logic unchanged) but colors now map to theme each round
  const bandsRef = useRef<{ y: number; height: number; type: "SOLID" | "GHOST" | "NEUTRAL"; x?: number; width?: number; movingX?: number; moveSpeed?: number; moveDirection?: 1 | -1; moveRange?: { min: number; max: number }; linkId?: string }[]>([]);
  // Orbs now store required phase (same as bandType) directly using SOLID/GHOST
  const orbsRef = useRef<{ x: number; y: number; r: number; phaseRequired: "SOLID" | "GHOST"; bandType: "SOLID" | "GHOST"; taken: boolean; linkId?: string; offsetX?: number }[]>([]);
  const obstacleSystemRef = useRef<ReturnType<typeof createObstacleSystem> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  function pickNewTheme() { setTheme(colorCombos[Math.floor(Math.random()*colorCombos.length)]); }

  function resetWorld() {
    setScore(0);
    setPhase("SOLID");
    setCooldown(0);
    player.current = { x: W / 2, y: H * 0.75, r: 18 };
    speedRef.current = SPEED_START;
    bandsRef.current = [];
    orbsRef.current = [];
    obstacleSystemRef.current?.reset();
    lastRef.current = 0;
  }

  function startGame() {
    if (showAuthScreen) return; // Don't start while auth screen open
    pickNewTheme(); // One random theme per round start only (affects player + orbs)
    resetWorld();
    setGameState("RUN");
  }

  // Fixed dark background (no longer changes with theme)
  useEffect(()=>{ document.body.style.background = UI_BG; }, []);

  useEffect(() => {
    if(!obstacleSystemRef.current){ obstacleSystemRef.current = createObstacleSystem(bandsRef as any, orbsRef as any, {}); }
  },[]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const rawCtx = c.getContext("2d");
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    function runTests() { 
      console.log('=== TESTING MATH.RANDOM ===');
      let sawSolid=false,sawGhost=false;
      let solidCount=0, ghostCount=0;
      for(let i=0;i<400;i++){ 
        const randomVal = Math.random();
        const t = randomVal <= 0.5 ? "SOLID" : "GHOST"; 
        if(t==="SOLID") { sawSolid=true; solidCount++; } 
        else { sawGhost=true; ghostCount++; }
        if(i < 10) console.log(`Test ${i}: ${randomVal.toFixed(3)} -> ${t}`);
      } 
      console.log(`Distribution: SOLID=${solidCount}, GHOST=${ghostCount}`);
      console.assert(sawSolid&&sawGhost,'RNG distribution FAILED!'); 
      console.log('=== MATH.RANDOM TEST COMPLETE ===');
    }
    runTests();

    // Culling only (spawning handled by obstacleSystem)
    function clearOffscreen() { bandsRef.current = bandsRef.current.filter(b => b.y < H + 60); orbsRef.current = orbsRef.current.filter(o => o.y < H + 60 && !o.taken); }

    function drawBackground(time: number) {
      // Static dark background, subtle moving light lines
      ctx.fillStyle = UI_BG;
      ctx.fillRect(0,0,W,H);
      for (let i = 0; i < 10; i++) {
        const alpha = 0.03 + i * 0.015; ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const x = ((time * 0.05 + i * 60) % (W + 60)) - 60; ctx.fillRect(x,0,2,H);
      }
    }

    function drawPlayer() {
      const p = player.current; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = phase === 'SOLID' ? theme.bg : theme.accent; // dynamic per round
      (ctx as any).shadowColor = ctx.fillStyle; (ctx as any).shadowBlur = 18; ctx.fill(); (ctx as any).shadowBlur = 0;
    }

    function drawBands() {
      bandsRef.current.forEach(b=>{ 
        // Handle NEUTRAL (white) bands that block both phases
        if (b.type === 'NEUTRAL') {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.95; // Always solid/opaque
        } else {
          ctx.fillStyle = b.type === 'SOLID' ? theme.bg : theme.accent;
          const isBlocking = phase !== b.type;
          ctx.globalAlpha = isBlocking ? 0.9 : 0.28;
        }
        
        // Use movingX for moving obstacles, fallback to static x
        const bx = (b as any).movingX ?? (b as any).x ?? 0;
        const bw = (b as any).width ?? W;
        ctx.fillRect(bx, b.y, bw, b.height);
        ctx.globalAlpha = 1;
      });
    }

    function drawOrbs() {
      orbsRef.current.forEach(o=>{ if(o.taken) return; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); const base = o.bandType==='SOLID'? theme.bg : theme.accent; ctx.fillStyle = hexToRgba(base, 0.9); ctx.fill(); });
    }

    function collide() { 
      const p = player.current; 
      for(const b of bandsRef.current){ 
        // Use movingX for moving obstacles, fallback to static x
        const bx = (b as any).movingX ?? (b as any).x ?? 0; 
        const bw = (b as any).width ?? W; 
        if(p.y + p.r > b.y && p.y - p.r < b.y + b.height){ 
          // horizontal overlap test for partial bands
          if(p.x + p.r > bx && p.x - p.r < bx + bw){
            // NEUTRAL bands always block, phase bands block when mismatched
            if(b.type === 'NEUTRAL' || phase !== b.type) return true; 
          }
        } 
      } 
      return false; 
    }
    function collect() { const p = player.current; for (const o of orbsRef.current){ if(o.taken) continue; const dx=o.x-p.x, dy=o.y-p.y; if(dx*dx+dy*dy <= (o.r+p.r)*(o.r+p.r)){ if(o.phaseRequired===phase){ o.taken = true; setScore(s=>s+5); } } } }

    function drawUI() {
      const ctx2 = canvasRef.current?.getContext('2d'); if(!ctx2) return;
      ctx2.fillStyle = '#fff'; ctx2.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto';
      ctx2.fillText(`Score ${score}` as any,16,30); ctx2.fillText(`Best ${best}` as any,16,56);
      ctx2.fillStyle = phase === 'SOLID' ? theme.bg : theme.accent; ctx2.fillText(phase as any, 420-110, 30);
      if(cooldown>0 && gameState==='RUN'){ const t = Math.min(1,cooldown/300); ctx2.fillStyle='rgba(255,255,255,0.2)'; ctx2.fillRect(420-150,40,120,10); ctx2.fillStyle='#fff'; ctx2.fillRect(420-150,40,120*(1-t),10); }
      if(gameState==='MENU'){ ctx2.fillStyle='rgba(0,0,0,0.55)'; ctx2.fillRect(0,0,420,720); ctx2.fillStyle='#fff'; ctx2.textAlign='center'; ctx2.font='bold 32px system-ui, -apple-system, Segoe UI, Roboto'; ctx2.fillText('Tap to Start' as any,210,330); ctx2.font='18px system-ui, -apple-system, Segoe UI, Roboto'; ctx2.fillText('Drag to move • Tap/Space to phase' as any,210,366); ctx2.textAlign='start'; }
      if(gameState==='GAMEOVER'){ ctx2.fillStyle='rgba(0,0,0,0.55)'; ctx2.fillRect(0,0,420,720); ctx2.fillStyle='#fff'; ctx2.textAlign='center'; ctx2.font='bold 34px system-ui, -apple-system, Segoe UI, Roboto'; ctx2.fillText('Game Over' as any,210,320); ctx2.font='18px system-ui, -apple-system, Segoe UI, Roboto'; ctx2.fillText(`Score ${score} • Best ${best}` as any,210,352); ctx2.fillText('Tap to restart' as any,210,382); ctx2.textAlign='start'; }
      if(showDebug && obstacleSystemRef.current){
        try {
          const dbg = obstacleSystemRef.current.getDebug();
          ctx2.save();
          ctx2.font='11px system-ui, -apple-system, Segoe UI, Roboto';
          ctx2.textAlign='left';
            const lines = [
              `Obst ${dbg.count} (${dbg.lastKey||'-'})`,
              `ExitSafe ${dbg.exitSafePhase||'-'}`,
              `FirstNeed ${dbg.firstDemandPhase||'-'}`,
              `Bands+Orbs ${dbg.bands}/${dbg.orbs}`,
              `TopY ${dbg.lastTopY.toFixed(1)}`,
              `Speed ${speedRef.current.toFixed(1)}`,
              `Cooldown ${cooldown}`,
              `Phase ${phase}`,
              `NoFlip ${dbg.noFlipStreak}`,
              `NeedFlip ${dbg.needFlip?'Y':'N'}`
            ];
            ctx2.fillStyle='rgba(0,0,0,0.45)';
            ctx2.fillRect(6, H- (lines.length*14 + 10), 170, lines.length*14 + 8);
            ctx2.fillStyle='#0affff';
            lines.forEach((ln,i)=> ctx2.fillText(ln,12, H - (lines.length*14 + 10) + 18 + i*14));
          ctx2.restore();
        } catch {}
      }
    }

    function step(ts:number){
      if(!lastRef.current) lastRef.current = ts;
      const dt = Math.min(50, ts - lastRef.current);
      lastRef.current = ts;
      if(gameState==='RUN'){
        const v=(speedRef.current*dt)/1000;
        bandsRef.current.forEach(b=>{
          b.y+=v;
          // Update horizontal movement for moving obstacles
          if (b.moveSpeed && b.moveDirection && b.moveRange) {
            const moveDistance = (b.moveSpeed * dt) / 1000;
            const newMovingX = (b.movingX ?? b.x ?? 0) + (b.moveDirection * moveDistance);
            
            // Bounce off movement bounds
            if (newMovingX <= b.moveRange.min || newMovingX + (b.width ?? 0) >= b.moveRange.max) {
              b.moveDirection *= -1; // Reverse direction
            }
            
            b.movingX = Math.max(b.moveRange.min, Math.min(b.moveRange.max - (b.width ?? 0), newMovingX));
          }
        });
        orbsRef.current.forEach(o=>{
          o.y+=v;
          // Update position for orbs linked to moving barriers
          if (o.linkId && o.offsetX !== undefined) {
            const linkedBand = bandsRef.current.find(b => b.linkId === o.linkId);
            if (linkedBand && linkedBand.movingX !== undefined) {
              o.x = linkedBand.movingX + o.offsetX;
            }
          }
        });
        obstacleSystemRef.current?.scroll(v);
        setScore(s=>s+Math.floor(dt/40));
        // Revert to original acceleration but cap at 350
        if(speedRef.current < SPEED_CAP){
          speedRef.current = Math.min(SPEED_CAP, speedRef.current + dt * 0.012);
        }
        if(cooldown>0) setCooldown(c=>Math.max(0,c-dt));
        obstacleSystemRef.current?.maybeSpawn(score, speedRef.current, H);
        if(collide()){
          const newBest = Math.max(best, score);
          if(newBest!==best) setBest(newBest);
            setGameState('GAMEOVER');
        }
        collect();
        clearOffscreen();
      }
      drawBackground(ts); drawBands(); drawOrbs(); drawPlayer(); drawUI();
      rafRef.current = requestAnimationFrame(step as any);
    }

    rafRef.current = requestAnimationFrame(step as any); return ()=> cancelAnimationFrame(rafRef.current);
  }, [gameState, phase, cooldown, score, best, theme, showDebug]);

  // Enhanced authentication setup
  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!mounted) return;
      
      setAuthLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Load user profile
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (mounted) {
            setUserProfile(profile);
            if (profile?.bestScore) {
              setBest(profile.bestScore);
            }
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      } else {
        // No user signed in, sign in anonymously
        try {
          await ensureAnonAuth();
        } catch (error) {
          console.error('Anonymous auth failed:', error);
        }
      }
      
      if (mounted) {
        setAuthLoading(false);
        refreshLeaderboard();
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Authentication handlers
  const handleAuthSuccess = async (result: AuthResult) => {
    setShowAuthScreen(false);
    setUser(result.user);
    
    try {
      const profile = await getUserProfile(result.user.uid);
      setUserProfile(profile);
      if (profile?.bestScore) {
        setBest(profile.bestScore);
      }
      refreshLeaderboard();
    } catch (error) {
      console.error('Failed to load profile after auth:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setUserProfile(null);
      setBest(0);
      // Will automatically sign in anonymously via onAuthStateChanged
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Leaderboard subscriptions
  useEffect(() => {
    const unsub = subscribeTop(10, (entries: LeaderboardEntry[]) => setLiveTop(entries));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeSelfRank(r => setSelfRankLive(r));
    return () => {
      try { unsub(); } catch {}
    };
  }, []);

  function refreshLeaderboard() {
    fetchTop().then((ls: LeaderboardEntry[]) => {
      leaderboardRef.current = ls;
    });
    fetchSelfRank().then((r: { rank: number; bestScore: number } | null) => {
      selfRankRef.current = r;
      if (r && r.bestScore > best) setBest(r.bestScore);
    });
  }

  // Submit score when game ends
  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      submitScore(score).then(updated => {
        if (typeof updated === 'number') setBest(updated);
        refreshLeaderboard();
      });
    }
  }, [gameState, score]);

  // ...existing code...

  useEffect(()=>{ 
    function handleKey(e:KeyboardEvent){ 
      // Prevent default for space and arrow keys to avoid page scrolling
      if(e.code==='Space' || e.code==='ArrowLeft' || e.code==='ArrowRight') {
        e.preventDefault(); 
      }
      
      // Debug toggle (works in any state)
      if(e.key === 'D' || e.key === 'd') { 
        setShowDebug(d => !d); 
        return; 
      } 
      
      // Don't handle other keys when auth screen is open
      if(showAuthScreen) return; 
      
      // Navigation keys for menu states
      if(gameState === 'LEADERBOARD' || gameState === 'SETTINGS' || gameState === 'PREVIEW') {
        if(e.key === 'Escape') {
          setGameState('MENU');
          return;
        }
      }
      
      // Menu state: space or enter starts game
      if(gameState==='MENU'){ 
        if(e.code==='Space' || e.code==='Enter') {
          startGame(); 
          return; 
        }
      } 
      
      // Game over state: space or enter restarts game
      if(gameState==='GAMEOVER'){ 
        if(e.code==='Space' || e.code==='Enter') {
          startGame(); 
          return; 
        }
      } 
      
      // Running state: handle game controls
      if(gameState!=='RUN') return; 
      
      // Phase switching
      if(e.code==='Space' && cooldown===0) {
        setPhase(p=> p==='SOLID'? 'GHOST':'SOLID'); 
        setCooldown(300); 
        return;
      }
      
      // Arrow key movement for desktop
      if(e.code==='ArrowLeft') {
        player.current.x = Math.max(player.current.r+8, player.current.x - 15);
      }
      if(e.code==='ArrowRight') {
        player.current.x = Math.min(420 - player.current.r - 8, player.current.x + 15);
      }
    }
    
    function clamp(x:number,a:number,b:number){ return Math.max(a, Math.min(b,x)); }
    
    function pointerPos(e:PointerEvent|TouchEvent|any){ 
      const rect = canvasRef.current!.getBoundingClientRect(); 
      const cx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left; 
      const cy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top; 
      return {x:cx,y:cy}; 
    }
    
    function onPointerDown(e:any){ 
      if(showAuthScreen) return; 
      e.preventDefault?.();
      
      const {x,y} = pointerPos(e); 
      
      // Always allow phase switching on any touch in RUN mode
      if(gameState === 'RUN' && cooldown === 0) {
        setPhase(p=> p==='SOLID'? 'GHOST':'SOLID'); 
        setCooldown(300);
      }
      
      // Handle movement based on control mode
      if(controlMode === 'drag') {
        // Update active touches for multi-touch support
        setActiveTouches(prev => ({
          ...prev,
          [e.pointerId || 0]: { x, y, type: 'move' }
        }));
        
        dragRef.current = { 
          active:true,
          startX:x,
          startY:y,
          moved:false,
          t0:performance.now() 
        }; 
      }
      
      if(gameState==='MENU'){ startGame(); return; } 
      if(gameState==='GAMEOVER'){ startGame(); return; } 
    }
    
    function onPointerMove(e:any){ 
      if(!dragRef.current.active || showAuthScreen) return; 
      e.preventDefault?.();
      
      const {x} = pointerPos(e); 
      const pointerId = e.pointerId || 0;
      
      if(controlMode === 'drag' && activeTouches[pointerId]) {
        // Update touch position
        setActiveTouches(prev => ({
          ...prev,
          [pointerId]: { ...prev[pointerId], x, y: pointerPos(e).y }
        }));
        
        const dx = x - dragRef.current.startX; 
        if(Math.abs(dx)>6) dragRef.current.moved = true; 
        player.current.x = clamp(x, player.current.r+8, 420 - player.current.r - 8); 
      }
    }
    
    function onPointerUp(e:any){ 
      e.preventDefault?.();
      const pointerId = e.pointerId || 0;
      
      // Remove from active touches
      setActiveTouches(prev => {
        const newTouches = { ...prev };
        delete newTouches[pointerId];
        return newTouches;
      });
      
      if(!dragRef.current.active) return; 
      dragRef.current.active = false; 
    }

    // Device orientation for tilt controls
    function handleOrientation(e: DeviceOrientationEvent) {
      if(controlMode === 'tilt' && gameState === 'RUN') {
        deviceOrientationRef.current = {
          beta: e.beta || 0,
          gamma: e.gamma || 0
        };
        
        // Use gamma (left/right tilt) for horizontal movement
        const tiltSensitivity = 4;
        const tiltX = (e.gamma || 0) * tiltSensitivity;
        const newX = clamp(player.current.x + tiltX, player.current.r+8, 420 - player.current.r - 8);
        player.current.x = newX;
      }
    }

    window.addEventListener('keydown', handleKey as any); 
    
    // Only add canvas event listeners if canvas exists (i.e., when in game state)
    const cEl = canvasRef.current;
    if (cEl) {
      cEl.addEventListener('pointerdown', onPointerDown,{passive:false} as any); 
      cEl.addEventListener('pointermove', onPointerMove,{passive:false} as any); 
      cEl.addEventListener('pointerup', onPointerUp,{passive:false} as any); 
      cEl.addEventListener('pointercancel', onPointerUp,{passive:false} as any); 
      cEl.addEventListener('pointerleave', onPointerUp,{passive:false} as any); 
    }
    
    // Add device orientation listener for tilt controls
    if(window.DeviceOrientationEvent) {
      // Check for iOS permission requirement
      if(typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        // iOS requires permission
        (DeviceOrientationEvent as any).requestPermission().then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        });
      } else {
        // Android and older browsers
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }
    
    return ()=>{ 
      window.removeEventListener('keydown', handleKey as any); 
      
      // Only remove canvas event listeners if canvas exists
      const cEl = canvasRef.current;
      if (cEl) {
        cEl.removeEventListener('pointerdown', onPointerDown as any); 
        cEl.removeEventListener('pointermove', onPointerMove as any); 
        cEl.removeEventListener('pointerup', onPointerUp as any); 
        cEl.removeEventListener('pointercancel', onPointerUp as any); 
        cEl.removeEventListener('pointerleave', onPointerUp as any); 
      }
      
      if(window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  },[gameState,cooldown,showAuthScreen,controlMode,activeTouches]);

  // Load control mode from localStorage
  useEffect(() => {
    const savedControlMode = localStorage.getItem('spr_control_mode') as 'drag' | 'tilt' | null;
    if (savedControlMode) setControlMode(savedControlMode);
  }, []);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Menu Screen */}
      {gameState === 'MENU' && (
        <MenuScreen
          theme={theme}
          username={userProfile?.username || (user?.isAnonymous ? null : user?.displayName) || null}
          onPlay={() => startGame()}
          onLeaderboard={() => setGameState('LEADERBOARD')}
          onPreview={() => setGameState('PREVIEW')}
          onSettings={() => setGameState('SETTINGS')}
          onChangeName={() => setShowAuthScreen(true)}
        />
      )}

      {/* Game Screen */}
      {(gameState === 'RUN' || gameState === 'GAMEOVER') && (
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0f14 0%, #1a1a2e 100%)'
        }}>
          {/* Game Canvas */}
          <canvas 
            ref={canvasRef} 
            width={W} 
            height={H} 
            style={{
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto',
              borderRadius: window.innerWidth > 768 ? '16px' : '0',
              boxShadow: window.innerWidth > 768 ? '0 8px 30px rgba(0,0,0,0.35)' : 'none',
              border: window.innerWidth > 768 ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }} 
          />

          {/* Mobile UI Overlay */}
          {window.innerWidth <= 768 && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              pointerEvents: 'none',
              zIndex: 100
            }}>
              {/* Score Display */}
              <div style={{
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600
              }}>
                Score: {score}
              </div>

              {/* Phase Display */}
              <div style={{
                background: phase === 'SOLID' ? theme.bg : theme.accent,
                color: phase === 'SOLID' ? '#fff' : '#000',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                opacity: cooldown > 0 ? 0.5 : 1
              }}>
                {phase}
              </div>
            </div>
          )}

          {/* Desktop Sidebar - only show on larger screens */}
          {window.innerWidth > 768 && (
            <>
              {/* Left Sidebar */}
              <aside style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                width: '240px',
                color: '#fff'
              }}>
                <h1 style={{fontSize:22, margin:'0 0 8px'}}>
                  <span style={{color:'#ffffff'}}>Shadow Phase Runner</span>
                </h1>
                <div style={{fontSize:13, lineHeight:'1.4', opacity:0.9, marginBottom:12}}>
                  <div>Tap / Space: phase</div>
                  <div>Drag: move</div>
                  <div>Collect orbs, avoid wrong phase</div>
                </div>
                <div style={{fontSize:13, marginBottom:8, opacity:0.85}}>
                  {userProfile?.username ? `You: ${userProfile.username}` : (user?.isAnonymous ? 'Playing as guest' : user?.displayName || 'Loading...')} {selfRankLive && `• Rank #${selfRankLive.rank}`}
                </div>
                
                {/* User Profile Component */}
                <UserProfile 
                  user={user!}
                  onSignOut={handleSignOut}
                  onShowAuth={() => setShowAuthScreen(true)}
                />
                <div style={{marginTop:24, fontSize:12, opacity:0.6}}>High Score: {best}</div>
              </aside>

              {/* Right Sidebar */}
              <aside style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                width: '240px',
                color: '#fff'
              }}>
                <h2 style={{fontSize:20, margin:'0 0 12px'}}>Top 10</h2>
                <ol style={{listStyle:'none', padding:0, margin:0, fontSize:14, lineHeight:'1.5em'}}>
                  {liveTop.length === 0 && <li style={{opacity:0.6}}>{userProfile?.username ? 'No scores yet (play!)' : 'Loading...'}</li>}
                  {liveTop.map((e,i) => (
                    <li key={e.username} style={{
                      display:'flex', 
                      justifyContent:'space-between', 
                      background:'rgba(255,255,255,0.05)', 
                      padding:'3px 8px', 
                      borderRadius:4, 
                      marginBottom:4, 
                      border: userProfile?.username === e.username ? `1px solid ${UI_ACCENT}` : '1px solid transparent'
                    }}>
                      <span>{i+1}. {e.username}</span>
                      <span style={{opacity:0.85}}>{e.bestScore}</span>
                    </li>
                  ))}
                </ol>
                {selfRankLive && selfRankLive.rank > 10 && (
                  <div style={{marginTop:12, fontSize:12, opacity:0.85}}>Your Rank: #{selfRankLive.rank} • Best {selfRankLive.bestScore}</div>
                )}
                {userProfile?.username && !liveTop.find(e => e.username === userProfile.username) && liveTop.length > 0 && (
                  <div style={{marginTop:8, fontSize:12, opacity:0.65}}>Score more to enter Top 10!</div>
                )}
              </aside>
            </>
          )}

          {/* Back to Menu Button (mobile) */}
          {window.innerWidth <= 768 && gameState === 'GAMEOVER' && (
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setGameState('MENU')}
                style={{
                  background: theme.accent,
                  color: '#000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back to Menu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'LEADERBOARD' && (
        <LeaderboardScreen
          theme={theme}
          leaderboard={liveTop}
          selfRank={selfRankLive}
          username={userProfile?.username || null}
          onBack={() => setGameState('MENU')}
        />
      )}

      {/* Settings Screen */}
      {gameState === 'SETTINGS' && (
        <SettingsScreen
          theme={theme}
          onBack={() => setGameState('MENU')}
        />
      )}

      {/* Preview Screen */}
      {gameState === 'PREVIEW' && (
        <PreviewScreen 
          theme={theme} 
          onBack={() => setGameState('MENU')} 
        />
      )}

      {/* Authentication Screen */}
      {showAuthScreen && (
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuthScreen(false)}
        />
      )}
    </div>
  );
}
