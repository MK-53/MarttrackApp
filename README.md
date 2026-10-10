# MartTrack

Offline-first React Native (Expo) app for shop inventory & profit tracking. Built with a domain-driven architecture featuring strict FIFO inventory costing, precise COGS & ROI math without state drift, complete audit history trails, and local AsyncStorage persistence with JSON/CSV export and PIN security.

Offline-first shop tracker (stock, sales, returns, profit) built with Expo / React Native.
Data lives on the device. The optional AI Briefing feature talks to a small Express API.

## Layout

- `artifacts/marttrack` – the mobile app (Expo). The real app is in `legacy/`.
- `artifacts/api-server` – Express API used only by the AI Briefing screen.
- `lib/db` – Drizzle + Postgres schema (stores briefing history).
- `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` – OpenAPI spec and generated client/validators.

## Requirements

Node 22+ (24 recommended), pnpm 10.16+, and Postgres (only for the API server).

## Run the app

```bash
pnpm install              # first run also creates a fresh pnpm-lock.yaml
pnpm app:dev              # then scan the QR code with Expo Go, or press a / i
```

The app works fully offline without the API. Tests: `pnpm --filter @workspace/marttrack test`.

## Run the API (for AI Briefing)

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env   # edit DATABASE_URL
export DATABASE_URL=postgres://...                               # needed for the next line
pnpm db:push                                                     # create tables
pnpm api:dev                                                     # http://localhost:8080
```

Then point the app at it:

```bash
cp artifacts/marttrack/.env.example artifacts/marttrack/.env.local   # set EXPO_PUBLIC_API_URL
```

Users enter their own OpenAI / Anthropic / Gemini key in Settings; the server never stores keys.

## Deploy the API

Any Node host works (Railway, Render, Fly.io). Set `DATABASE_URL`, then:

- Build: `pnpm install && pnpm --filter @workspace/api-server run build`
- Start: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Health check: `GET /api/healthz`

## Build an installable app

```bash
cd artifacts/marttrack
npm i -g eas-cli && eas login
eas build -p android --profile preview    # produces an APK
```

Edit `eas.json` first and replace `YOUR-API-URL-HERE` with your deployed API URL.
Bundle IDs are set to `com.marttrack.app` in `app.json`; change them if you want your own.
