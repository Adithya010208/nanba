# NANBA CHAT

A private communication app for exactly two approved people, built with React, strict TypeScript, Vite, Tailwind CSS, Supabase and WebRTC. Light mode is the default; dark/system themes are available.

## Start

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and sign in as `karupu` or `sai` using the password you created in Supabase. No password is present in this repository. The ignored local environment file already contains the public Supabase connection details you supplied. For a new checkout, fill in `.env.example` and save it as `.env.local`.

## Checks

```sh
npm run lint
npm run build
npm run check:public
npm audit
```

`check:public` requires the configured `.env.local` and an internet connection. It verifies that anonymous app access and relay credential requests are rejected and that public signup is disabled. All these checks passed on October 14, 2026.

## Features implemented in source

Username/password authentication, approval validation, session persistence, logout/password changes, realtime messages, send/retry states, delivery/read receipts, presence/typing, pagination, reply/edit/delete/reactions/save/pin/copy, private images/videos/audio/documents, upload progress/cancel, voice notes, galleries, search, saved links, shared notes with conflict detection, browser voice/video calling, mute/camera/screen sharing, history, profile/avatar/privacy/appearance settings, storage review/cleanup, browser notifications and installable PWA support.

There are no fabricated conversations, receipts, presence indicators, call connections or third-user signup screens.

## Status and release gates

The source build and database boundary tests have passed, but the product is **not yet fully production-verified**. The explicitly approved private realtime update is applied and verified, and public signup is disabled. Confirm the Realtime dashboard's public-access switch is off. Desktop/mobile visual verification and actual two-device/mobile-network calling tests remain mandatory.

Calls have no app-imposed duration limit. Direct WebRTC is the default. Some mobile/restricted networks need optional TURN fallback; unlimited reliable relay service for free is not promised. Text/files are private but not end-to-end encrypted. Notifications require the app to remain open.

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact launch, Vercel, Supabase, calling and test instructions, and [DELIVERY-REPORT.md](DELIVERY-REPORT.md) for architecture, security policies and known limits.

## Repository

- `src/`: app, reusable UI, auth/chat/media/call features, generated database types.
- `supabase/schema/`: SQL scripts used for the hosted setup. Hosted migration history is maintained by Supabase; these files are descriptive source snapshots, not CLI-generated migration filenames.
- `supabase/functions/turn-credentials/`: approved-user-only STUN/optional TURN configuration.
- `supabase/tests/access.sql`: transactional database access/ownership tests, rolled back after execution.
- `scripts/check-public.mjs`: anonymous API/configuration readiness checks.
- `public/`: brand icon, manifest, offline page and service worker.

No GitHub remote or Vercel deployment has been created. Keep `.env*` ignored except `.env.example`, and never expose administrative credentials or relay API secrets in the client.
