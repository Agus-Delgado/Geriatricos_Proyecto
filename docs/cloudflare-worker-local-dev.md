# Cloudflare Worker local dev (Bloque 4)

> **Estado actual:** desarrollo local del Worker/D1 para la app médica; producción en Vercel + Worker remoto ([medical-app-roadmap.md](./medical-app-roadmap.md)). Render es legacy y no es necesario para `npm run dev` en `cloudflare-worker/`.

Este documento explica como correr localmente el scaffold inicial de `cloudflare-worker/` sin tocar Render, Vercel, frontend ni backend FastAPI legacy.

## Requisitos

- Node.js 20+ recomendado.
- npm disponible.

## Instalar dependencias

Desde la raiz del repo:

```bash
cd cloudflare-worker
npm install
```

## Correr localmente

```bash
cd cloudflare-worker
npm run dev
```

Wrangler levantara un servidor local del Worker.

## Probar endpoint de health

Con el Worker corriendo:

```bash
curl http://127.0.0.1:8787/health
```

Respuesta esperada:

```json
{ "ok": true, "service": "geriatricos-worker" }
```

## Variables de entorno y CORS

- `CORS_ORIGINS` acepta lista separada por comas.
- Ejemplo:
  - `CORS_ORIGINS=http://localhost:5173,https://mi-frontend.vercel.app`
- Si `CORS_ORIGINS` no esta definida, el Worker aplica fallback seguro para desarrollo local (`localhost`/`127.0.0.1` en puertos comunes de Vite).

## D1 (placeholder por ahora)

En `cloudflare-worker/wrangler.toml` hay ejemplo de binding D1 comentado.

No crear aun schema ni migraciones D1 en este bloque.

## Que falta antes de conectar frontend

1. Definir y crear D1 real por entorno.
2. Implementar modulos Fase 1 (`auth`, `facilities`, `residents`, `contacts`) con compatibilidad de contrato.
3. Agregar manejo de errores y auth middleware real.
4. Ejecutar pruebas de compatibilidad contra endpoints clave.
5. Recien despues evaluar switch controlado desde frontend (sin apagar Render prematuramente).
