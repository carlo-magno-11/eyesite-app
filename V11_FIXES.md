# EYESITE 4 — V11 compile/check fixes

## Corregido a partir del `pnpm check` de V10

1. **React Native 0.86 / StyleSheet**
   - Reemplazado `StyleSheet.absoluteFillObject` por `StyleSheet.absoluteFill` en:
     - `app/(tabs)/map.tsx`
     - `app/admin/propiedad/[id].tsx`

2. **Limpieza de medios públicos durante aprobación**
   - `publicUploadedPaths` ahora se declara antes del `try` en `app/admin/solicitud/[id].tsx`.
   - Si la aprobación falla después de subir archivos públicos, el `catch` puede eliminarlos correctamente.

3. **TypeScript + Vitest**
   - `__tests__/eyesite4-storage.test.ts` ahora importa `describe`, `test` y `expect` desde `vitest`.

4. **TypeScript del proyecto móvil vs Edge Functions**
   - El `tsconfig.json` raíz ya no intenta compilar como TypeScript/Node las Edge Functions de Supabase (`supabase/functions`), que usan el runtime Deno/JSR.
   - También excluye los archivos de pruebas del `tsc --noEmit`; las pruebas se ejecutan con Vitest mediante `pnpm test`.

## Importante

El `pnpm-lock.yaml` debe regenerarse en el Mac con:

```bash
pnpm install
```

No usar `--frozen-lockfile` en la primera instalación después de los cambios de dependencias.

Después ejecutar:

```bash
pnpm check
pnpm test
pnpm lint
```

La comprobación de las Edge Functions debe hacerse con el flujo de Supabase/Deno, no con el `tsc` de la app Expo.
