import { defineConfig, loadEnv } from 'vite';
import { obterVersao } from './scripts/lib/versao.mjs';

const { versao, sha } = obterVersao();

// base './' : o mesmo dist/ precisa rodar em /hml/, em /releases/<sha>/ e
// descompactado do build.zip (INT-06). Saída IIFE sem type="module" para que
// abrir index.html direto do disco (file://) também funcione.
// O ranking online é opcional. O endereço e a chave pública do banco vêm do
// ambiente (variáveis do repositório, na pipeline) ou de um .env.local, que não
// é versionado. Sem eles, o build sai só com o ranking do aparelho.
const ambiente = { ...loadEnv('production', process.cwd(), 'BYTE_'), ...process.env };

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
    __RANKING_URL__: JSON.stringify(ambiente.BYTE_SUPABASE_URL ?? ''),
    __RANKING_CHAVE__: JSON.stringify(ambiente.BYTE_SUPABASE_CHAVE ?? ''),
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
