# Realtime lifecycle hardening — 2026-09-24

## Problem observed

Android and Web reproduced:

`cannot add postgres_changes callbacks ... after subscribe()`

The error was observed in the profile Realtime channel and previously in the user notifications channel.

## Root cause addressed

The channel lifecycle could overlap during authentication/session initialization or component remounts. A previous channel with the same topic could still be in the process of being removed while a new lifecycle attempted to configure the same topic.

The handlers were already placed before `.subscribe()`; this change additionally isolates each lifecycle with a unique channel instance name.

## Changes

- `hooks/useAuth.tsx`
  - Added a monotonic channel-generation counter.
  - Profile channels now use `profile-{uid}-{generation}`.
  - Existing cleanup and UID guard remain in place.
- `hooks/use-notifications.ts`
  - Added a monotonic channel-generation counter.
  - Notification channels now use `user-notifications-{uid}-{generation}`.
  - Existing cleanup, AppState reload, and fallback loading remain unchanged.

## Safety

- No database schema changes.
- No Supabase permissions changed.
- No property-query changes.
- `propiedades_publicas` remains untouched.
- `main` remains untouched.
- Changes are isolated on `fix/realtime-lifecycle-android-ios`.

## Validation required before APK

Run locally from the branch:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run test
pnpm lint
npx expo-doctor
npx expo start -c
```

Then verify Android and Web startup, profile updates, notifications, navigation, and the previously missing section. Only after those checks pass should a new preview APK be generated.
