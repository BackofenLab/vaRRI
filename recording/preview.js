import path from 'node:path';
import fs from 'node:fs/promises';
import { root, serve } from './lib/runtime.js';

const directory = path.resolve(root, process.argv[2] || 'output/playwright/demos');
await fs.access(path.join(directory, 'index.html')).catch(() => {
  throw new Error('No demo preview found. Run npm run demos first.');
});
const server = await serve(directory);
console.log(`Demo preview: ${server.origin}\nPress Ctrl+C to stop.`);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await server.close(); process.exit(0); });
}
