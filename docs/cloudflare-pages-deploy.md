# Deploy del frontend en Cloudflare Pages

Guía para desplegar el frontend React + Vite en **Cloudflare Pages**, manteniendo el backend en **Render**. Este documento cubre solo el frontend; no modifica el backend.

## Configuración del proyecto en Cloudflare

| Campo | Valor |
|-------|--------|
| **Framework preset** | Vite (o React) |
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Install command** | `npm ci` (recomendado; existe `package-lock.json`) o el default de Cloudflare |

Opcional si el build falla por versión de Node (p. ej. dependencia `sharp`):

| Variable | Valor |
|----------|--------|
| `NODE_VERSION` | `20` |

### Qué hace el build

El script `npm run build` en [`frontend/package.json`](../frontend/package.json):

1. `prebuild`: genera `public/version.json` (`scripts/generate-version.mjs`).
2. `tsc && vite build`: compila TypeScript y emite assets en `dist/`.

La carpeta de salida es **`dist`** (default de Vite; no hay `outDir` custom).

## Equivalencia con Vercel

El deploy en Vercel sigue usando [`frontend/vercel.json`](../frontend/vercel.json). Para Cloudflare Pages, el equivalente está en `frontend/public/` (Vite copia estos archivos a `dist/` en el build):

| vercel.json | Cloudflare Pages |
|-------------|------------------|
| `rewrites` → `index.html` para SPA | [`frontend/public/_redirects`](../frontend/public/_redirects): `/*  /index.html  200` |
| `headers` en `/version.json` | [`frontend/public/_headers`](../frontend/public/_headers) |

No es necesario borrar `vercel.json`; ambos deploys pueden coexistir.

## Variables de entorno (build time)

Configurar en Cloudflare: **Workers & Pages** → tu proyecto → **Settings** → **Environment variables**.

Vite solo expone variables que empiezan con `VITE_` al código del cliente. Se inyectan **en el build**; tras cambiarlas hay que **volver a desplegar**.

### Requerida

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | URL base del backend FastAPI en Render | `https://geriatricos-proyecto.onrender.com` |

Usada en [`frontend/src/api/client.ts`](../frontend/src/api/client.ts) y [`frontend/src/api/residents.ts`](../frontend/src/api/residents.ts). Si no está definida, el fallback local es `http://localhost:8000`.

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `VITE_MISRX_URL` | Enlace externo MisRX ([`medicalLinks.ts`](../frontend/src/config/medicalLinks.ts)) |
| `VITE_RECETO_URL` | Enlace Receto |
| `VITE_PAMI_URL` | Enlace PAMI |
| `VITE_DEBUG_ERRORS` | `1` para mostrar stacks en ErrorBoundary en producción |

Agregar las mismas variables en **Production** y **Preview** si usás preview deployments por PR.

Referencia local: [`frontend/.env.example`](../frontend/.env.example).

## Conectar GitHub con Cloudflare Pages

1. Entrá a [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorizá GitHub y elegí este repositorio.
3. Configurá la rama de producción (p. ej. `main`) y, si querés, **Preview deployments** para pull requests.
4. Completá la tabla de configuración de arriba (`frontend`, `npm run build`, `dist`).
5. Agregá `VITE_API_BASE_URL` (y las opcionales) **antes** del primer deploy de producción, o hacé un redeploy después de agregarlas.
6. Iniciá el deploy. La URL por defecto será `https://<nombre-proyecto>.pages.dev`.

## CORS: configuración manual en Render (sin cambiar código)

El backend en Render permite por defecto orígenes `*.vercel.app` vía regex. **Los dominios de Cloudflare Pages no están incluidos automáticamente.**

Para que el navegador pueda llamar al API desde Pages, actualizá variables en el **dashboard de Render** (no en este repositorio), por ejemplo:

```env
CORS_ORIGINS=https://tu-proyecto.pages.dev,https://tu-dominio.com,http://localhost:5173
```

O ampliá el regex manteniendo Vercel si seguís usándolo:

```env
CORS_ORIGIN_REGEX=^https://(.*\.vercel\.app|.*\.pages\.dev)$
```

Sin esto, el frontend cargará pero las peticiones al API fallarán con errores CORS en la consola.

Más contexto: [`backend/README.md`](../backend/README.md) (sección CORS y verificación con `curl`).

## Cómo probar que el frontend consume el backend en Render

### 1. Build local (opcional)

```bash
cd frontend
set VITE_API_BASE_URL=https://geriatricos-proyecto.onrender.com
npm run build
npm run preview
```

En PowerShell:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://geriatricos-proyecto.onrender.com"
npm run build
npm run preview
```

### 2. Tras el deploy en Pages

1. **Carga inicial**: abrí la URL de Pages; la app debe cargar sin errores en consola (salvo CORS si aún no configuraste Render).
2. **Rutas SPA**: navegá y recargá `/login`, `/residents`, etc. Si fallan con 404 al recargar, revisá que `dist/_redirects` exista en el artefacto desplegado.
3. **API**: iniciá sesión con un usuario de prueba; en DevTools → **Network**, las peticiones deben ir a la URL definida en `VITE_API_BASE_URL` (Render).
4. **CORS**:

   ```bash
   curl -i -H "Origin: https://tu-proyecto.pages.dev" ^
        https://geriatricos-proyecto.onrender.com/auth/me
   ```

   Debe aparecer `Access-Control-Allow-Origin` con tu origin de Pages (o el origin reflejado según la config del backend).

5. **`/version.json`**: abrí `https://tu-proyecto.pages.dev/version.json` y comprobá que responde; los headers `Cache-Control: no-store` vienen de `_headers`.
6. **PWA**: Cloudflare Pages sirve por HTTPS en `*.pages.dev`, requisito para Service Worker y push.

La página de debug (`/debug` o similar) solo está disponible en desarrollo (`import.meta.env.DEV`); en producción usá DevTools → Network.

## Verificación del artefacto de build

Tras `npm run build` en `frontend/`, deben existir:

- `dist/_redirects`
- `dist/_headers`
- `dist/index.html` y el resto de assets

```bash
cd frontend
npm run build
dir dist\_redirects dist\_headers
```

## Referencias

- Deploy en Vercel (sin cambios): [`frontend/README.md`](../frontend/README.md)
- Backend en Render: [`backend/README.md`](../backend/README.md)
