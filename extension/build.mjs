import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const srcDir = resolve(rootDir, 'src');
const publicDir = resolve(rootDir, 'public');
const outDir = resolve(rootDir, 'dist');

async function copyPublic() {
  await mkdir(outDir, { recursive: true });
  // Copy static assets like manifest.json and popup.html
  await cp(publicDir, outDir, { recursive: true });
}

async function buildScripts(watch = false) {
  const options = {
    entryPoints: [
      resolve(srcDir, 'background.ts'),
      resolve(srcDir, 'content.ts'),
      resolve(srcDir, 'popup.ts')
    ],
    outdir: outDir,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    target: ['chrome120'],
    minify: process.env.NODE_ENV === 'production',
    splitting: false
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
  await buildScripts(watch);

  if (watch) {
    // Mirror changes from public/ into dist/ during watch mode
    fsWatch(publicDir, { recursive: true }, (_eventType, _filename) => {
      copyPublic()
        .then(() => console.log('Public assets copied'))
        .catch((err) => console.error('Copy public failed:', err));
    });
  }
  console.log(`Built to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

 