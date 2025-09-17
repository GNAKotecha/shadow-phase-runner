
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"MENU" | "RUN" | "GAMEOVER">("MENU");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    try { return Number(localStorage.getItem("spr_best") || 0); } catch { return 0; }
  });
  const [phase, setPhase] = useState<"SOLID" | "GHOST">("SOLID");
  const [cooldown, setCooldown] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false, t0: 0 });

  const W = 420;
  const H = 720;

  const player = useRef({ x: W / 2, y: H * 0.75, r: 18 });
  const speedRef = useRef(260);
  const bandsRef = useRef<{ y: number; height: number; type: "RED" | "BLUE" }[]>([]);
  const orbsRef = useRef<{ x: number; y: number; r: number; type: "CYAN" | "MAGENTA"; taken: boolean }[]>([]);

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
    resetWorld();
    setGameState("RUN");
  }

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    function runTests() {
      let sawRed = false, sawBlue = false;
      for (let i = 0; i < 1000; i++) {
        const rng = Math.random();
        const t = rng <= 0.5 ? "RED" : "BLUE";
        if (t === "RED") sawRed = true; else sawBlue = true;
      }
      console.assert(sawRed && sawBlue, "RNG color should produce both RED and BLUE over many trials");
      const MIN_H = 40, MAX_H = 240;
      for (let i = 0; i < 200; i++) {
        const h = MIN_H + Math.random() * (MAX_H - MIN_H);
        console.assert(h >= MIN_H && h <= MAX_H, "Height outside guardrails", h);
      }
    }

    runTests();

    function spawnChunk() {
      const MIN_H = 40;
      const MAX_H = 240;
      const startY = Math.min(-40, ...bandsRef.current.map(b => b.y), -40) - 40;
      const n = 3 + Math.floor(Math.random() * 2);
      let lastY = bandsRef.current.length > 0 ? bandsRef.current[bandsRef.current.length - 1].y : startY;
      for (let i = 0; i < n; i++) {
        const h = MIN_H + Math.random() * (MAX_H - MIN_H);
        const speed = speedRef.current;
        const minGap = Math.max(170, speed * 0.5);
        const y = lastY - (h + minGap);
        lastY = y;
        const rng = Math.random();
        const type: "RED" | "BLUE" = rng <= 0.5 ? "RED" : "BLUE";
        bandsRef.current.push({ y, height: h, type });
        const orbType: "CYAN" | "MAGENTA" = type === "RED" ? "MAGENTA" : "CYAN";
        const orbY = y + h + Math.min(70, minGap * 0.45);
        const x = 40 + Math.random() * (W - 80);
        orbsRef.current.push({ x, y: orbY, r: 8, type: orbType, taken: false });
      }
    }

    function clearOffscreen() {
      bandsRef.current = bandsRef.current.filter(b => b.y < H + 60);
      orbsRef.current = orbsRef.current.filter(o => o.y < H + 60 && !o.taken);
    }

    function drawBackground(time: number) {
      ctx.fillStyle = phase === "SOLID" ? "#0b1220" : "#110b20";
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) {
        const alpha = 0.04 + i * 0.02;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const x = ((time * 0.05 + i * 60) % (W + 60)) - 60;
        ctx.fillRect(x, 0, 2, H);
      }
    }

    function drawPlayer() {
      const p = player.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = phase === "SOLID" ? "#79d0ff" : "#d079ff";
      (ctx as any).shadowColor = ctx.fillStyle as string;
      (ctx as any).shadowBlur = 18;
      ctx.fill();
      (ctx as any).shadowBlur = 0;
    }

    function drawBands() {
      bandsRef.current.forEach(b => {
        ctx.fillStyle = b.type === "RED" ? "#ff4a57" : "#4aa6ff";
        ctx.globalAlpha = phase === (b.type === "RED" ? "GHOST" : "SOLID") ? 0.35 : 0.9;
        ctx.fillRect(0, b.y, W, b.height);
        ctx.globalAlpha = 1;
      });
    }

    function drawOrbs() {
      orbsRef.current.forEach(o => {
        if (o.taken) return;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.type === "CYAN" ? "#6ee7ff" : "#e56eff";
        ctx.fill();
      });
    }

    function collide() {
      const p = player.current;
      for (const b of bandsRef.current) {
        if (p.y + p.r > b.y && p.y - p.r < b.y + b.height) {
          const correct = b.type === "RED" ? "GHOST" : "SOLID";
          if (phase !== correct) return true;
        }
      }
      return false;
    }

    function collect() {
      const p = player.current;
      for (const o of orbsRef.current) {
        if (o.taken) continue;
        const dx = o.x - p.x, dy = o.y - p.y;
        if (dx * dx + dy * dy <= (o.r + p.r) * (o.r + p.r)) {
          if ((o.type === "CYAN" && phase === "SOLID") || (o.type === "MAGENTA" && phase === "GHOST")) {
            o.taken = true;
            setScore(s => s + 5);
          }
        }
      }
    }

    function drawUI() {
      ctx.fillStyle = "white";
      ctx.font = "bold 20px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(`Score ${score}` as any, 16, 30);
      ctx.fillText(`Best ${best}` as any, 16, 56);
      ctx.fillStyle = phase === "SOLID" ? "#79d0ff" : "#d079ff";
      ctx.fillText(phase as any, W - 110, 30);
      if (cooldown > 0 && gameState === "RUN") {
        const t = Math.min(1, cooldown / 300);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(W - 150, 40, 120, 10);
        ctx.fillStyle = "white";
        ctx.fillRect(W - 150, 40, 120 * (1 - t), 10);
      }
      if (gameState === "MENU") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 34px system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillText("Shadow Phase Runner" as any, W / 2, H / 2 - 80);
        ctx.font = "20px system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillText(`Best ${best}` as any, W / 2, H / 2 - 42);
        ctx.fillText("Tap to start • Drag to move" as any, W / 2, H / 2);
        ctx.fillText("Tap/Space to phase" as any, W / 2, H / 2 + 26);
        ctx.textAlign = "start";
      }
      if (gameState === "GAMEOVER") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 36px system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillText("Game Over" as any, W / 2, H / 2 - 20);
        ctx.font = "20px system-ui, -apple-system, Segoe UI, Roboto";
        ctx.fillText(`Score ${score} • Best ${best}` as any, W / 2, H / 2 + 10);
        ctx.fillText("Tap to restart" as any, W / 2, H / 2 + 40);
        ctx.textAlign = "start";
      }
    }

    function step(ts: number) {
      if (!lastRef.current) lastRef.current = ts;
      const dt = Math.min(50, ts - lastRef.current);
      lastRef.current = ts;
      if (gameState === "RUN") {
        const v = (speedRef.current * dt) / 1000;
        bandsRef.current.forEach(b => (b.y += v));
        orbsRef.current.forEach(o => (o.y += v));
        clearOffscreen();
        setScore(s => s + Math.floor(dt / 40));
        speedRef.current += dt * 0.012;
        if (cooldown > 0) setCooldown(c => Math.max(0, c - dt));
        const lastB = bandsRef.current[bandsRef.current.length - 1];
        if (bandsRef.current.length < 3 || !lastB || lastB.y > 140) spawnChunk();
        if (collide()) {
          const newBest = Math.max(best, score);
          if (newBest !== best) {
            setBest(newBest);
            try { localStorage.setItem("spr_best", String(newBest)); } catch {}
          }
          setGameState("GAMEOVER");
        }
        collect();
      }
      drawBackground(ts);
      drawBands();
      drawOrbs();
      drawPlayer();
      drawUI();
      rafRef.current = requestAnimationFrame(step as any);
    }

    rafRef.current = requestAnimationFrame(step as any);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, phase, cooldown, score, best]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e && e.code === "Space") e.preventDefault();
      if (gameState === "MENU") { startGame(); return; }
      if (gameState === "GAMEOVER") { startGame(); return; }
      if (gameState !== "RUN") return;
      if (cooldown > 0) return;
      setPhase(p => (p === "SOLID" ? "GHOST" : "SOLID"));
      setCooldown(300);
    }

    function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }

    function pointerPos(e: PointerEvent | TouchEvent | any) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
      const cy = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
      return { x: cx, y: cy };
    }

    function onPointerDown(e: any) {
      const { x, y } = pointerPos(e);
      dragRef.current = { active: true, startX: x, startY: y, moved: false, t0: performance.now() };
      if (gameState === "MENU") { startGame(); return; }
      if (gameState === "GAMEOVER") { startGame(); return; }
    }

    function onPointerMove(e: any) {
      if (!dragRef.current.active) return;
      const { x } = pointerPos(e);
      const dx = x - dragRef.current.startX;
      if (Math.abs(dx) > 6) dragRef.current.moved = true;
      player.current.x = clamp(x, player.current.r + 8, 420 - player.current.r - 8);
    }

    function onPointerUp() {
      if (!dragRef.current.active) return;
      const wasTap = !dragRef.current.moved && performance.now() - dragRef.current.t0 < 220;
      dragRef.current.active = false;
      if (gameState !== "RUN") return;
      if (wasTap && cooldown === 0) {
        setPhase(p => (p === "SOLID" ? "GHOST" : "SOLID"));
        setCooldown(300);
      }
    }

    window.addEventListener("keydown", handleKey as any);
    const cEl = canvasRef.current!;
    cEl.addEventListener("pointerdown", onPointerDown, { passive: false } as any);
    cEl.addEventListener("pointermove", onPointerMove, { passive: false } as any);
    cEl.addEventListener("pointerup", onPointerUp, { passive: false } as any);
    cEl.addEventListener("pointercancel", onPointerUp, { passive: false } as any);
    cEl.addEventListener("pointerleave", onPointerUp, { passive: false } as any);
    return () => {
      window.removeEventListener("keydown", handleKey as any);
      cEl.removeEventListener("pointerdown", onPointerDown as any);
      cEl.removeEventListener("pointermove", onPointerMove as any);
      cEl.removeEventListener("pointerup", onPointerUp as any);
      cEl.removeEventListener("pointercancel", onPointerUp as any);
      cEl.removeEventListener("pointerleave", onPointerUp as any);
    };
  }, [gameState, cooldown]);

  return (
    <div className="container">
      <div className="text-center" style={{position:'absolute', top: 8, left:0, right:0}}>
        <h1 style={{fontSize: '20px', margin: 0}}>Shadow Phase Runner</h1>
        <p style={{opacity: 0.8, margin: 0}}>Tap to phase • Drag to move (portrait)</p>
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{borderRadius: 16, boxShadow:'0 8px 30px rgba(0,0,0,0.35)', border:'1px solid rgba(255,255,255,0.1)'}} />
    </div>
  );
}
