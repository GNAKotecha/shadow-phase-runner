# Shadow Phase Runner

A fast, portrait-mode tap/drag arcade game built with React + TypeScript + Canvas.

## Features
- Tap or Space to **phase** between SOLID and GHOST
- **Drag** to move horizontally
- Dynamic obstacle system with multiple obstacle archetypes (RectBand, Gate, ZigZag, MovingWindow, SplitRail, StaggeredBars)
- Weighted + progressive unlock logic (score & obstacle count thresholds)
- Fairness guardrails (cooldown-aware spacing, flip variety enforcement, spawn retry loop)
- Orbs require matching phase and reward score (phase reinforcing)
- Global **Firebase-backed leaderboard** (top 10 + personal rank)
- Anonymous auth + username claim (no password)
- Persistent best score stored in Firestore (no localStorage fallback)
- Per-run randomized neon phase color pair (player + orbs); background/UI stay dark
- Pure runtime randomness (seeded RNG removed to keep focus on play feel)

## Requirements
- Node.js 18+ and npm

## Quickstart (Local Development)
```bash
npm install
# copy env template
cp .env.example .env
# fill in Firebase values in .env (see below)
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
**GitHub Pages**: Already automated via GitHub Action on pushes to `main`.
**Vercel/Netlify**: Use `npm run build` and publish `dist/`.

## GitHub Pages Deployment
1. Ensure repo name matches the `base` in `vite.config.ts` (currently `/shadow-phase-runner/`).
2. Push to `main`. Action builds & deploys to Pages. 
3. GitHub Settings → Pages → Ensure Source = GitHub Actions (first time only).
4. Site: `https://<your-username>.github.io/shadow-phase-runner/`.
5. Custom domain: add CNAME in Pages settings, then add domain(s) to Firebase Auth (see below).

## Firebase Setup
1. Firebase Console → Create project → Add Web App (do NOT enable hosting if using GitHub Pages).
2. Copy the web config values into `.env` (see template). Optionally also fill `src/firebaseConfig.ts` for fallback public build.
3. Enable Authentication → Sign-in method → Anonymous (ON).
4. Add Authorized Domains: `localhost`, `127.0.0.1`, `<your-username>.github.io`, your custom domain(s).
5. Firestore → Create database → Production mode.
6. Rules: paste the rules below and Publish.

### Firestore Rules (basic)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function authed() { return request.auth != null; }

    match /users/{uid} {
      allow read: if true; // public leaderboard
      allow create: if authed() && request.auth.uid == uid;
      allow update: if authed() && request.auth.uid == uid;
      allow delete: if false;
    }

    match /usernames/{uname} {
      allow read: if true;
      allow create: if authed()
        && request.resource.data.keys().hasOnly(['uid'])
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    match /{other=**} { allow read, write: if false; }
  }
}
```

### Environment Variables (.env)
Copy `.env.example` to `.env` and fill:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MEASUREMENT_ID=...
```
These are public client config values (not secrets) but keep them out of version control if you prefer. The build injects them at compile time.

### GitHub Actions Secrets
Add the same keys (without surrounding quotes) in Repo Settings → Secrets → Actions:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

The workflow (`.github/workflows/pages.yml`) exports them to the build step.

### Username & Scores
- User signs in anonymously.
- User claims a unique lowercase username (stored in `usernames/{uname}` mapping doc and `users/{uid}` document).
- Score updates only write if higher than previous `bestScore`.
- Leaderboard query: top 10 by `bestScore desc`.
- Personal rank uses a `count()` aggregation of higher scores.

### Changing Username
`Change Name` button executes a transaction to reserve new username. Old username document remains (could be cleaned with a Cloud Function if desired).

## Development Notes
- Game loop + rendering all in a single `requestAnimationFrame` effect.
- Obstacle system uses registry + weighted random selection with fairness retries (pure Math.random now, seeded mode removed).
- Removed localStorage best score writes; Firestore is source of truth.
- NodeNext module resolution requires explicit `.js` in relative imports.

## Testing Checklist
- Username claim works and persists across reload.
- Game Over updates Firestore `bestScore` when higher.
- Leaderboard updates live across two browser windows.
- Rank updates after scoring higher.
- GitHub Action build passes with env vars populated.
- Obstacle progression unlocks over time (verify different archetypes appear as score climbs).

## Optional Improvements
- Secondary sort by `updatedAt` for tie-breaking.
- Offline indicator when Firestore calls fail.
- Cloud Function cleanup for abandoned username docs.
- Difficulty smoothing / late-game speed tuning.

## Docker (Optional)
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
