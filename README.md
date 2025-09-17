# Shadow Phase Runner

A fast, portrait-mode tap/drag arcade game built with React + TypeScript + Canvas.

## Features
- Tap or Space to **phase** between SOLID and GHOST
- **Drag** to move horizontally
- Random **RED/BLUE** lane bands with guardrails on height
- Always-spawned phase-orb between bands to signal required phase
- Score ramp + local **high score** (localStorage)
- Zero dependencies beyond React & Vite

## Requirements
- Node.js 18+ and npm

## Quickstart (Local Development)
```bash
npm install
npm run dev
```
Open the printed URL (typically http://localhost:5173).

## Production Build
```bash
npm run build
npm run preview
```
`npm run preview` serves the production build on a local static server.

## Deploying
**Vercel**: Import the repo → Framework: Vite → Build Command: `npm run build` → Output: `dist/`  
**Netlify**: Build Command: `npm run build` → Publish directory: `dist/`  
**GitHub Pages**: Build (`npm run build`), then push `dist/` to `gh-pages` branch or use an action that publishes `dist/`.

## Project Structure
```
shadow-phase-runner/
├─ public/               # static assets
├─ src/
│  ├─ App.tsx            # the game
│  ├─ index.css
│  └─ main.tsx
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## Development Notes
- The game uses a single `useEffect` loop for render/update and a second for input.
- `spawnChunk()` randomizes band color with `rng <= 0.5 ? RED : BLUE` and height clamped between `40..240` pixels.
- Orbs are spawned between bands and match the required upcoming phase.

## Optional: Docker
```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
```

Run:
```bash
docker build -t shadow-phase-runner .
docker run -p 4173:4173 shadow-phase-runner
```
