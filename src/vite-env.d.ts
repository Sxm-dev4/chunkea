/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública del sitio, sin "/" al final (canonical, sitemap, Open Graph). */
  readonly VITE_SITE_URL: string;
  /** Número de WhatsApp que recibe los pedidos (indicativo + número, sin "+"). */
  readonly VITE_WHATSAPP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
