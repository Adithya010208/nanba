# NANBA CHAT delivery report

Checkpoint: October 14, 2026. Source and backend implemented; deployment and hands-on acceptance remain pending. No GitHub push or Vercel deployment has been performed.

## A. Architecture

React, strict TypeScript, Vite and Tailwind application with Supabase Auth, Postgres RLS, private Storage, private Realtime channels and an authenticated Edge Function. WebRTC carries browser voice/video. The service worker caches public shell assets only. Feature hooks own authentication, conversation reconciliation, actions, uploads and call lifecycles; reusable components render them.

## B. Implemented features

- Two approved usernames, session restoration, approval validation, password change and logout.
- Realtime text, idempotent retries, actual delivery/read acknowledgements, typing, presence and cursor pagination.
- Replies, edits, personal hiding, redacted deletion for everyone, reactions, stars, one shared pin and copying.
- Private images, video, documents, audio and recorded voice notes; preview, progress, cancel, downloads and expiring signed links. Image limit 20 MB; other files 50 MB.
- Galleries, files, filtered search, personal saved links, shared notes with conflict detection and persisted call history.
- Voice/video invitations, accept/reject/end, mute, camera, camera switching, screen sharing, duration and connection/permission errors. No connected-call duration cutoff.
- Profile/avatar/status, light/dark/system appearance, notification and receipt preferences, storage review and cleanup of own unused uploads.
- Responsive desktop/mobile layouts, installable PWA manifest, public offline shell and browser notifications while the app is open.

These are implemented capabilities, not a claim that every browser/device combination has passed acceptance testing.

## C. Files created

See FILE-INVENTORY.txt for the complete source inventory, excluding dependencies, build output, Git internals and local secrets. Source features are under src/, backend snapshots under supabase/schema/, the relay function under supabase/functions/turn-credentials/, tests under scripts/ and supabase/tests/, and PWA assets under public/.

## D. Important changes

App.tsx and main.tsx initialize routes, authentication and PWA registration. Workspace.tsx coordinates real conversation state and call overlays. useConversation.ts reconciles database and optimistic state without losing receipts or reviving deleted content. useCalling.ts coordinates persisted call transitions with ephemeral WebRTC signaling. AuthProvider.tsx gates workspace access. media.ts validates/upload files and manages signed URLs. SettingsPanel.tsx and CollectionPage.tsx implement settings, storage and collections. styles.css contains the custom visual system. vercel.json contains routing/security headers. database.ts is generated from the actual backend.

## E. Database tables

profiles, conversations, conversation_members, messages, hidden_messages, starred_messages, message_reactions, pinned_messages, shared_notes, saved_links and calls. Exactly two unique approval slots and a singleton conversation constrain membership. Storage metadata remains in Supabase's storage schema.

## F. All RLS policies

The exact live policy definitions are exported in RLS-POLICIES.json. Schema source contains their creation plus integrity triggers and column grants.

| Table | Policies | Access rule |
| --- | --- | --- |
| profiles | profiles_read, profiles_own_update | Approved members read; own allowed fields update |
| conversations | conversation_read | Membership required |
| conversation_members | members_read | Membership required; no client provisioning |
| messages | messages_read, messages_send, messages_update | Members read; own sender insert; integrity trigger distinguishes sender edits from recipient receipts |
| hidden_messages | hidden_read, hidden_insert, hidden_delete | Owner and message access |
| starred_messages | starred_read, starred_insert, starred_delete | Owner and message access |
| message_reactions | reaction_read, reaction_insert, reaction_delete | Members read; own reactions mutate |
| pinned_messages | pin_read, pin_insert, pin_update, pin_delete | Conversation membership; valid live message |
| shared_notes | notes_read, notes_create, notes_update, notes_delete | Members; actor identity checked |
| saved_links | links_read, links_create, links_delete | Owner and conversation membership |
| calls | calls_read, calls_insert, calls_update | Members; caller owns initial invitation; trigger guards receiver acceptance and terminal transitions |
| realtime.messages | nanba_realtime_receive, nanba_realtime_send | Authenticated members on four exact private topics |

No anonymous application read/write policy exists. Approval/membership helpers use a non-exposed private schema, explicit grants and fixed search paths. RLS alone is complemented by constraints, restricted column grants and database triggers.

## G. Storage policies

chat-media is private. nanba_media_upload allows a member's own conversation/user folder. nanba_media_read requires membership plus ownership or a live message/avatar reference. nanba_media_remove permits only own unreferenced objects. There is no overwrite/update policy. URLs expire; the client renews them. MIME/extension/size/signature checks complement server metadata validation, but are not malware scanning.

## H. Authentication

Usernames karupu and sai map to existing synthetic Auth email identities. No passwords are stored in source. SDK sessions persist locally; approved profiles are revalidated. Public signup is disabled and independently checked. Unapproved subjects are denied by RLS even if an Auth account exists. Current password is reverified before changing it. Administrative credentials never enter the client.

