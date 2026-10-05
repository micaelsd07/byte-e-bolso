import { defineConfig } from 'vite';
import { obterVersao } from './scripts/lib/versao.mjs';

const { versao, sha } = obterVersao();

// base './' : o mesmo dist/ precisa rodar em /hml/, em /releases/<sha>/ e
// descompactado do build.zip (INT-06). Saída IIFE sem type="module" para que
// abrir index.html direto do disco (file://) também funcione.
export default defineConfig({
  base: './',
  plugins: [
    {
      // O Vite sempre emite <script type="module" crossorigin>, e módulo não
      // carrega em file://. Como o bundle é IIFE, um script clássico basta.
      name: 'script-classico',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: (html) => html.replace('<script type="module" crossorigin', '<script defer').replaceAll(' crossorigin', ''),
      },
    },
  ],
  define: {
    __APP_VERSAO__: JSON.stringify(versao),
    __APP_SHA__: JSON.stringify(sha),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
