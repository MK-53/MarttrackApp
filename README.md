# MartTrack

Offline-first shop tracker (stock, sales, returns, profit) built with Expo / React Native.
The original “My shop” data remains on-device. Optional shared stores use the Express API and
the project's existing PostgreSQL connection. One PC runs the API for a shop's shared store;
phone-based hosting is not enabled.

## Layout

- `artifacts/marttrack` – the mobile app (Expo). The real app is in `legacy/`.
- `artifacts/api-server` – Express API for shared stores and AI Briefing.
- `lib/db` – Drizzle + Postgres schema (briefings, stores and store members).
- `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` – OpenAPI spec and generated client/validators.

## Requirements

Node 22+ (24 recommended), pnpm 10.16+, and PostgreSQL (for shared stores and AI Briefing).

## Run the app

```bash
pnpm install              # first run also creates a fresh pnpm-lock.yaml
pnpm app:dev              # then scan the QR code with Expo Go, or press a / i
```

The app works fully offline without the API. The first-run “My shop” continues to use the
original local data key; creating a shared store does not move that data. Tests:
`pnpm --filter @workspace/marttrack test`.

## Run a shared-store host

Set `DATABASE_URL` to the existing PostgreSQL database in an untracked
`artifacts/api-server/.env` file. Do not commit it. If the Neon credential has been exposed, rotate
it with Neon and update the project secret before starting the host.

Apply the additive `stores` and `store_members` schema changes, then run the API on the PC that
will host the shop:

```bash
pnpm db:push
pnpm api:dev
```

The API listens on port `8080`. Keep the PC and phones on the same trusted shop Wi-Fi, allow
inbound connections to that port on the PC's private-network firewall, and enter the PC's LAN
address (for example `http://192.168.1.20:8080`) in MartTrack's **Create a store → PC host**
screen. The owner can then display a one-time QR invitation; each seller scans it and joins with
their name and device PIN. Invitations expire after 10 minutes and can be redeemed once.

Only owners can add or edit stock, correct batches, process returns, change settings, or manage
team roles. Sellers can see the item/stock list and record sales. Seller snapshots omit cost,
profit, supplier, and edit-history data. A disconnected shared store is read-only; sales and
restocking resume only after the host reconnects.

### Test concurrent sales over HTTP

With a development API and its database running, opt in to creating a disposable test store:

```bash
STORE_HOST_URL=http://127.0.0.1:8080 STORE_SMOKE_CREATE=1 pnpm api:store-smoke
```

The script adds seven units, sends 25 one-unit sales concurrently, and verifies that exactly
seven succeed and no stock is oversold. It prints the test store ID; remove that disposable row
afterward with `DELETE FROM stores WHERE id = '<printed-id>'` (member rows cascade).

## Shop Wi-Fi verification

Before relying on shared stores, test with the actual PC and at least two phones: create the
store on the owner phone, scan an invite from the seller phone, verify that the seller cannot
see owner financial screens, record sales from both phones at the last units of stock, switch
stores, and disconnect/reconnect the host. When the host is unreachable, confirm both phones
show the saved snapshot as read-only. The shared API currently uses HTTP on a private LAN, so
use a trusted WPA2/WPA3 network and do not expose port `8080` to the public internet.

Users enter their own OpenAI / Anthropic / Gemini key in Settings; the server never stores those
keys.

## Deploy the API

Any Node host works for the AI Briefing service. For a local shop host, run the API on the
shop's PC instead. Set `DATABASE_URL`, then:

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
