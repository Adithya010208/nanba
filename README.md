# Nanba Chat

A private, two-person communication app. React, TypeScript, Vite, Tailwind CSS and Supabase. Deployment target: Vercel.

## Current checkpoint

Phase 1: application foundation and interface. **Not a complete production app yet.**

Implemented: responsive sign-in page, desktop and mobile workspace, conversation empty state, media/files/calls/saved/notes views, search interface, attachment draft selection, emoji insertion, local theme selection and browser notification permission request. Sign-in uses Supabase Auth with normalized `username@nanba.internal` identities and checks for a profile before allowing the workspace. Authorization must also be enforced in the database; frontend checks alone are insufficient.

Messaging, media upload, call setup, profile changes, notes and privacy controls are intentionally unavailable until their secure backend phases are implemented. No sample conversations, fake receipts, fake presence or fake calls are used.

## Local development

Requires Node.js 22.12 or later.

```sh
npm ci
cp .env.example .env.local
# Fill in your Supabase URL and public publishable key.
npm run dev
```

Open http://127.0.0.1:3000. The user-supplied public connection details are already in the ignored local environment file in this workspace.

To inspect the interface before account provisioning, open http://127.0.0.1:3000/chat?preview=design. This is available **only in development**, explicitly labeled as a design preview, and contains no backend data. It does not grant access to Supabase or exist in the production build.

```sh
npm run lint
npm run build
```

## Required next step: Supabase access

The requested project is `rrwmdouffeiguwxuzspl`. It is not visible in the currently connected Supabase account. The public publishable key cannot create database tables, policies, private buckets, approved users, or Edge Functions.

Connect the owning account/organization through the Supabase plugin. The next phase creates approved profiles for exactly two users, with usernames `adith` and `nanba` unless changed. Passwords must be set securely in Supabase Authentication; do not paste passwords into chat or source files. Public signup must be disabled.

Do not deploy this checkpoint as a finished communication app. Database provisioning, RLS, realtime authorization, private storage, calling and cross-network verification are required first.

## Calling and zero-cost target

WebRTC can connect directly using STUN. TURN relay fallback is needed when direct connectivity is blocked. Metered Open Relay currently advertises a free 20 GB monthly TURN allowance, requiring an account: https://www.metered.ca/tools/openrelay/. A free tier is finite and does not guarantee unlimited zero-cost use or connection quality. Its API key must be held in a server-side Supabase Edge Function, never in a `VITE_` variable. No paid service has been enabled.

## Deployment configuration

After the remaining phases are finished, import the repository into Vercel as a Vite project. Build command: `npm run build`. Output directory: `dist`.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel. The supplied `NEXT_PUBLIC_` names have been converted to Vite's `VITE_` convention. Never place service-role keys, database passwords or TURN API secrets in frontend environment variables.

The `vercel.json` provides SPA routing and security headers. Its content security policy currently permits only the selected Supabase project and must be reviewed when backend/calling behavior changes.

## Development phases remaining

Follow the user's original brief in order: secure auth/profiles → conversation schema/RLS → realtime text → receipts → presence/typing → message actions → private images → other media → voice notes → galleries/search/saved → call signalling → voice WebRTC → TURN → video → screen sharing → call history → notifications → PWA → notes/links → settings → security audit → cross-device testing → production release.
