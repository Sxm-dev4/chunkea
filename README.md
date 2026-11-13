# Chunkea · Landing

Landing de **Chunkea**: forros chunky personalizables. Las personas arman su forro (en 3D o 2D),
eligen hasta 13 chunkis y envían el pedido por WhatsApp con el diseño escrito en el mensaje.

- Sitio: https://chunkea.netlify.app
- Stack: [Vite](https://vite.dev) + TypeScript (sin framework), [three.js](https://threejs.org) para el armador 3D,
  [Lottie](https://airbnb.io/lottie) para los iconos animados de [AnimatedIcons](https://animatedicons.co).

## Requisitos

- Node.js 22 (ver `.nvmrc`; funciona desde 20.19)
- npm 10 o superior
- Para las pruebas end-to-end en local: Google Chrome instalado

## Empezar

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (normalmente http://localhost:5173).

## Scripts

| Comando             | Qué hace                                                              |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga instantánea                        |
| `npm run build`     | Revisa tipos y genera el sitio de producción en `dist/`               |
| `npm run preview`   | Sirve `dist/` en http://localhost:4173 (igual que producción)         |
| `npm run lint`      | ESLint (TypeScript), Stylelint (CSS) y Prettier (formato)             |
| `npm run lint:fix`  | Corrige automáticamente lo que se pueda                               |
| `npm run typecheck` | Revisión de tipos de TypeScript                                       |
| `npm test`          | Pruebas unitarias (Vitest)                                            |
| `npm run test:e2e`  | Pruebas end-to-end en Chrome de escritorio y móvil (Playwright)       |
| `npm run check`     | Todo lo anterior en orden (lo mismo que corre la CI)                  |
| `npm run images`    | Regenera `og-image.png` y `apple-touch-icon.png` (después de `build`) |

## Cambios frecuentes

| Quiero cambiar…                   | Archivo                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| Número de WhatsApp                | `.env` → `VITE_WHATSAPP`                                         |
| URL del sitio (SEO, sitemap)      | `.env` → `VITE_SITE_URL`                                         |
| Precios o máximo de chunkis       | `src/config/site.ts` → `PRODUCTS` (y los textos de `index.html`) |
| Agregar / quitar / agotar chunkis | `src/data/chunkis.ts` (`AGOTADO` para agotado)                   |
| Combos de "Inspírate"             | `src/data/combos.ts`                                             |
| iPhones y tamaño de cada uno      | `src/data/phones.ts`                                             |
| Colores de la marca               | `src/styles/tokens.css` (fucsia, rosa, naranja y lima oficiales) |
| Logo                              | `src/assets/brand/` (y el símbolo al inicio de `index.html`)     |
| Reseñas de clientes (carrusel)    | `src/data/reviews.ts` y fotos en `src/assets/reviews/`           |
| Textos de avisos y contador       | `src/copy.ts`                                                    |
| Textos fijos de la página         | `index.html`                                                     |

> Los precios aparecen también en `index.html` (tarjetas y datos estructurados para Google).
> Si cambias un precio, búscalo en ambos lugares.

### Regenerar los renders de los forros

Salen de Blender y no se versionan los PNG, sólo los WebP de `src/assets/cases/` y las medidas de
`src/data/caseRenders.json` (dónde está el forro y la cámara dentro de cada imagen).

```bash
blender --background --factory-startup --disable-autoexec chunkea.blend --python scripts/render-cases.py -- --outdir renders --height 1280 --samples 160 --skip-existing
```

```bash
npm run renders:process -- renders
```

Para un modelo nuevo: agrégalo a `src/data/phones.ts` con el mismo nombre de archivo que su render.
`npm test` avisa si a un modelo le falta la imagen o las medidas.

### Regenerar los modelos 3D

La vista 3D usa los mismos modelos del render, optimizados en `src/assets/cases3d/` (unos 175 KB cada
uno; sólo se descarga el del iPhone elegido).

```bash
blender --background --factory-startup --disable-autoexec chunkea.blend --python scripts/export-cases-3d.py -- --outdir modelos
```

```bash
npm run models:process -- modelos
```

### Agregar un chunki nuevo

Los chunkis usan las fotos del catálogo de Chunkea (las páginas de Canva con fondo liso y etiquetas
rosadas). El script recorta cada foto, le quita el fondo y calcula su tamaño real sobre el forro.

1. Exporta las 9 páginas del catálogo (3 plateados, 3 dorados, 3 coloridos) en PNG.
2. Si cambiaron los chunkis, actualiza la lista de ids por página en `scripts/extract-chunkis.mjs`
   (en el orden de lectura: fila por fila) y el catálogo en `src/data/chunkis.ts`.
3. Recorta las fotos (las páginas en orden):

   ```bash
   npm run chunkis:extract -- plateados-1.png plateados-2.png plateados-3.png dorados-1.png dorados-2.png dorados-3.png coloridos-1.png coloridos-2.png coloridos-3.png
   ```

4. Corre `npm test`: avisa si a un chunki le falta su foto o si sobran fotos.

Para agotar un chunki agrega `AGOTADO` en `src/data/chunkis.ts`; no hace falta volver a recortar.

### Agregar un icono animado

1. En animatedicons.co descarga el **JSON (Lottie)** del icono (estilo _Minimalistic_, gratis).
2. Guárdalo en `src/assets/icons/` con un nombre corto, p. ej. `star.json`.
3. Úsalo en el HTML: `<span class="ai" data-ai="star"></span>`
   (opcional: `data-size="32"`, `data-theme="dark"` sobre fondos oscuros o `"white"` sobre botones de color).

## Estructura

```
index.html               Página (HTML semántico, SEO, datos estructurados)
public/                  Archivos que se copian tal cual (favicon, imagen para redes, manifest)
src/
  main.ts                Punto de entrada: fuentes, estilos y arranque
  app.ts                 Conecta el armador, la UI y los efectos
  config/site.ts         Datos del negocio y productos
  data/                  Catálogo de chunkis, combos, iPhones y medidas de los renders
  assets/cases/          Renders de los forros (WebP)
  assets/cases3d/        Modelos 3D de los forros (GLB)
  builder/
    store.ts             Estado del armador + acciones + guardado (sin DOM, probado)
    placement.ts         Posiciones sugeridas, límites y zona de la cámara
    order.ts             Validación y mensaje de WhatsApp
    controls.ts          Catálogo, filtros, tamaño, contador y resumen
    view2d.ts            Vista principal: render del forro + chunkis arrastrables
    view3d/              Vista 3D (se descarga sólo al tocar "Ver en 3D")
  assets/chunkis/        Fotos recortadas de los chunkis (WebP)
  icons/                 Iconos de línea e iconos animados
  ui/                    Avisos, confeti, carrusel y animaciones de aparición
  styles/                CSS por capas: tokens → base → componentes → secciones
tests/
  unit/                  Vitest
  e2e/                   Playwright (+ axe para accesibilidad)
scripts/                 Utilidades (imágenes para redes y renders de los forros)
```

## Calidad y producción

- **TypeScript estricto** (`strict`, `noUncheckedIndexedAccess`) y lint en cada cambio.
- **Pruebas**: unitarias para la lógica (estado, pedido, posiciones, datos, iconos) y end-to-end para los
  flujos reales: armar, pedir, recortar al cambiar de tamaño, recordar el diseño, 3D, respaldo 2D,
  accesibilidad (axe, WCAG 2.1 AA) y ausencia de errores o violaciones de CSP.
- **Seguridad**: Content-Security-Policy estricta (sólo recursos propios: sin CDNs ni estilos en línea),
  HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Se definen en `vite.config.ts`, que genera
  `dist/_headers` para Netlify y la misma CSP como `<meta>` para la vista previa local.
- **Rendimiento**: carga inicial ≈ 17 KB de JS + 7 KB de CSS (gzip). three.js, Lottie y cada icono se
  descargan sólo cuando se necesitan. Fuentes alojadas en el sitio. Archivos con hash y caché de un año.
  La animación 3D se pausa fuera de pantalla y con la pestaña oculta.
- **Accesibilidad**: navegación por teclado, `aria-*` en controles, avisos en región `aria-live`,
  contraste AA y respeto a `prefers-reduced-motion`.
- **SEO**: canonical, Open Graph, datos estructurados (`Store` y `Product`), `robots.txt` y `sitemap.xml`
  generados en el build.
- **Privacidad**: sin analítica ni cookies; el diseño se guarda sólo en el navegador de la persona.

## Despliegue

El sitio se publica en **Netlify** desde la rama `main` de GitHub. La CI de GitHub Actions
(`.github/workflows/ci.yml`) corre lint, tipos, pruebas, build y end-to-end en cada push y pull request.

### Primera vez

1. Crea un repositorio vacío en GitHub (p. ej. `chunkea-web`) y súbelo:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/chunkea-web.git
   git push -u origin main
   ```
2. En Netlify abre el proyecto **chunkea** → _Project configuration → Build & deploy →
   Link repository_ y elige el repositorio. Netlify usa `netlify.toml` (build `npm run build`, carpeta `dist`).
3. (Recomendado) En GitHub → _Settings → Branches_, protege `main` y exige que pase la CI antes de fusionar.

Desde ahí, cada push a `main` publica el sitio automáticamente y cada pull request genera una vista previa.

### Visibilidad

Si el sitio aparece como "This site is private", en Netlify ve a _Project configuration →
Access & security → Visitor access_ y quita la protección.

## Créditos

- Iconos animados: [AnimatedIcons](https://animatedicons.co) (licencia gratuita, sin atribución obligatoria).
- Fuente: Jost (SIL Open Font License), vía Fontsource; es la alternativa libre a Futura, la fuente de la marca.
- Logo: archivos oficiales de Chunkea (`chunkea.ai`), convertidos a SVG.

© Chunkea. Todos los derechos reservados.
