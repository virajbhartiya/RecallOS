import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { readFile, writeFile } from 'node:fs/promises';

const rootDir = resolve(process.cwd());
const srcDir = resolve(rootDir, 'src');
const publicDir = resolve(rootDir, 'public');
const outDir = resolve(rootDir, 'dist');

async function copyPublic() {
  await mkdir(outDir, { recursive: true });
  // Copy static assets like manifest.json and popup.html
  await cp(publicDir, outDir, { recursive: true });
  
  // Create Firefox-compatible manifest
  const manifestPath = resolve(publicDir, 'manifest.json');
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestContent);
  
  // For Firefox, use background.scripts instead of service_worker
  if (manifest.background?.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker]
    };
  }
  
  // Write Firefox manifest
  await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function buildCSS() {
  const cssFile = resolve(srcDir, 'styles/index.css');
  const cssContent = await readFile(cssFile, 'utf-8');
  
  const result = await postcss([
    tailwindcss,
    autoprefixer
  ]).process(cssContent, {
    from: cssFile,
    to: resolve(outDir, 'styles.css')
  });

  await writeFile(resolve(outDir, 'styles.css'), result.css);
}

async function buildScripts(watch = false) {
  const options = {
    entryPoints: [
      resolve(srcDir, 'background.ts'),
      resolve(srcDir, 'content.ts'),
      resolve(srcDir, 'popup.tsx'),
    ],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    target: ['chrome120'],
    minify: process.env.NODE_ENV === 'production',
    splitting: false,
    jsx: 'automatic',
    jsxImportSource: 'react',
    external: [],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
  };

  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
  } else {
    await build(options);
  }
}

async function main() {
  const watch = process.argv.includes('--watch');
  await copyPublic();
  await buildCSS();
  await buildScripts(watch);

  if (watch) {
    // Mirror changes from public/ into dist/ during watch mode
    fsWatch(publicDir, { recursive: true }, (_eventType, _filename) => {
      copyPublic()
        .then(() => console.log('Public assets copied'))
        .catch(err => console.error('Copy public failed:', err));
    });
    
    // Watch CSS changes
    fsWatch(resolve(srcDir, 'styles'), { recursive: true }, (_eventType, _filename) => {
      buildCSS()
        .then(() => console.log('CSS built'))
        .catch(err => console.error('CSS build failed:', err));
    });
  }
  console.log(`Built to ${outDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
