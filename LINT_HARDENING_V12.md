# EYESITE 4.11 — Lint hardening V12

Cambios aplicados después del `pnpm lint`:

- Eliminados setState síncronos detectados dentro de efectos; las cargas iniciales se difieren de forma segura.
- `AuthBackground` ya no lee `ref.current` durante render.
- `admin-dashboard` reordenado/memorizado para evitar acceso antes de declaración.
- `app/index.tsx` usa componente nombrado.
- Corregidas entidades sin escapar en `publish.tsx`.
- Corregidas dependencias de hooks.
- Eliminados imports/variables/catches sin uso detectados.
- Eliminado estado de subida de imágenes que no se actualizaba.
- `eslint.config.js` renombrado a `eslint.config.mjs` para evitar el warning de módulo ESM sin modificar el comportamiento CommonJS de las configuraciones Metro/Tailwind/Babel.
- Se conserva la arquitectura segura: la moderación sigue pasando por las RPC de Supabase.

Validación local del código:
- `tsc --noEmit`: OK.
- Reglas React Hooks + no-unused-vars + React display-name/unescaped-entities sobre app/components/hooks/lib: 0 errores, 0 warnings.
- Los 19 tests ya estaban verdes antes de esta pasada y no fueron modificados.

En el Mac, ejecutar:
`pnpm test`
`pnpm check`
`pnpm lint`
