// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          importScripts: ["/push-handler.js"],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
          // TanStack emits browser files under a local `client/` directory, but
          // Lovable serves that directory at the site root. Cache the public URLs.
          modifyURLPrefix: { "client/": "" },
          // revision muda a cada build: garante que a home nao fique presa no cache antigo
          additionalManifestEntries: [{ url: "/", revision: String(Date.now()) }],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/_serverFn\//],
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "qjuros-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 20 },
                plugins: [
                  {
                    // Offline: se a rota pedida nao estiver em cache, serve a home cacheada.
                    handlerDidError: async () => {
                      const cache = await caches.open("qjuros-pages");
                      return (
                        (await cache.match("/", { ignoreSearch: true })) ||
                        (await cache.match("/index.html", { ignoreSearch: true })) ||
                        Response.error()
                      );
                    },
                  },
                ],
              },
            },

            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\/_build\/|\/assets\//.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "qjuros-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
