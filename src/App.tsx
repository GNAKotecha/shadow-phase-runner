import React, { useEffect, useRef, useState } from "react";
import { ensureAnonAuth, claimUsername, submitScore, fetchTop, fetchSelfRank, type LeaderboardEntry, subscribeTop, changeUsername, subscribeSelfRank, getUserBest, sanitizeUsername, validateCachedUsername, registerUsername } from './firebase.js';

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
const UI_ACCENT = '#09fbd3'; // used for buttons etc., not changed per round
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
  const [gameState, setGameState] = useState<"MENU" | "RUN" | "GAMEOVER">("MENU");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<"SOLID" | "GHOST">("SOLID");
  const [cooldown, setCooldown] = useState(0);
  const [username, setUsername] = useState<string | null>(null);
  const [liveTop, setLiveTop] = useState<LeaderboardEntry[]>([]);
  const [selfRankLive, setSelfRankLive] = useState<{ rank: number; bestScore: number } | null>(null);
  const [changing, setChanging] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameMode, setNameMode] = useState<'claim' | 'change'>('claim');
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const selfRankRef = useRef<{ rank: number; bestScore: number } | null>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false, t0: 0 });

  const W = 420;
  const H = 720;

  const player = useRef({ x: W / 2, y: H * 0.75, r: 18 });
  const speedRef = useRef(260);
  // Revert bands to RED/BLUE identifiers (logic unchanged) but colors now map to theme each round
  const bandsRef = useRef<{ y: number; height: number; type: "RED" | "BLUE" }[]>([]);
  // Orbs now store required phase separately from the band color they mimic
  const orbsRef = useRef<{ x: number; y: number; r: number; phaseRequired: "SOLID" | "GHOST"; bandType: "RED" | "BLUE"; taken: boolean }[]>([]);

  function pickNewTheme() { setTheme(colorCombos[Math.floor(Math.random()*colorCombos.length)]); }

  function resetWorld() {
    setScore(0);
    setPhase("SOLID");
    setCooldown(0);
    player.current = { x: W / 2, y: H * 0.75, r: 18 };
    speedRef.current = 260;
    bandsRef.current = [];
    orbsRef.current = [];
    lastRef.current = 0;
  }

  function startGame() {
    if (showNameModal) return; // Don't start while modal open
    pickNewTheme(); // One random theme per round start only (affects player + orbs)
    resetWorld();
    setGameState("RUN");
  }

  // Fixed dark background (no longer changes with theme)
  useEffect(()=>{ document.body.style.background = UI_BG; }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const rawCtx = c.getContext("2d");
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;

    function runTests() { let sawRed=false,sawBlue=false; for(let i=0;i<400;i++){ const t=Math.random()<=0.5?"RED":"BLUE"; if(t==="RED") sawRed=true; else sawBlue=true; } console.assert(sawRed&&sawBlue,'RNG distribution'); }
    runTests();

    function spawnChunk() {
      const MIN_H = 40; const MAX_H = 240;
      const startY = Math.min(-40, ...bandsRef.current.map(b => b.y), -40) - 40;
      const n = 3 + Math.floor(Math.random() * 2);
      let lastY = bandsRef.current.length > 0 ? bandsRef.current[bandsRef.current.length - 1].y : startY;
      for (let i = 0; i < n; i++) {
        const h = MIN_H + Math.random() * (MAX_H - MIN_H);
        const speed = speedRef.current;
        const minGap = Math.max(170, speed * 0.5);
        const y = lastY - (h + minGap); lastY = y;
        const type: "RED" | "BLUE" = Math.random() <= 0.5 ? "RED" : "BLUE";
        bandsRef.current.push({ y, height: h, type });
        // Orb shows SAME color as band AND now requires SAME phase as passable band color
        const phaseRequired: "SOLID" | "GHOST" = type === "RED" ? "SOLID" : "GHOST";
        const orbY = y + h + Math.min(70, minGap * 0.45);
        const x = 40 + Math.random() * (W - 80);
        orbsRef.current.push({ x, y: orbY, r: 8, phaseRequired, bandType: type, taken: false });
      }
    }
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
        // passPhase = phase needed to pass THROUGH this band
        const passPhase: 'SOLID' | 'GHOST' = b.type === 'RED' ? 'SOLID' : 'GHOST';
        // Color still tied to passPhase (SOLID uses theme.bg, GHOST uses theme.accent)
        ctx.fillStyle = passPhase === 'SOLID' ? theme.bg : theme.accent;
        // NEW (reversed) visibility rule:
        // Player phase SOLID -> BLUE bands (passPhase=GHOST) are OPAQUE
        // Player phase GHOST -> RED bands (passPhase=SOLID) are OPAQUE
        // i.e. the band you CANNOT currently pass (blocking) is opaque; passable band is faded.
        const isBlocking = phase !== passPhase; // blocking when player's phase differs
        ctx.globalAlpha = isBlocking ? 0.9 : 0.28;
        ctx.fillRect(0, b.y, W, b.height);
        ctx.globalAlpha = 1;
      });
    }

    function drawOrbs() {
      orbsRef.current.forEach(o=>{ if(o.taken) return; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); const base = o.bandType==='RED'? theme.bg : theme.accent; ctx.fillStyle = hexToRgba(base, 0.9); ctx.fill(); });
    }

    function collide() { 
      const p = player.current; 
      for(const b of bandsRef.current){ 
        if(p.y + p.r > b.y && p.y - p.r < b.y + b.height){ 
          const passPhase = b.type === 'RED'? 'SOLID':'GHOST'; // phase that allows passing
          if(phase !== passPhase) return true; // collide when not matching
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
    }

    function step(ts:number){ if(!lastRef.current) lastRef.current = ts; const dt = Math.min(50, ts - lastRef.current); lastRef.current = ts; if(gameState==='RUN'){ const v=(speedRef.current*dt)/1000; bandsRef.current.forEach(b=>b.y+=v); orbsRef.current.forEach(o=>o.y+=v); clearOffscreen(); setScore(s=>s+Math.floor(dt/40)); speedRef.current += dt*0.012; if(cooldown>0) setCooldown(c=>Math.max(0,c-dt)); const lastB = bandsRef.current[bandsRef.current.length-1]; if(bandsRef.current.length<3 || !lastB || lastB.y>140) spawnChunk(); if(collide()){ const newBest = Math.max(best, score); if(newBest!==best) setBest(newBest); setGameState('GAMEOVER'); } collect(); }
      drawBackground(ts); drawBands(); drawOrbs(); drawPlayer(); drawUI(); rafRef.current = requestAnimationFrame(step as any); }

    rafRef.current = requestAnimationFrame(step as any); return ()=> cancelAnimationFrame(rafRef.current);
  }, [gameState, phase, cooldown, score, best, theme]);

  // Firebase & leaderboard logic (unchanged)
  useEffect(() => { let mounted = true; (async () => { try { await ensureAnonAuth(); const cached = localStorage.getItem('spr_username'); if(cached){ const ok = await validateCachedUsername(cached); if(ok){ if(!mounted) return; setUsername(cached); const b = await getUserBest(); if(mounted) setBest(b); refreshLeaderboard(); return; } else { localStorage.removeItem('spr_username'); } } if(mounted){ setShowNameModal(true); setNameMode('claim'); } } catch(e){} })(); return ()=>{ mounted=false; }; }, []);
  useEffect(()=>{ const unsub = subscribeTop(10,(entries:LeaderboardEntry[])=>setLiveTop(entries)); return ()=>unsub(); },[]);
  useEffect(()=>{ const unsub = subscribeSelfRank(r=> setSelfRankLive(r)); return ()=>{ try{unsub();}catch{} }; },[]);
  function refreshLeaderboard(){ fetchTop().then((ls:LeaderboardEntry[])=>{ leaderboardRef.current = ls; }); fetchSelfRank().then((r:{rank:number;bestScore:number}|null)=>{ selfRankRef.current = r; if(r && r.bestScore>best) setBest(r.bestScore); }); }
  useEffect(()=>{ if(gameState==='GAMEOVER'){ submitScore(score).then(updated=>{ if(typeof updated==='number') setBest(updated); refreshLeaderboard(); }); } },[gameState,score]);

  async function handleNameSubmit(){ setNameError(null); const cleaned = sanitizeUsername(nameInput); if(cleaned.length<3){ setNameError('Min 3 chars, a-z 0-9 _'); return; } setNameBusy(true); try { await ensureAnonAuth(); const uid = (await ensureAnonAuth()).uid; const ok = await registerUsername(cleaned, uid); if(!ok){ setNameError('Taken or failed. Try another.'); return; } setUsername(cleaned); setShowNameModal(false); const b = await getUserBest(); setBest(b); refreshLeaderboard(); } finally { setNameBusy(false); } }
  async function onChangeUsername(){ setNameMode('change'); setNameInput(username||''); setNameError(null); setShowNameModal(true); }

  useEffect(()=>{ function handleKey(e:KeyboardEvent){ if(e && e.code==='Space') e.preventDefault(); if(showNameModal) return; if(gameState==='MENU'){ startGame(); return; } if(gameState==='GAMEOVER'){ startGame(); return; } if(gameState!=='RUN') return; if(cooldown>0) return; setPhase(p=> p==='SOLID'? 'GHOST':'SOLID'); setCooldown(300); }
    function clamp(x:number,a:number,b:number){ return Math.max(a, Math.min(b,x)); }
    function pointerPos(e:PointerEvent|TouchEvent|any){ const rect = canvasRef.current!.getBoundingClientRect(); const cx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left; const cy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top; return {x:cx,y:cy}; }
    function onPointerDown(e:any){ if(showNameModal) return; const {x,y} = pointerPos(e); dragRef.current = { active:true,startX:x,startY:y,moved:false,t0:performance.now() }; if(gameState==='MENU'){ startGame(); return; } if(gameState==='GAMEOVER'){ startGame(); return; } }
    function onPointerMove(e:any){ if(!dragRef.current.active) return; const {x} = pointerPos(e); const dx = x - dragRef.current.startX; if(Math.abs(dx)>6) dragRef.current.moved = true; player.current.x = clamp(x, player.current.r+8, 420 - player.current.r - 8); }
    function onPointerUp(){ if(!dragRef.current.active) return; const wasTap = !dragRef.current.moved && performance.now() - dragRef.current.t0 < 220; dragRef.current.active = false; if(gameState!=='RUN') return; if(wasTap && cooldown===0){ setPhase(p=> p==='SOLID'? 'GHOST':'SOLID'); setCooldown(300); } }
    window.addEventListener('keydown', handleKey as any); const cEl = canvasRef.current!; cEl.addEventListener('pointerdown', onPointerDown,{passive:false} as any); cEl.addEventListener('pointermove', onPointerMove,{passive:false} as any); cEl.addEventListener('pointerup', onPointerUp,{passive:false} as any); cEl.addEventListener('pointercancel', onPointerUp,{passive:false} as any); cEl.addEventListener('pointerleave', onPointerUp,{passive:false} as any); return ()=>{ window.removeEventListener('keydown', handleKey as any); cEl.removeEventListener('pointerdown', onPointerDown as any); cEl.removeEventListener('pointermove', onPointerMove as any); cEl.removeEventListener('pointerup', onPointerUp as any); cEl.removeEventListener('pointercancel', onPointerUp as any); cEl.removeEventListener('pointerleave', onPointerUp as any); };
  },[gameState,cooldown,showNameModal]);

  return (
    <div className="container" style={{display:'flex', flexDirection:'row', justifyContent:'center', gap:32, alignItems:'flex-start', padding:16, background:'transparent'}}>
      <aside style={{width:240, fontFamily:'system-ui,-apple-system,Segoe UI,Roboto', color:'#fff'}}>
        <h1 style={{fontSize:22, margin:'0 0 8px'}}>
          <span style={{color:'#ffffff'}}>Shadow Phase Runner</span>
        </h1>
        <div style={{fontSize:13, lineHeight:'1.4', opacity:0.9, marginBottom:12}}>
          <div>Tap / Space: phase</div>
          <div>Drag: move</div>
          <div>Collect orbs, avoid wrong phase</div>
        </div>
        <div style={{fontSize:13, marginBottom:8, opacity:0.85}}>
          {username ? `You: ${username}` : 'Claiming username...'} {selfRankLive && `• Rank #${selfRankLive.rank}`}
        </div>
        <button onClick={onChangeUsername} disabled={changing} style={{fontSize:12, padding:'4px 10px', cursor:'pointer', borderRadius:4, border:'1px solid #555', background:'#1e1e1e', color:'#fff'}}>Change Name</button>
        <div style={{marginTop:24, fontSize:12, opacity:0.6}}>High Score: {best}</div>
      </aside>
      <div style={{position:'relative'}}>
        <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:16, boxShadow:'0 8px 30px rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.1)'}} />
      </div>
      <aside style={{width:240, fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', color:'#fff', position:'sticky', top:16}}>
        <h2 style={{fontSize:20, margin:'0 0 12px'}}>Top 10</h2>
        <ol style={{listStyle:'none', padding:0, margin:0, fontSize:14, lineHeight:'1.5em'}}>
          {liveTop.length === 0 && <li style={{opacity:0.6}}>{username? 'No scores yet (play!)':'Loading...'}</li>}
          {liveTop.map((e,i) => (
            <li key={e.username} style={{display:'flex', justifyContent:'space-between', background:'rgba(255,255,255,0.05)', padding:'3px 8px', borderRadius:4, marginBottom:4, border: username===e.username? `1px solid ${UI_ACCENT}`:'1px solid transparent'}}>
              <span>{i+1}. {e.username}</span>
              <span style={{opacity:0.85}}>{e.bestScore}</span>
            </li>
          ))}
        </ol>
        {selfRankLive && selfRankLive.rank > 10 && (
          <div style={{marginTop:12, fontSize:12, opacity:0.85}}>Your Rank: #{selfRankLive.rank} • Best {selfRankLive.bestScore}</div>
        )}
        {username && !liveTop.find(e=>e.username===username) && liveTop.length>0 && (
          <div style={{marginTop:8, fontSize:12, opacity:0.65}}>Score more to enter Top 10!</div>
        )}
      </aside>
      {showNameModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
          <div style={{background:'#14171c', padding:'24px 28px', borderRadius:12, width:320, boxShadow:'0 8px 30px rgba(0,0,0,0.4)', fontFamily:'system-ui,-apple-system,Segoe UI,Roboto', color:'#fff'}}>
            <h3 style={{margin:'0 0 12px', fontSize:18}}>{nameMode === 'claim' ? 'Choose a Username' : 'Change Username'}</h3>
            <p style={{margin:'0 0 12px', fontSize:13, opacity:0.8}}>
              {nameMode === 'claim' ? 'Pick a unique name or your existing username.' : 'Enter a new unique name.'}
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNameSubmit(); } }}
              placeholder="username"
              style={{width:'100%', padding:'8px 10px', borderRadius:6, background:'#1f2329', border:'1px solid #333', color:'#fff', fontSize:14, outline:'none'}}
            />
            {nameError && <div style={{marginTop:8, fontSize:12, color:'#ff5d5d'}}>{nameError}</div>}
            <div style={{display:'flex', gap:8, marginTop:18}}>
              <button disabled={nameBusy} onClick={()=>{ setShowNameModal(false); if(!username){ setNameMode('claim'); } }} style={{flex:1, background:'none', border:'1px solid #444', color:'#ddd', padding:'8px 0', borderRadius:6, cursor:'pointer', fontSize:13}}>Cancel</button>
              <button disabled={nameBusy} onClick={handleNameSubmit} style={{flex:1, background:UI_ACCENT, border:'1px solid #1d4ed8', color:'#000', padding:'8px 0', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:600}}>{nameBusy? 'Saving...' : (nameMode==='claim'?'Save':'Update')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