## I. Realtime

Private topics are nanba:<conversation>, and :calls, :actions, :collections suffixes. Database events obey row policies. Presence/typing and SDP/ICE use transient channel events. Messages and call states persist in Postgres. Reconnect refreshes recent messages while preserving pending sends; older history remains paginated. The final channel migration was applied after explicit approval and verified against live policies/publications.

## J. WebRTC

The caller creates a persisted invitation; the receiver accepts with a state comparison to prevent competing devices taking ownership. The active browser negotiates RTCPeerConnection, exchanges offer/answer/ICE through private signaling and renders actual streams. Persisted terminal state and transient end signaling are attempted independently. Negotiation/ringing timeouts do not end an established call. Network recovery is implemented but requires device verification.

## K. TURN

Default: direct STUN, no relay subscription and no application call-duration limit. Some carrier NATs require TURN. The deployed turn-credentials function validates an authenticated approved member. Optional TURN_API_KEY and TURN_API_URL belong only in Edge Function secrets; no secret is configured in frontend. Free relay quotas are finite, so reliable unlimited free relay use is not promised. See DEPLOYMENT.md for the supported endpoint.

## L. Manual Supabase steps

Public signup is confirmed disabled. Confirm Realtime → Settings → Allow public access is off. Browser dashboard access requires your sign-in; no password was requested or entered. Use strong account passwords; leaked-password protection remains an advisor warning and may depend on the plan. Verify Storage's global file limit supports the app's 50 MB cap. Add the eventual HTTPS deployment to Auth configuration.

## M. Deployment

Create/select your private GitHub repository and push this app folder when ready. Import into Vercel as Vite; build npm run build, output dist. Configure the two public VITE_ variables, deploy over HTTPS and run the two-device acceptance checklist. No paid plan was enabled. Full instructions are in DEPLOYMENT.md.

## N. Environment

VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are public connection values. .env.local is ignored. TURN_API_URL/TURN_API_KEY are optional server-only secrets. Never add service-role keys, database passwords, signing secrets or account passwords to the frontend or repository.

## O. Tests

- Transactional database tests: approved/unapproved access, impersonation rejection, receipt ownership, recipient edit rejection, deletion redaction, approval-slot constraints and call-state ownership passed; changes rolled back.
- Personal hidden/starred/link records were verified invisible to the other approved member.
- Message reconciliation tests passed for receipt ordering, optimistic confirmation, deletion redaction and duplicate events.
- File-signature tests passed for valid headers and mismatched formats.
- Live anonymous profiles/messages/calls/notes/links checks, anonymous relay denial and disabled signup checks all passed.
- Dependency audit: zero reported vulnerabilities after the esbuild patch.
- Actual browser login, visual QA, media permissions, PWA installation and cross-network voice/video quality have not passed hands-on acceptance yet.

## P. Known limitations

Closed-app push, optional PIN and generated video thumbnails are absent. Text/files are not end-to-end encrypted. Direct mobile-network calls can fail without relay. Last-seen preference suppresses UI display, but the approved peer can still query the raw timestamp. There is no complete active-device list; revoked refresh sessions do not immediately invalidate issued access tokens. Interrupted uploads may need the explicit cleanup action. Hosting/storage quotas still apply. Browser automation was blocked by browser policy, so visual verification was not claimed. Fresh-database unused-index and RLS performance advisor notices remain; no critical security issue was reported by that advisor.

## Q. Production checklist

- [x] Source compiles, lint passes, database access tests pass.
- [x] Exactly two approved profiles, private bucket, private channel policies verified.
- [x] Public signup disabled and anonymous API checks pass.
- [ ] Confirm Realtime public access disabled in dashboard.
- [ ] Inspect desktop/mobile UI, accessibility, keyboard and touch behavior.
- [ ] Test both accounts, persistence, actions, uploads, receipts, search and notes across devices.
- [ ] Test calls in both directions on Wi-Fi/mobile and mobile/mobile, including a long call and permission failures.
- [ ] Install PWA and test reconnect/offline behavior.
- [ ] Push chosen repository, deploy HTTPS and verify deployed headers/configuration.

## R. Lint

npm run lint passed with no reported lint issues at the final code checkpoint.

## S. Build

npm run build passed: strict TypeScript and Vite production assets. dist is generated locally and excluded from source control. Final command output is retained in FINAL-CHECKS.txt.

## T. Launch instructions

From this folder: npm ci, npm run lint, npm run build, npm run dev. Open http://127.0.0.1:3000 and use either existing username with its existing password. For a new checkout, copy .env.example to .env.local and fill in the two public values first. For production use Vercel's Vite preset, the same build command, dist output and VITE_ environment names; phones need HTTPS for microphone/camera. DEPLOYMENT.md provides the complete acceptance and launch sequence.
