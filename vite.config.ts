import { defineConfig } from 'vite';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Build id stamped into asset URLs that are not content-hashed by Vite (/data, /models).
 * Lets nginx/Cloudflare serve them with a one-year immutable cache while a new deploy
 * still busts the cache.
 */
const BUILD_ID = process.env.BUILD_ID ?? Date.now().toString(36);
const reachPackage = process.env.REACH_PACKAGE === '1';
let reachOutputDir = resolve('dist');

export default defineConfig({
  plugins: reachPackage ? [{
    name: 'reach-package-brand-cleanup',
    configResolved(config) {
      reachOutputDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/, '<title>The Reach Screensaver</title>')
        .replace(/^.*<meta name="description".*\r?\n/gm, '    <meta name="description" content="The Reach Screensaver: a 64-stop interstellar round trip." />\n')
        .replace(/^.*(?:rel="canonical"|property="og:|name="twitter:|rel="icon"|rel="apple-touch-icon").*\r?\n/gm, '')
        .replace(/^.*<img class="brand-mark".*\r?\n/gm, '')
        .replace('<span class="brand-name">YOUR EYES IN SPACE</span>', '<span class="brand-name">THE REACH SCREENSAVER</span>')
        .replace(/^.*<span class="brand-version".*\r?\n/gm, '')
        .replace(/^.*<a id="copyright".*\r?\n/gm, '')
        .replace(/^.*<p><span data-i18n>Your Eyes In Space bir.*\r?\n/gm,
          '            <p>The Reach Screensaver is based on <a href="https://github.com/berkcomba/youreyesinspace">Your Eyes In Space</a> by Berk Comba / BigBrains. Its source is MIT licensed; see the bundled license and notice.</p>\n');
    },
    closeBundle() {
      for (const name of ['logo.png', 'logo-white.png', 'favicon.png', 'apple-touch-icon.png', 'og-image.jpg']) {
        rmSync(resolve(reachOutputDir, name), { force: true });
      }
      for (const name of ['robots.txt', 'sitemap.xml']) {
        rmSync(resolve(reachOutputDir, name), { force: true });
      }
      for (const name of ['tours', 'tour-media']) {
        rmSync(resolve(reachOutputDir, name), { recursive: true, force: true });
      }
      for (const name of ['dawn.glb', 'galileo.glb']) {
        rmSync(resolve(reachOutputDir, 'models', name), { force: true });
      }
    },
  }] : [],
  server: {
    port: 5173,
    open: false,
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    target: 'es2022',
    // production: no source maps (smaller upload, no source disclosure)
    sourcemap: false,
  },
  assetsInclude: ['**/*.glsl'],
});
