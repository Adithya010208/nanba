# NANBA CHAT — launch and verification

## Current status

The source app and its Supabase schema are implemented. The approved private realtime update is applied and verified, and public signup is confirmed disabled. Release is **pending** confirmation of the Realtime dashboard switch, visual verification and real device tests below. Do not describe it as fully production-verified yet.

This is a local Vite/React project. It has not been pushed to GitHub or deployed to Vercel, as requested. Your existing Supabase project `rrwmdouffeiguwxuzspl` (`nabachat`) contains the backend setup. Usernames are `karupu` and `sai`; passwords are the ones you created in Supabase Auth and are not stored in this repository.

## 1. Required Supabase settings

Open the project dashboard and disable **Authentication → Sign In / Providers → Allow new users to sign up**. No signup UI exists, and unapproved identities are denied by database RLS independently of this setting, but signup must also be disabled at the Auth service.

Disable **Realtime → Settings → Allow public access**, or confirm it is already off. The frontend channels are private; `22_channel_hardening.sql` was applied after your explicit approval. Membership-scoped chat/call/action/collection policies and personal-item realtime publications are verified. All those tables retain RLS. Public signup was independently verified disabled on October 14, 2026.

Supabase's security advisor reports leaked password protection disabled. Enable it if your current plan supports it; do not upgrade to a paid plan solely for this setting without deciding to do so. Use strong passwords. No paid subscription has been enabled by this build.

Check that both existing Auth accounts are confirmed and retain their approved profile rows. Do not add profile rows for other accounts; unique slots restricted to 1 and 2 enforce the approval limit. No frontend role can insert or delete profiles or membership rows.

## 2. Local launch

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run lint
npm run build
npm run dev
```

Open http://127.0.0.1:3000. The ignored `.env.local` already contains the public Supabase details you supplied. On another checkout, copy `.env.example` to `.env.local` and fill in the two public values.

The development-only `/chat?preview=design` route lets you inspect the layout without credentials. It contains no synthetic messages or simulated connections, cannot access private database data, and is removed from the production build.

Phones need an HTTPS deployment for microphone, camera, PWA installation and screen-sharing permissions. Localhost exceptions apply to the current laptop, not a phone opening the laptop's LAN address over HTTP.

## 3. Vercel deployment

1. Push this folder's Git repository to your chosen private GitHub repository. No remote is configured yet.
2. Import it into Vercel, select the **Vite** framework, and use `npm run build` with output directory `dist`.
3. Set these environment variables for the target environment:

```text
VITE_SUPABASE_URL=https://rrwmdouffeiguwxuzspl.supabase.co
VITE_SUPABASE_ANON_KEY=<your public publishable key>
```

4. Deploy, then add the HTTPS application URL to the Supabase Auth site URL/redirect allowlist. Password-based login does not need an email redirect, but the project configuration should match the application.
5. Use the generated HTTPS URL on both phones and grant microphone/camera permission when starting or accepting a call.
6. Inspect Vercel response security headers and perform the checklist below before calling this a release.

`APP_URL` in the example file is a documentation/server configuration value. Frontend code uses Vite's `VITE_` convention, so the supplied `NEXT_PUBLIC_` names were converted. Never expose a service-role key, JWT signing secret, database password or TURN API key to the frontend.

## 4. Unlimited-duration calling

The default is direct WebRTC with STUN. The app imposes **no duration limit on a connected call**. Connection, permission and unanswered-call timeouts do not limit an established call's length. Calls consume the participants' normal internet/mobile data and depend on both networks and browsers.

Some carrier NATs or restricted networks block direct connectivity. The optional TURN fallback is fetched by the authenticated `turn-credentials` Supabase Edge Function, which additionally requires an approved profile. Without relay secrets, it returns direct STUN configuration. No private relay secret is present in the client.

For optional Metered relay support, set server-side Supabase Edge Function secrets `TURN_API_KEY` and `TURN_API_URL` (`https://<your-app>.metered.live/api/v1/turn/credentials`, without its API-key query). The function accepts only HTTPS Metered credential endpoints. Metered advertises 20 GB/month free, not unlimited relay use. Direct calls do not consume that relay allowance. Cross-carrier reliability cannot be guaranteed without testing your phones; paid services have not been configured.

## 5. Verification already performed

- Strict TypeScript build and ESLint checks have passed during implementation; see the delivery report for the final checkpoint.
- Transactional database tests passed for approved-member access, unapproved-identity isolation across all app tables, sender impersonation denial, sender receipt forgery denial, recipient edit denial, real receipt updates, redaction on deletion, and caller/receiver call-state ownership.
- Test messages and calls were rolled back; no fabricated history remains.
- RLS is enabled on every application table; `chat-media` is private.
- Production dependency audit reported zero vulnerabilities. A low-severity Windows development-tool advisory was patched in esbuild.
- `.env.local` is ignored by Git.

SQL tests simulate JWT subjects at the database boundary; they are **not** a completed browser sign-in test with a newly created third Auth account. A third-account browser/API test remains part of release verification.

## 6. Mandatory real-device checklist

Use `karupu` on the laptop/first phone and `sai` on the second phone. Use existing passwords; never paste them into source or chat.

- Login, logout, refreshed session, rejected credentials and an unapproved third Auth account.
- Online/last seen, typing, a new incoming message, actual delivered state, actual read state only while the chat is active, and read-receipt suppression.
- Reply, edit, delete for me, delete for everyone, reactions, save, pin, copy, search, and upward pagination.
- JPG/PNG, video, PDF, audio, voice recording preview/cancel/send, file-size/type rejection, cancel/retry, private access, signed URL refresh and downloads.
- Voice and video call accept/reject/missed/end, mute, camera, front/rear switching where supported, duration, history, permission denial, reconnect and screen sharing.
- Same Wi-Fi, different Wi-Fi, Wi-Fi/mobile data and both phones on mobile data. Try both call directions. Run a longer connected call to confirm it is not ended by negotiation/ringing timeouts.
- Install the PWA on Android/Windows, test standalone layout, offline page and resumed connection. iOS screen sharing/install behavior is limited by the browser.
- Light/dark/system, profile avatar/name/status, password change, personal saved links, shared note edit conflict, large-file review, and unused-upload cleanup confirmation.

## 7. Known limits

- The app must be open to receive messages/call notifications. Closed-app push notifications are not implemented.
- Text and stored files use private access controls and transport encryption; they are not end-to-end encrypted. WebRTC transports media using the browser's encrypted media connection.
- Direct calls cannot be guaranteed on every carrier/network; TURN is currently optional and not configured unless you provide its server-side secrets.
- Last-seen display is suppressed by the preference in the app; approved members can currently still query the raw profile timestamp. This UI preference is not a database-level secrecy guarantee.
- A complete active device/session list is not available through the client. Other refresh sessions can be revoked, but already-issued access tokens remain valid until expiry.
- Cloud cleanup of an interrupted upload may need the explicit unused-upload cleanup action. That action is limited to your own unreferenced uploads older than an hour.
- Browser visual automation was blocked by the browser policy during this task. Desktop/mobile visual QA, actual browser media permissions and cross-network call quality are therefore not yet verified.
- Video thumbnails and local PIN lock are not implemented; both are optional enhancements.
- Upload limits are 20 MB for images and 50 MB for other files, including videos, to fit Supabase's free-plan global maximum. Your project may have a lower configured global limit. See https://supabase.com/docs/guides/storage/uploads/file-limits.
