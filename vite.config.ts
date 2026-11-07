import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Política de seguridad de contenido: sólo se permiten recursos propios.
 * Fuentes, three.js, iconos y estilos van empaquetados en el sitio.
 */
const CSP_DIRECTIVES: Readonly<Record<string, string>> = {
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self'",
  'font-src': "'self'",
  'connect-src': "'self'",
  'manifest-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
};
const cspString = (extra: Record<string, string> = {}): string =>
  Object.entries({ ...CSP_DIRECTIVES, ...extra })
    .map(([k, v]) => `${k} ${v}`.trim())
    .join('; ');

/** Cabeceras para Netlify (_headers) + la misma CSP como <meta> para la vista previa local. */
function securityHeaders(): Plugin {
  return {
    name: 'chunkea-security-headers',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: cspString() },
        injectTo: 'head-prepend',
      },
    ],
    generateBundle() {
      const headers = [
        '/*',
        `  Content-Security-Policy: ${cspString({ 'frame-ancestors': "'none'", 'upgrade-insecure-requests': '' })}`,
        '  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        '  Cross-Origin-Opener-Policy: same-origin',
        '',
        '# Archivos con hash en el nombre: caché de un año',
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
        '# El HTML siempre se revalida para que los cambios se vean de inmediato',
        '/index.html',
        '  Cache-Control: public, max-age=0, must-revalidate',
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: '_headers', source: headers });
    },
  };
}

/** robots.txt y sitemap.xml con la URL pública del sitio (VITE_SITE_URL). */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'chunkea-seo-files',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod></url>\n` +
          '</urlset>\n',
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');
  if (!siteUrl) throw new Error('Falta VITE_SITE_URL (revisa el archivo .env).');
  if (!/^\d{10,15}$/.test(env.VITE_WHATSAPP ?? '')) {
    throw new Error('VITE_WHATSAPP debe ser el número con indicativo, sólo dígitos (revisa .env).');
  }

  return {
    plugins: [securityHeaders(), seoFiles(siteUrl)],
    build: {
      target: 'es2022',
      sourcemap: 'hidden',
      assetsInlineLimit: 0, // nada de data: URIs → CSP más estricta
      chunkSizeWarningLimit: 800, // three.js va en su propio chunk diferido
    },
    preview: { port: 4173, strictPort: true },
  };
});
