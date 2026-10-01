# EYESITE — Runtime audit findings 2026-09-25

## Scope
Candidate branch: `fix/eyesite-platform-security-20260925`
PR: #27
Base: `release/eyesite-definitive`
Production `main` remains untouched.

## CI
GitHub Actions run #474 for commit `c87f191851f0fab67ff52398ba306b8fff7a14fd` completed successfully.
The `native-config` checks and the Web export passed.

## Supabase runtime state
- Project: `terrenos Yucatan`
- Active published properties: 10
- Properties with coordinates: 3
- Auth users: 6
- Confirmed users: 5
- Unconfirmed users: 1
- Registered Expo push tokens: 0

## Security advisor
Current warnings:
1. Leaked-password protection is disabled in Supabase Auth. This requires enabling the Auth setting before final release.
2. `pg_net` is installed in `public`; do not move it blindly because scheduled communications may depend on it.
3. SECURITY DEFINER RPCs remain executable by `authenticated`, but the audited admin RPC set contains an `is_admin` guard. No blanket revoke was performed because the admin panel intentionally invokes these RPCs through authenticated sessions.
4. Five RPC-only tables have RLS enabled without direct policies; this is intentional for protected server-side access.

## Legacy storage finding
The legacy bucket `fotos-propiedades` still contains 42 objects (~3.7 MB).
One currently active property (`58ba73`) still has a legacy video reference in its `videos` array, while its primary `video_url` and other current media already use `eyesite-media`.
The referenced legacy object exists at:
`videos/1788646042577-portada.mp4`

No legacy object or live property reference was deleted during this audit. The next safe step is a controlled migration/removal of the duplicate legacy reference, followed by verification, rather than deleting the bucket.

## Release blockers still open
- Enable leaked-password protection in Supabase Auth.
- Perform physical iOS, Android and Web runtime checks.
- Perform a real push-notification E2E after a device registers an Expo push token.
- Resolve the remaining legacy media reference through a controlled migration/verification.
- Run the final production build and test the resulting iOS binary before App Store submission.

## Rule
Do not merge PR #27 into `release/eyesite-definitive` or `main` until the blockers above are closed and verified.
