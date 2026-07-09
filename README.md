# RideConverge — Web App

The shareable-link version of RideConverge: one person creates a trip, sends
the link, everyone else drops a pin from their own device, and the matching
engine (`lib/matcher.ts`) clusters riders into cars minimizing total detour.

## Stack

- Next.js 14 (App Router) + TypeScript
- Leaflet / react-leaflet for the map (no API key required — OpenStreetMap tiles)
- File-based JSON store for now (`lib/store.ts`) — see note below

## Running locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, create a trip, then open the trip URL in a
second browser tab (or send it to a friend) to simulate a second person
joining. That's the "real, not hardcoded, multi-user input" requirement —
each participant hits the API independently, the same way it'll work once
deployed.

## How the logic connects to the UI

1. `POST /api/trips` — create a trip with a destination
2. `POST /api/trips/[id]/participants` — anyone with the link adds themselves
   as a driver (capacity) or rider (arrival deadline), pin dropped on the map
3. `GET /api/trips/[id]/results` — runs `matchRidersToCars()` (the Day 1
   algorithm, unchanged) against everyone who's joined so far
4. The trip page re-renders the map with colored routes per car

## Storage: now deploy-ready

`lib/store.ts` automatically picks a backend:
- **No `KV_REST_API_URL`/`KV_REST_API_TOKEN` set** → local JSON file
  (`data/trips.json`). This is what runs when you just `npm run dev` on
  your own machine with no cloud setup.
- **Those env vars set** → Vercel KV (Upstash Redis via REST). This is
  what runs once deployed. Nothing else in the codebase changes — same
  four functions, same call sites in every API route.

## Deploying (steps only you can do — I don't have access to vercel.com or your accounts)

1. **Push this to GitHub.** Create a new repo, then from this folder:
   ```bash
   git init
   git add .
   git commit -m "RideConverge: carpool clustering via nearest-insertion optimization"
   git remote add origin <your-new-repo-url>
   git push -u origin main
   ```
2. **Import into Vercel.** vercel.com → Add New Project → import that
   GitHub repo. Framework preset auto-detects as Next.js — no config needed.
3. **Attach a KV store.** In the project's Vercel dashboard: Storage tab →
   Create Database → KV. Vercel automatically injects
   `KV_REST_API_URL`/`KV_REST_API_TOKEN` into the project's environment —
   you don't need to copy/paste anything.
4. **Redeploy** (Vercel does this automatically after attaching storage,
   or trigger it manually from the Deployments tab).
5. **Test the live link yourself first** — create a trip, open the trip
   URL on your phone (not localhost), add yourself as a rider, confirm it
   shows up when you refresh on your laptop. That confirms KV is actually
   being used, not the file fallback.

## Testing with real people (Day 4)

Once the live link works from your phone, send it to 3-4 classmates and
have each of them drop their real pickup pin and join as themselves. That's
what satisfies "real/realistic input, not hardcoded" for the submission —
screen-record that session for the demo video.
