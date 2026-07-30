import { build } from 'esbuild';

await build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  packages: 'external',
  outfile: 'build/index.cjs',
});

console.log('已生成可打包的 CommonJS 入口: build/index.cjs');
