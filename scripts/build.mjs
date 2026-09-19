import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'src', 'favicon.svg', 'LICENSE']) await cp(file, `dist/${file}`, { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log('Static website ready: dist');
