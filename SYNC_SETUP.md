# GameVault cross-device sync (v1.3.0)

**Service:** your existing Sidequest Supabase project, but a **separate** table (\`public.gamevault_games\`). Both apps can use the same Supabase Auth login. They do not share workout and game data.

**No installations:** configure this entirely in the browser. The app remains usable without cloud configuration and independently of ChatGPT Plus.

## One-time setup

1. Make a JSON backup from GameVault on *every device* that has records (Settings → Export backup). Back up Sidequest separately too.
2. Open https://supabase.com/dashboard and select your existing **Sidequest Supabase project**.
3. Open **SQL Editor → New query**. Copy all of [supabase/gamevault.sql](supabase/gamevault.sql), paste and run it. This creates GameVault's private game table and its conflict-safe write function. **Do not rerun/reconfigure Sidequest's SQL.**
4. In your Supabase project's API/Connect settings, copy the **Project URL** and **publishable / anon key**. Never copy a **secret, service_role key, database password or user password** into GitHub or chat.
5. In GameVault → **Cloud sync**, enter the public URL/key, then sign in using the **same app login as Sidequest**.
6. On your second device, open the GameVault website, use **Cloud sync**, enter the same public project settings and sign in to that same account. Hit **Sync now**. Repeat on the first device.
7. Observe “Up to date”, 0 queued changes, and matching titles on both devices. Try adding a unique test game on device A and confirming it arrives on device B (while both have GameVault open).
8. Keep exporting occasional JSON backups. Supabase Free projects may pause after inactivity.

## How sync behaves

- GameVault stores games in IndexedDB locally. Saves and deletions are queued with a revision number.
- The cloud engine stays mounted as part of the app after configuration. It pulls remote rows, uploads queued edits, and merges non-conflicting cloud edits every 30 seconds **while the app is open**, and when it regains focus or internet. Use **Sync now** to force a check and review its result.
- **Important:** Background sync after closing the app is not guaranteed. The service cannot fix a Sidequest-specific login or configuration issue; those require a separate check.
- If two devices change the same record independently, a conflict asks **Keep this device** or **Use cloud**. Neither record is silently overwritten.
- Cloud deletions are stored as tombstones so the game isn't resurrected by a stale offline device.
- An older local GameVault collection merges into your account by game ID. Different records with the same ID are treated as conflicts. A unique local record is added.
- Passwords go only to Supabase Auth over HTTPS and are never stored in GitHub. Login tokens are held by Supabase's browser client. The public project URL and publishable key are browser-local settings; per-user RLS isolates data.
- If the project is paused or internet is lost, local edits stay queued. The status makes failed sync explicit.

## Troubleshooting

- **“relation ... does not exist” or “function gamevault_write not found”**: run \`supabase/gamevault.sql\` in the correct Supabase project. The file must be run in SQL Editor; uploading it to GitHub does not create any tables.
- **“Invalid login credentials”**: use the same Supabase Auth app user as Sidequest, not your dashboard login or GitHub login.
- **RLS/permission errors**: verify SQL completed, you have authenticated with the correct project, and RLS policies remain enabled.
- **Device doesn't update**: both devices must use the same project URL and login. Open Cloud sync and tap **Sync now** on both. Pending changes/conflicts must be resolved.
- **Data missing immediately after sign-in**: inspect your downloaded backups before making changes. A different URL, login, installation origin or un-synced Sidequest-style local copy can explain empty records.
- **Free project paused**: resume it in Supabase dashboard.
- **Old local build**: refresh while online, then relaunch. Don't clear browser data until both cloud and JSON backups have been verified.
- **Data never appeared on another device**: cloud sync is not a background service when the browser tab/app is closed; reopen the panel and check status.

## Limits

This is an optional first cloud release. It handles conflict-safe per-game saves, deletes, and manual/device-open synchronization, but not real-time push notifications with a closed app. RAWG and Wikipedia image URLs are still external links, not uploaded images. The sync table stores records, not media files.

**Never commit your login, password or secret key to a public GitHub repository.**
