# EYESITE — Auditoría de callback de autenticación 2026-09-25

## Resultado

Se verificó el flujo de confirmación de correo y recuperación mediante deep link.

- `app/auth/callback.tsx` existe y delega en `app/(auth)/callback.tsx`.
- El callback registra `Linking.getInitialURL()` y escucha eventos `url`.
- Soporta `code` mediante `exchangeCodeForSession()`.
- Soporta `token_hash` mediante `verifyOtp()`.
- Maneja `type=recovery` y redirige a `/reset-password`.
- Desuscribe correctamente los listeners al desmontar.
- Registro y reenvío usan el deep link nativo `eyesite://auth/callback`.
- Web usa `https://auth.eyesite.mx/auth/callback`.

## Decisión

No se modifica el callback en este ciclo. El flujo requiere prueba física en iOS y Android con un correo real para cerrar la validación de extremo a extremo.

La existencia del código no sustituye la prueba de dominio/redirección real ni la prueba en dispositivo.
