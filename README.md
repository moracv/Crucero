# 🛳️ Mi Crucero

PWA para llevar el itinerario de un crucero día por día, armar los outfits de cada día (día y noche) sobre una silueta, manejar el catálogo de ropa con fotos (sin fondo), el checklist de maleta y los recordatorios con notificaciones push. Se despliega en Cloudflare.

## Funciones

- **Configuración del crucero**: naviera, barco, fechas, noches, cabina y reserva. Los días se generan solos y cada uno puede ser embarque, puerto, altamar o desembarque.
- **Itinerario**: puerto (con búsqueda y ubicación), llegada, salida, *all aboard*, código de vestimenta, clima y hora local del puerto.
- **Actividades**: tours, espectáculos, cenas y más, cada una marcada como **incluida** o **con costo**, reservada o no, y para quién es.
- **Perfiles** (hombre y mujer), cada uno con su catálogo, su silueta y sus outfits.
- **Catálogo de ropa**: fotos con la cámara o desde la galería; el **fondo se quita automáticamente** en el propio celular.
- **Armador de outfits**: silueta con zonas (cabeza, arriba, abrigo, abajo, vestido, calzado y accesorios). Hay un outfit de **día** y otro de **noche** por cada día.
- **Sugerencias con IA**: Claude, GPT o Gemini, con la API key de cada usuario.
- **Maleta**: checklist automático con la ropa de los outfits, más equipaje con fotos y categorías.
- **Recordatorios** con **notificaciones push** (Android), además de alertas de **datos faltantes**.
- **Funciona sin internet**: todo se guarda en el celular y se sincroniza al recuperar la señal.
- Inicio de sesión con **Google**.

## Arquitectura

| Parte | Tecnología |
|---|---|
| Frontend | React + Vite + `vite-plugin-pwa` (service worker propio en `src/sw.ts`) |
| Backend | Un único Cloudflare Worker (`worker/index.ts`) que sirve la PWA y `/api/*` |
| Base de datos | Cloudflare D1 (`migrations/`) |
| Fotos | Cloudflare R2 |
| Recordatorios | Cron Trigger cada 5 minutos que envía Web Push (VAPID) |
| Quitar fondo | `@imgly/background-removal`, ejecutado en el navegador |
| Clima y geocodificación | Open-Meteo (gratis, sin API key) |

## Despliegue en Cloudflare (una sola vez)

```bash
npm install
npx wrangler login
npx wrangler d1 create crucero          # copia el database_id en wrangler.jsonc
npx wrangler r2 bucket create crucero-fotos
npm run db:remote                       # crea las tablas
npm run vapid                           # genera las claves para las notificaciones
```

1. En `wrangler.jsonc > vars` llena:
   - `VAPID_PUBLIC_KEY`: la clave pública que imprimió `npm run vapid`.
   - `VAPID_SUBJECT`: `mailto:tu-correo`.
   - `ALLOWED_EMAILS`: tu correo y el de tu pareja, separados por coma.
   - `GOOGLE_CLIENT_ID`: ver el paso 3.
2. Configura los secretos:
   ```bash
   npx wrangler secret put SESSION_SECRET      # cualquier texto largo y aleatorio
   npx wrangler secret put VAPID_PRIVATE_JWK   # el JSON que imprimió npm run vapid
   ```
3. **Google Sign-In**: entra a [Google Cloud Console](https://console.cloud.google.com/apis/credentials), ve a *Crear credenciales* y elige *ID de cliente de OAuth* de tipo *Aplicación web*. En **Orígenes autorizados de JavaScript** agrega la URL del Worker (`https://crucero.<tu-subdominio>.workers.dev`) y `http://localhost:8787`. Copia el Client ID en `GOOGLE_CLIENT_ID`.
4. Despliega:
   ```bash
   npm run deploy
   ```
5. En el celular Android, abre la URL en Chrome y elige **⋮ › Instalar app**. Luego ve a Ajustes y toca **Activar notificaciones**.

> También puedes conectar el repositorio en el panel de Cloudflare (*Workers › Create › Import a repository*) con el comando de build `npm run build` y el comando de deploy `npx wrangler deploy`, para que se despliegue en cada push.

## Desarrollo local

```bash
npm run db:local
# crea .dev.vars con: DEV_LOGIN=1, SESSION_SECRET=..., VAPID_PUBLIC_KEY=..., VAPID_PRIVATE_JWK=...
npm run build && npx wrangler dev --local    # http://localhost:8787
```

`DEV_LOGIN=1` permite entrar con cualquier correo sin Google. **Úsalo solo en local.**

## Notas

- Las API keys de IA se guardan en D1, asociadas a cada usuario, y nunca se devuelven al navegador.
- La primera vez que se quita un fondo se descarga el modelo (unos 40 MB); después queda en caché.
- `@imgly/background-removal` tiene licencia AGPL, lo cual no es problema para uso personal.
