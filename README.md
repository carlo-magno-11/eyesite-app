# EYESI+E

App inmobiliaria (React Native + Expo SDK 57 + Expo Router v3 + Supabase + pnpm).

## Correr

Instalar dependencias:

```bash
pnpm install
```

Correr con límite de red + caché limpia (recomendado):

> Correr con `npx expo start --clear --tunnel` para evitar error 192.168.1.64 (ExpoAsset.downloadAsync vector-icons / Unmatched Route).

```bash
npx expo start --clear --tunnel
```

Alternativa sin túnel (solo red local):

```bash
npx expo start --clear
```

## Flujo de onboarding

```
/ (index)          -> Redirect a /(auth)/login
/(auth)/login      -> signInWithPassword (AuthGate decide destino)
/(auth)/register   -> signUp -> /(auth)/create-profile
/(auth)/create-profile -> guarda perfil (estado/status = 'pendiente') -> /terms
/terms             -> acepta -> AuthGate: pendiente/rechazado -> /pending | /denied ; activa -> /(tabs)
/pending           -> cuenta en revisión (WhatsApp 999 746 2162)
/denied            -> cuenta rechazada
```

- `profile.estado` acepta: `pendiente` | `activa` | `rechazado` (NO `aprobado`).
- AuthGate usa `useSegments()` + comparación de ruta antes de cada `router.replace` para evitar loops; guard `loading || termsOk === null`.

## Supabase

- Verificación real de columnas `public.profiles`: `pnpm tsx scripts/check-profiles.ts`
- Proyecto activo: `xhvpvpvtkdgnnxdwdrkn` (solo anon key; nunca service_role).